import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Single choke point for outbound message delivery.
 *
 * Every proactive message (AI coach reminder, system notification, etc.)
 * MUST go through pushToUser. It:
 *   1. Persists the message as a ChatMessage (role='assistant') so the
 *      web frontend can see it in the conversation history.
 *   2. Pushes the text to every bound channel (WeChat bridge → WeChat, etc.).
 *
 * This is what makes "web and WeChat fully synced" — both surfaces read
 * from the same ChatMessage table, and pushToUser is the only writer for
 * system-initiated messages.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly pushUrl: string;
  private readonly pushToken: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.pushUrl = this.configService.get<string>(
      'PUSH_BRIDGE_URL',
      'http://wechat-bridge:3000',
    ).replace(/\/$/, '');
    this.pushToken = this.configService.get<string>(
      'INTERNAL_API_TOKEN',
      '',
    );
  }

  /**
   * Persist + push a system message to all bound channels.
   *
   * @returns the created ChatMessage record so the caller can return it
   *          to the web frontend immediately.
   */
  async pushToUser(userId: string, text: string): Promise<{
    id: string;
    role: 'assistant';
    content: string;
    createdAt: string;
  } | null> {
    if (!text || !text.trim()) return null;

    // 1. Persist to ChatMessage — this is what the web frontend will see.
    const msg = await this.prisma.chatMessage.create({
      data: {
        userId,
        role: 'assistant',
        content: text.trim(),
      },
    });

    // 2. Push to every bound channel (fire-and-forget).
    if (!this.pushUrl) {
      this.logger.warn('PUSH_BRIDGE_URL not configured; message saved to DB only');
    } else {
      const wechat = await this.prisma.wechatBinding.findUnique({
        where: { userId },
        select: { peerId: true },
      });
      if (wechat) {
        this.pushToWechat(wechat.peerId, text).catch((err) =>
          this.logger.warn(`push to wechat ${wechat.peerId} failed: ${err.message}`),
        );
      }
    }

    return {
      id: msg.id,
      role: 'assistant' as const,
      content: msg.content,
      createdAt: msg.createdAt.toISOString(),
    };
  }

  private async pushToWechat(peerId: string, text: string): Promise<void> {
    const url = `${this.pushUrl}/push`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Push-Token': this.pushToken,
      },
      body: JSON.stringify({ peerId, text }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`push HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    this.logger.log(`pushed to wechat ${peerId}: ${text.slice(0, 80)}`);
  }
}
