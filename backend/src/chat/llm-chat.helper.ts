/**
 * Lightweight OpenAI-compatible chat client.
 *
 * Used by ChatService for the free-form coach conversation. Intentionally
 * separate from AiService — AiService owns the task-specific prompt catalog
 * and structured-output flows (training feedback, food analysis, ...);
 * this helper owns plain message-list -> reply chat.
 *
 * Provider precedence:
 *   1. STEPFUN_BASE_URL + STEPFUN_API_KEY (OpenAI-compatible)
 *   2. DEEPSEEK_BASE_URL + DEEPSEEK_API_KEY (OpenAI-compatible)
 *   3. (no provider) -> throws so the caller can fall back gracefully.
 */

import { setDefaultResultOrder } from 'node:dns';

// Force IPv4 — api.stepfun.com resolves to IPv6 which breaks on many Docker hosts.
// Must be called before any fetch() that may hit IPv6-only resolving domains.
setDefaultResultOrder('ipv4first');

export interface ChatTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatProviderConfig {
  stepfunBaseUrl?: string;
  stepfunApiKey?: string;
  stepfunModel?: string;
  deepseekBaseUrl?: string;
  deepseekApiKey?: string;
  deepseekModel?: string;
}

export interface ChatCallOptions {
  temperature?: number;
  maxTokens?: number;
}

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

function pickProvider(cfg: ChatProviderConfig): {
  baseUrl: string;
  apiKey: string;
  model: string;
  name: 'stepfun' | 'deepseek';
} | null {
  if (cfg.stepfunBaseUrl?.trim() && cfg.stepfunApiKey?.trim()) {
    return {
      baseUrl: cfg.stepfunBaseUrl.trim(),
      apiKey: cfg.stepfunApiKey.trim(),
      model: cfg.stepfunModel?.trim() || 'step-3.7-flash',
      name: 'stepfun',
    };
  }
  if (cfg.deepseekBaseUrl?.trim() && cfg.deepseekApiKey?.trim()) {
    return {
      baseUrl: cfg.deepseekBaseUrl.trim(),
      apiKey: cfg.deepseekApiKey.trim(),
      model: cfg.deepseekModel?.trim() || 'deepseek-chat',
      name: 'deepseek',
    };
  }
  return null;
}

const LLM_TIMEOUT_MS = 12_000;

export async function callChatLlm(
  messages: ChatTurn[],
  cfg: ChatProviderConfig,
  opts: ChatCallOptions = {},
): Promise<{ reply: string; provider: string; model: string }> {
  const provider = pickProvider(cfg);
  if (!provider) {
    throw new Error(
      'No chat provider configured (set STEPFUN_API_KEY or DEEPSEEK_API_KEY in backend .env)',
    );
  }

  const url = `${provider.baseUrl.replace(/\/$/, '')}/chat/completions`;
  const body = {
    model: provider.model,
    messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 800,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await res.text();
    let data: OpenAIChatResponse;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Chat provider returned non-JSON (HTTP ${res.status}): ${text.slice(0, 300)}`);
    }

    if (!res.ok) {
      const msg = data.error?.message || `HTTP ${res.status}`;
      throw new Error(`Chat provider failed: ${msg}`);
    }

    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      throw new Error('Chat provider returned empty reply');
    }

    return { reply, provider: provider.name, model: provider.model };
  } finally {
    clearTimeout(timer);
  }
}
