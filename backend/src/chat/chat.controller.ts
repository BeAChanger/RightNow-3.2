import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { InternalTokenGuard } from '../common/guards/internal-token.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PushService } from '../common/push.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
    private readonly configService: ConfigService,
  ) {}

  // ─── JWT (web app) ───────────────────────────────────────────────────────

  /**
   * Poll-friendly history endpoint. When `since` is provided (ISO timestamp),
   * only messages created after that time are returned — no pagination.
   * When omitted, paginated history as before.
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async history(
    @CurrentUser() user: { sub: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('since') since?: string,
  ) {
    if (since) {
      const date = new Date(since);
      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException('since must be a valid ISO date');
      }
      const rows = await this.prisma.chatMessage.findMany({
        where: {
          userId: user.sub,
          createdAt: { gt: date },
        },
        orderBy: { createdAt: 'asc' },
        take: 50,
      });
      return {
        data: rows.map((r) => ({
          id: r.id,
          role: r.role as 'user' | 'assistant',
          content: r.content,
          createdAt: r.createdAt.toISOString(),
        })),
        total: rows.length,
        page: 1,
        limit: 50,
      };
    }
    return this.chatService.history(
      user.sub,
      Number.parseInt(page || '1', 10),
      Number.parseInt(limit || '20', 10),
    );
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  send(
    @CurrentUser() user: { sub: string },
    @Body() body: { content: string; systemPrompt?: string },
  ) {
    return this.chatService.send(user.sub, body.content, {
      systemPrompt: body.systemPrompt,
      source: 'web',
    });
  }

  // ─── Proactive push (web triggers a system message) ──────────────────────

  /**
   * Triggers a proactive push message from the web UI. The message is
   * persisted + delivered to all bound channels. This is useful for
   * "提醒我" / "推送" buttons in the web app — the same PushService
   * path that AI coach schedulers would use.
   */
  @Post('push')
  @UseGuards(JwtAuthGuard)
  async push(
    @CurrentUser() user: { sub: string },
    @Body() body: { text: string },
  ) {
    if (!body.text?.trim()) {
      throw new BadRequestException('text is required');
    }
    const msg = await this.pushService.pushToUser(user.sub, body.text);
    if (!msg) throw new BadRequestException('empty push');
    return msg;
  }

  // ─── AI chat (legacy gemini.ts compatibility) ──────────────────────────

  /** Legacy endpoint called by old gemini.ts — mirrors ChatService.send. */
  @Post('ai')
  @UseGuards(JwtAuthGuard)
  async aiChat(
    @CurrentUser() user: { sub: string },
    @Body() body: { message?: string; systemPrompt?: string; history?: any[] },
  ) {
    if (!body.message?.trim()) throw new BadRequestException('message is required');
    return this.chatService.send(user.sub, body.message, {
      systemPrompt: body.systemPrompt,
      source: 'web',
    });
  }

  // ─── Knowledge search (RAG proxy) ──────────────────────────────────────

  /** Proxies fitness knowledge search to the RAG service. */
  @Post('search')
  @UseGuards(JwtAuthGuard)
  async search(@Body() body: { query: string; topK?: number; domains?: string[] }) {
    const ragUrl = this.configService.get<string>('RAG_SERVICE_URL', 'http://rag:8000');
    try {
      const res = await fetch(`${ragUrl.replace(/\/$/, '')}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: body.query, top_k: body.topK || 5, domain: body.domains?.[0] || null }),
      });
      if (!res.ok) return { results: [] };
      return res.json();
    } catch {
      return { results: [] };
    }
  }

  // ─── Internal token (WeChat bridge, other servers) ───────────────────────

  /**
   * Server-to-server entry point. The caller passes a WeChat peer id and
   * we resolve it to a RightNow user via WechatBinding.
   *
   * source is preserved from the body — when the bridge sends 'wechat',
   * ChatService will skip the outbound push so we don't double-deliver.
   */
  @Post('internal/send-as')
  @UseGuards(InternalTokenGuard)
  async sendAs(
    @Body()
    body: {
      peerId?: string;
      userId?: string;
      content: string;
      systemPrompt?: string;
      source?: string;
    },
  ) {
    if (!body.content || !body.content.trim()) {
      throw new BadRequestException('content is required');
    }

    let userId = body.userId?.trim();
    if (!userId && body.peerId) {
      const binding = await this.prisma.wechatBinding.findUnique({
        where: { peerId: body.peerId.trim() },
        select: { userId: true },
      });
      if (!binding) {
        throw new NotFoundException('peer is not bound to any RightNow user');
      }
      userId = binding.userId;
    }
    if (!userId) {
      throw new BadRequestException('peerId or userId is required');
    }

    return this.chatService.send(userId, body.content, {
      systemPrompt: body.systemPrompt,
      // Preserve the bridge's explicit source so 'wechat' doesn't loop back
      source: body.source || 'internal',
    });
  }

  @Get('internal/history')
  @UseGuards(InternalTokenGuard)
  async historyByPeer(
    @Query('peerId') peerId?: string,
    @Query('userId') userId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    let resolvedUserId = userId?.trim();
    if (!resolvedUserId && peerId) {
      const binding = await this.prisma.wechatBinding.findUnique({
        where: { peerId: peerId.trim() },
        select: { userId: true },
      });
      if (!binding) {
        throw new NotFoundException('peer is not bound to any RightNow user');
      }
      resolvedUserId = binding.userId;
    }
    if (!resolvedUserId) {
      throw new BadRequestException('peerId or userId is required');
    }
    return this.chatService.history(
      resolvedUserId,
      Number.parseInt(page || '1', 10),
      Number.parseInt(limit || '20', 10),
    );
  }
}
