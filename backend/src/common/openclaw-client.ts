import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface OpenClawMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Lightweight client for the OpenClaw Gateway.
 *
 * The gateway exposes an OpenAI-compatible POST /v1/chat/completions endpoint.
 * Each request identifies the session via the `user` field.
 */
@Injectable()
export class OpenClawClient {
  private readonly logger = new Logger(OpenClawClient.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Send a chat completion request through the OpenClaw Gateway.
   *
   * @param userId  Will be sent as `web:<userId>` in the `user` field.
   * @param messages  Ordered conversation messages.
   * @param options  Optional model / temperature / maxTokens overrides.
   * @returns The assistant reply text and the model id that produced it.
   */
  async sendChat(
    userId: string,
    messages: OpenClawMessage[],
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    },
  ): Promise<{ reply: string; model: string }> {
    const gatewayUrl = this.configService.get<string>(
      'OPENCLAW_GATEWAY_URL',
    );
    if (!gatewayUrl) {
      throw new Error('OPENCLAW_GATEWAY_URL is not configured');
    }

    const token = this.configService.get<string>('OPENCLAW_GATEWAY_TOKEN', '');

    if (!token) {
      this.logger.warn(
        'OPENCLAW_GATEWAY_TOKEN is not set — gateway may reject the request',
      );
    }

    const body = {
      model:
        options?.model ||
        this.configService.get<string>(
          'OPENCLAW_MODEL',
          'openclaw',
        ),
      messages,
      user: `web:${userId}`,
      stream: false,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2000,
    };

    const url = `${gatewayUrl.replace(/\/+$/, '')}/v1/chat/completions`;

    this.logger.debug(
      `Calling OpenClaw Gateway: POST ${url}  model=${body.model}  user=${body.user}`,
    );

    const controller = new AbortController();
    const timeoutMs = 120_000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(
          `OpenClaw Gateway error ${res.status}: ${text.slice(0, 500)}`,
        );
      }

      const data = (await res.json()) as any;
      const reply: string | undefined =
        data.choices?.[0]?.message?.content?.trim();

      if (!reply) {
        this.logger.error(
          `OpenClaw returned empty reply: ${JSON.stringify(data).slice(0, 500)}`,
        );
        throw new Error('OpenClaw Gateway returned an empty reply');
      }

      this.logger.debug(
        `OpenClaw reply received — model=${data.model ?? 'unknown'}  length=${reply.length}`,
      );

      return { reply, model: data.model ?? 'openclaw' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        this.logger.error(
          `OpenClaw Gateway timed out after ${timeoutMs / 1000}s`,
        );
        throw new Error(
          `OpenClaw Gateway request timed out after ${timeoutMs / 1000}s`,
        );
      }
      this.logger.error(`OpenClaw Gateway request failed: ${err.message}`);
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
