import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface OpenClawChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

export interface OpenClawChatParams {
  /** RightNow userId (will be lowercased to form the agentId). */
  userId: string;
  /** Stable session key (same key => continues same OpenClaw session). */
  sessionKey: string;
  messages: OpenClawChatMessage[];
  /** Optional per-request model override (provider/model), maps to x-openclaw-model. */
  modelOverride?: string;
}

export interface OpenClawChatResult {
  content: string;
  model?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  raw?: unknown;
}

/**
 * OpenClawClient — the ONLY thing in the backend that holds the gateway token
 * and talks to the OpenClaw gateway. Browser never sees the token (red line #1).
 * Gateway is reached over the internal docker network by container DNS name;
 * the host 127.0.0.1:18790 mapping stays loopback-only (red line #3).
 */
@Injectable()
export class OpenClawClient {
  private readonly logger = new Logger(OpenClawClient.name);

  constructor(private readonly config: ConfigService) {}

  /** agentId = RightNow userId, forced lowercase (OpenClaw lowercases it anyway). */
  toAgentId(userId: string): string {
    return String(userId).trim().toLowerCase();
  }

  private baseUrl(): string {
    return (this.config.get<string>('OPENCLAW_GATEWAY_URL') || 'http://rn-openclaw-gw:18789')
      .trim()
      .replace(/\/+$/, '');
  }

  private token(): string {
    const t = (this.config.get<string>('OPENCLAW_GATEWAY_TOKEN') || '').trim();
    if (!t) {
      throw new ServiceUnavailableException('OpenClaw gateway token is not configured');
    }
    return t;
  }

  /** GET /healthz (no auth). Used by readiness checks. */
  async health(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl()}/healthz`, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  }

  async chat(params: OpenClawChatParams): Promise<OpenClawChatResult> {
    const agentId = this.toAgentId(params.userId);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token()}`,
      'Content-Type': 'application/json',
    };
    if (params.modelOverride?.trim()) {
      headers['x-openclaw-model'] = params.modelOverride.trim();
    }

    const body = {
      model: `openclaw/${agentId}`,
      user: params.sessionKey,
      messages: params.messages,
    };

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl()}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
    } catch (e: any) {
      this.logger.error(`[openclaw] transport error: ${e?.message}`);
      throw new ServiceUnavailableException('AI service unavailable');
    }

    const payload: any = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = payload?.error?.message || `HTTP ${res.status}`;
      this.logger.warn(`[openclaw] chat failed agent=${agentId} status=${res.status} msg=${msg}`);
      throw new ServiceUnavailableException(`AI chat failed: ${msg}`);
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new ServiceUnavailableException('AI chat returned an unexpected response');
    }

    this.logger.log(
      `[openclaw] chat ok agent=${agentId} session=${params.sessionKey} ` +
        `tokens=${payload?.usage?.total_tokens ?? '?'}`,
    );

    return {
      content: content.trim(),
      model: payload?.model,
      usage: payload?.usage,
      raw: payload,
    };
  }
}
