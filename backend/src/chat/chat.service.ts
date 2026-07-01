import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../common/push.service';
import { OpenClawClient, OpenClawChatMessage } from '../openclaw/openclaw.client'
import { OpenClawProvisioningService } from '../openclaw/openclaw-provisioning.service';

const HISTORY_WINDOW = 16;
const DEFAULT_SYSTEM_PROMPT =
  '你是 RightNow 的私人 AI 健身教练。回答要简短、具体、可执行，避免空话。';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly provisioningService: OpenClawProvisioningService,
    private readonly pushService: PushService,
    private readonly openclawClient: OpenClawClient,
  ) {}

  async history(userId: string, page = 1, limit = 20) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const [total, descending] = await Promise.all([
      this.prisma.chatMessage.count({ where: { userId } }),
      this.prisma.chatMessage.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
    ]);

    const records = descending.reverse();

    return {
      data: records.map((r) => this.mapRecord(r)),
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  async send(
    userId: string,
    content: string,
    options: { systemPrompt?: string; source?: string } = {},
  ) {
    const trimmed = content.trim();
    if (!trimmed) {
      throw new BadRequestException('content is required');
    }

    await this.prisma.chatMessage.create({
      data: { userId, role: 'user', content: trimmed },
    });

    const recent = await this.prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_WINDOW,
    });
    const ordered = recent.reverse();

    const systemPrompt = (options.systemPrompt?.trim() || DEFAULT_SYSTEM_PROMPT) +
      `\n当前用户ID: ${userId}`;

    const messages: OpenClawChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...ordered.map((m): OpenClawChatMessage => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    ];

    await this.provisioningService.ensureAgent(userId);
    // Forward to OpenClaw Gateway instead of bare LLM
    const out = await this.openclawClient.chat({ userId, sessionKey: userId, messages });

    const reply = await this.prisma.chatMessage.create({
      data: {
        userId,
        role: 'assistant',
        content: out.content,
      },
    });

    const result = this.mapRecord(reply);

    // Chat replies are already persisted above; only deliver them to bound
    // channels here. pushToUser would persist a second identical assistant row.
    if (options.source !== 'wechat') {
      this.pushService.deliverExistingToUser(userId, out.content).catch((err) =>
        this.logger.warn(`deliverExistingToUser failed: ${(err as Error).message}`),
      );
    }

    return result;
  }

  private mapRecord(record: {
    id: string;
    role: string;
    content: string;
    createdAt: Date;
  }) {
    return {
      id: record.id,
      role: record.role as 'user' | 'assistant',
      content: record.content,
      createdAt: record.createdAt.toISOString(),
    };
  }
}
