import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BodyFatSample } from './body-fat-aggregator';

export interface BodyFatContext {
  gender?: string | null;
  age?: number | null;
  height?: number | null;
  weight?: number | null;
}

type ProviderResult = {
  bodyFatEstimate?: number;
  bodyFat?: number;
  confidence?: number;
  visibleSignals?: string[];
};

interface ProviderConfig {
  name: string;       // 内部标识，写入 multiModelDetail.provider
  baseUrl: string;    // OpenAI 兼容网关地址
  apiKey: string;
  model: string;      // 远端模型名
}

const PROVIDER_TIMEOUT_MS = 60000;

/**
 * 实测后默认启用的 3 路 provider，每路独立一套 (BASE_URL / API_KEY / MODEL)。
 *   1. openai-next  · jimeng-agent       — 国内速度快，6/6 OK
 *   2. dashscope    · qwen-vl-max        — 中文人体识别强
 *   3. openai-compat· gpt-4o             — 交叉验证锚点
 * 任一缺 key 自动跳过；至少 2 个可用才执行集成，否则上层回退 BMI 公式。
 *
 * 每个 provider 走「P{N}_BASE_URL / P{N}_API_KEY / P{N}_MODEL」三元组，
 * 不再使用旧的 BODY_FAT_VISION_MODELS 单网关多模型方案。
 */
const PROVIDER_KEYS = ['BODY_FAT_P1', 'BODY_FAT_P2', 'BODY_FAT_P3', 'BODY_FAT_P4', 'BODY_FAT_P5'];

const DEFAULT_PROVIDER_NAMES = ['jimeng', 'qwen', 'gpt4o', 'p4', 'p5'];

const SYSTEM_PROMPT =
  '你是资深运动科学评估专家，仅凭单张全身照估算体脂率。基于腰腹/手臂/大腿/下颌脂肪分布、肌肉线条可见度判断。' +
  '输出体脂率(%，1位小数)、置信度confidence(0~1)、可见信号visibleSignals(中文2~4条)。仅输出JSON。\n' +
  '参考范围：男 运动员6~13/健康14~17/平均18~24/偏高25+；女 运动员14~20/健康21~24/平均25~31/偏高32+。';

@Injectable()
export class BodyFatEnsembleService {
  private readonly logger = new Logger(BodyFatEnsembleService.name);

  constructor(private readonly configService: ConfigService) {}

  buildPrompt(ctx: BodyFatContext | undefined): { systemPrompt: string; userPrompt: string } {
    const genderLabel = ctx?.gender === 'female' ? 'female' : ctx?.gender === 'male' ? 'male' : '未知';
    const ageLabel = ctx?.age && ctx.age > 0 ? String(ctx.age) : '未知';
    const heightLabel = ctx?.height && ctx.height > 0 ? String(ctx.height) : '未知';
    const weightLabel = ctx?.weight && ctx.weight > 0 ? String(ctx.weight) : '未知';
    const bmiLabel =
      ctx?.height && ctx?.weight && ctx.height > 0 && ctx.weight > 0
        ? (ctx.weight / Math.pow(ctx.height / 100, 2)).toFixed(1)
        : '未知';

    const userPrompt =
      `性别：${genderLabel}；年龄：${ageLabel}；身高：${heightLabel}cm；体重：${weightLabel}kg；BMI：${bmiLabel}。\n` +
      '请评估体脂率，仅输出 JSON：{"bodyFatEstimate":<number>,"confidence":<0~1>,"visibleSignals":["..."]}。不要输出任何其他文字。';

    return { systemPrompt: SYSTEM_PROMPT, userPrompt };
  }

  async estimate(dataUrl: string, ctx?: BodyFatContext): Promise<BodyFatSample[]> {
    const providers = this.collectProviders();

    if (providers.length === 0) {
      this.logger.warn('Body-fat ensemble: no providers configured');
      return [];
    }

    const { systemPrompt, userPrompt } = this.buildPrompt(ctx);

    const settled = await Promise.allSettled(
      providers.map((p) =>
        this.withTimeout(this.callProvider(p, dataUrl, userPrompt, systemPrompt), PROVIDER_TIMEOUT_MS, p.name),
      ),
    );

    return settled.map((res, idx) => {
      const p = providers[idx];
      if (res.status === 'fulfilled') return res.value;
      const message = res.reason instanceof Error ? res.reason.message : String(res.reason);
      this.logger.warn(`Body-fat provider ${p.name} (${p.model}) failed: ${message}`);
      return { provider: `${p.name}:${p.model}`, value: null, error: message };
    });
  }

  private collectProviders(): ProviderConfig[] {
    const result: ProviderConfig[] = [];
    PROVIDER_KEYS.forEach((prefix, idx) => {
      const baseUrl = (this.configService.get<string>(`${prefix}_BASE_URL`) || '').trim().replace(/\/+$/, '');
      const apiKey = (this.configService.get<string>(`${prefix}_API_KEY`) || '').trim();
      const model = (this.configService.get<string>(`${prefix}_MODEL`) || '').trim();
      const name = (this.configService.get<string>(`${prefix}_NAME`) || DEFAULT_PROVIDER_NAMES[idx]).trim();
      if (!baseUrl || !apiKey || !model) return;
      if (apiKey === 'PLACEHOLDER_FILL_LATER') return;
      result.push({ name, baseUrl, apiKey, model });
    });
    return result;
  }

  private async callProvider(
    p: ProviderConfig,
    dataUrl: string,
    userPrompt: string,
    systemPrompt: string,
  ): Promise<BodyFatSample> {
    const response = await fetch(`${p.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${p.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: p.model,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 1024,
      }),
    });

    const payload: any = await response.json().catch(() => null);
    if (!response.ok) {
      const msg = payload?.error?.message || `HTTP ${response.status}`;
      throw new Error(msg);
    }
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('empty content');
    }
    return this.parseSample(`${p.name}:${p.model}`, content);
  }

  private withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms);
      promise.then(
        (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        (e) => {
          clearTimeout(timer);
          reject(e);
        },
      );
    });
  }

  private parseSample(providerName: string, rawText: string): BodyFatSample {
    const cleaned = rawText
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    // 防御：网关偶发把 vision 请求降级为生图响应
    if (/^!\[.*?\]\(https?:\/\//.test(cleaned) || /生图(中|失败)/.test(cleaned)) {
      throw new Error('gateway returned image-gen artifact instead of JSON');
    }

    let parsed: ProviderResult;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('invalid JSON response');
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        throw new Error('invalid JSON response');
      }
    }

    const value = Number(parsed?.bodyFatEstimate ?? parsed?.bodyFat);
    if (!Number.isFinite(value)) {
      throw new Error('no numeric body fat in response');
    }

    const confidence =
      typeof parsed?.confidence === 'number' && Number.isFinite(parsed.confidence)
        ? Math.max(0, Math.min(1, parsed.confidence))
        : undefined;

    const signals = Array.isArray(parsed?.visibleSignals)
      ? parsed.visibleSignals.filter((s): s is string => typeof s === 'string')
      : undefined;

    return {
      provider: providerName,
      value,
      confidence,
      signals,
    };
  }
}
