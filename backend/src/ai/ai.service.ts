import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { extname, join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { getModelPromptBinding, ModelPromptCode } from '../prompts/prompt-catalog';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

interface GeminiGenerationConfig {
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
}

interface PromptTemplateRow {
  content: string;
  enabled: boolean;
}

interface PromptTemplateDelegate {
  findUnique(args: {
    where: {
      key_scene: {
        key: string;
        scene: string;
      };
    };
    select: {
      content: true;
      enabled: true;
    };
  }): Promise<PromptTemplateRow | null>;
}

// ── Body-Fat Result Types ────────────────────────────────────────────

export interface BodyFatEstimateAggregate {
  final: number;
  median: number;
  spread: number;
  keptCount: number;
  totalCount: number;
  breakdown: Array<{
    provider: string;
    value: number;
    confidence: number | null;
    signals: string[];
    kept: boolean;
    rejectionReason: string | null;
  }>;
}

export interface BodyFatEstimateResult {
  value: number;
  aggregate: BodyFatEstimateAggregate;
}

const MIN_PLAUSIBLE = 3;
const MAX_PLAUSIBLE = 60;

@Injectable()
export class AiService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async extractTrainingData(input: {
    description?: string;
    photoUrl?: string;
    rawInput?: unknown;
  }) {
    const prompt = await this.resolvePrompt('training.extract_data', {
      description: input.description || '',
      photoUrl: input.photoUrl || '',
      rawInputJson: JSON.stringify(input.rawInput ?? {}, null, 2),
    });

    const text = await this.requestGemini(prompt, {
      temperature: 0.2,
      topP: 0.8,
      maxOutputTokens: 1024,
    });

    return this.parseJsonResponse<any>(text);
  }

  async generateFeedback(
    payload: unknown,
    promptCode: ModelPromptCode = 'training.generate_feedback',
  ): Promise<any> {
    const variables =
      promptCode === 'training.daily_change_feedback'
        ? {
            recordsJson: JSON.stringify(
              (payload as { records?: unknown[] } | null | undefined)?.records ?? [],
              null,
              2,
            ),
            lastRecordJson: JSON.stringify(
              (payload as { lastRecord?: unknown } | null | undefined)?.lastRecord ?? null,
              null,
              2,
            ),
          }
        : {
            structuredDataJson: JSON.stringify(payload ?? {}, null, 2),
          };

    const prompt = await this.resolvePrompt(promptCode, variables);
    const text = await this.requestGemini(prompt, {
      temperature: 0.7,
      maxOutputTokens: 512,
    });

    return this.parseJsonResponse<any>(text);
  }

  async analyzeFoodPhoto(photoUrl: string) {
    const systemPrompt = await this.resolvePrompt('core.food_analysis_system', {});
    const userPrompt = await this.resolvePrompt('food.analyze_image_user_prompt', {
      photoUrl,
    });

    const text = await this.requestGemini(
      userPrompt,
      { temperature: 0.3, topP: 0.8, maxOutputTokens: 512 },
      systemPrompt,
    );

    return this.parseJsonResponse<{
      name: string;
      calories: number;
      protein: number;
      fat: number;
      carbs: number;
    }>(text);
  }

  async analyzeFoodText(name: string, description?: string) {
    const query = description ? `${name}, ${description}` : name;
    const systemPrompt = await this.resolvePrompt('core.food_analysis_system', {});
    const userPrompt = await this.resolvePrompt('food.analyze_text_user_prompt', { query });

    const text = await this.requestGemini(
      userPrompt,
      { temperature: 0.3, topP: 0.8, maxOutputTokens: 512 },
      systemPrompt,
    );

    return this.parseJsonResponse<{
      calories: number;
      protein: number;
      fat: number;
      carbs: number;
    }>(text);
  }

  // ── Body-Fat Estimation (Solo Model with Context) ──────────────────

  /**
   * Estimate body-fat percentage from a single photo using a solo vision model.
   * Accepts optional user context (gender, age, height, weight) to improve
   * prompt quality. Falls back from StepFun vision → Gemini text-only.
   *
   * Returns a structured result with an aggregate object that mirrors the
   * multi-model format (single-entry breakdown), keeping the schema compatible.
   */
  async estimateBodyFatFromImage(
    imageUrl: string,
    context?: {
      gender?: string | null;
      age?: number | null;
      height?: number | null;
      weight?: number | null;
    },
  ): Promise<BodyFatEstimateResult> {
    const dataUrl = await this.imageUrlToDataUrl(imageUrl);

    // Build context-aware prompts.
    const ctxLines: string[] = [];
    if (context?.gender) {
      ctxLines.push(`- 性别: ${context.gender === 'female' ? '女性' : '男性'}`);
    }
    if (context?.age != null && context.age > 0) {
      ctxLines.push(`- 年龄: ${context.age} 岁`);
    }
    if (context?.height != null && context.height > 0) {
      ctxLines.push(`- 身高: ${context.height} cm`);
    }
    if (context?.weight != null && context.weight > 0) {
      ctxLines.push(`- 体重: ${context.weight} kg`);
    }
    const ctxBlock = ctxLines.length > 0 ? `\n用户补充信息:\n${ctxLines.join('\n')}` : '';

    const systemPrompt =
      `你是一位资深运动科学评估专家。根据单张照片中可见的体型特征估算体脂率。${ctxBlock}\n` +
      `注意: 用户信息仅供参考，请以目视评估为主。\n` +
      '返回纯 JSON，格式: {"bodyFat": 18.5, "confidence": 0.8, "visibleSignals": ["腹部线条模糊","肩臂轮廓清晰"]}\n' +
      '不要加解释、markdown 或其他字段。';

    const userPrompt =
      '请从上传的照片中估算这个人的体脂率。返回 JSON only。';

    let rawValue: number | null = null;
    let confidence: number | null = null;
    let signals: string[] = [];
    let providerLabel = 'stepfun-vision';

    try {
      const text = await this.requestVision(userPrompt, dataUrl, {
        temperature: 0.2,
        maxOutputTokens: 256,
      }, systemPrompt);

      const parsed = this.parseJsonResponse<{
        bodyFat?: number;
        bodyFatEstimate?: number;
        confidence?: number;
        visibleSignals?: string[];
      }>(text);

      rawValue = Number(parsed?.bodyFat ?? parsed?.bodyFatEstimate);
      confidence = typeof parsed?.confidence === 'number' ? parsed.confidence : null;
      signals = Array.isArray(parsed?.visibleSignals) ? parsed.visibleSignals : [];
      providerLabel = 'stepfun-vision';
    } catch (error) {
      // StepFun failed → try Gemini fallback.
      const message = error instanceof Error ? error.message : 'unknown';
      try {
        const text = await this.requestGemini(
          `${userPrompt}\n(StepFun vision failed: ${message})\nImage data URL (truncated): ${dataUrl.slice(0, 500)}`,
          { temperature: 0.2, maxOutputTokens: 128 },
          systemPrompt,
        );
        const parsed = this.parseJsonResponse<{ bodyFat?: number; bodyFatEstimate?: number }>(text);
        rawValue = Number(parsed?.bodyFat ?? parsed?.bodyFatEstimate);
        providerLabel = 'gemini-text-fallback';
      } catch {
        // Both failed – will throw below.
      }
    }

    if (!Number.isFinite(rawValue)) {
      throw new Error('Model(s) returned invalid body fat percentage');
    }

    const normalizedValue = this.clampBodyFat(rawValue!);
    const safeConfidence = confidence != null ? confidence : 0.7;

    return {
      value: normalizedValue,
      aggregate: {
        final: normalizedValue,
        median: normalizedValue,
        spread: 0,
        keptCount: 1,
        totalCount: 1,
        breakdown: [
          {
            provider: providerLabel,
            value: normalizedValue,
            confidence: safeConfidence,
            signals,
            kept: true,
            rejectionReason: null,
          },
        ],
      },
    };
  }

  // ── Private Helpers ─────────────────────────────────────────────────

  private clampBodyFat(value: number): number {
    const clamped = Math.max(MIN_PLAUSIBLE, Math.min(MAX_PLAUSIBLE, value));
    return Number(clamped.toFixed(1));
  }

  private async imageUrlToDataUrl(imageUrl: string): Promise<string> {
    if (imageUrl.startsWith('data:')) return imageUrl;

    let buffer: Buffer;
    let mime = 'image/jpeg';

    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`Failed to fetch image: ${imageUrl}`);
      buffer = Buffer.from(await response.arrayBuffer());
      const pathname = new URL(imageUrl).pathname;
      mime = this.mimeFromExtension(extname(pathname));
    } else {
      const localPath = imageUrl.startsWith('/uploads/')
        ? join(process.cwd(), 'uploads', imageUrl.replace('/uploads/', ''))
        : join(process.cwd(), imageUrl);
      buffer = readFileSync(localPath);
      mime = this.mimeFromExtension(extname(localPath));
    }

    return `data:${mime};base64,${buffer.toString('base64')}`;
  }

  private mimeFromExtension(extension: string): string {
    const ext = extension.toLowerCase();
    if (ext === '.png') return 'image/png';
    if (ext === '.webp') return 'image/webp';
    if (ext === '.gif') return 'image/gif';
    return 'image/jpeg';
  }

  private async resolvePrompt(
    code: ModelPromptCode,
    variables: Record<string, unknown>,
  ): Promise<string> {
    const binding = getModelPromptBinding(code);

    const promptTemplateDelegate = (
      this.prisma as unknown as { promptTemplate?: PromptTemplateDelegate }
    ).promptTemplate;

    let dbTemplate: PromptTemplateRow | null = null;

    if (promptTemplateDelegate?.findUnique) {
      try {
        dbTemplate = await promptTemplateDelegate.findUnique({
          where: {
            key_scene: { key: binding.key, scene: binding.scene },
          },
          select: { content: true, enabled: true },
        });
      } catch {
        dbTemplate = null;
      }
    }

    const sourceTemplate =
      dbTemplate && dbTemplate.enabled && dbTemplate.content.trim()
        ? dbTemplate.content
        : binding.fallbackContent;

    return this.renderTemplate(sourceTemplate, variables);
  }

  private renderTemplate(template: string, variables: Record<string, unknown>): string {
    return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, variableName: string) => {
      const value = variables[variableName];
      if (value === undefined || value === null) return '';
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    });
  }

  private async requestVision(
    prompt: string,
    imageDataUrl: string,
    generationConfig: GeminiGenerationConfig,
    systemPrompt?: string,
  ): Promise<string> {
    const apiKey =
      this.configService.get<string>('STEPFUN_API_KEY')?.trim() ||
      this.configService.get<string>('DIET_VISION_API_KEY')?.trim() ||
      '';

    if (apiKey) {
      const baseUrl = (
        this.configService.get<string>('STEPFUN_BASE_URL') ||
        this.configService.get<string>('DIET_VISION_BASE_URL') ||
        'https://api.stepfun.com/v1'
      )
        .trim()
        .replace(/\/+$/, '');

      const model = (
        this.configService.get<string>('BODY_FAT_VISION_MODEL') ||
        this.configService.get<string>('DIET_VISION_MODEL') ||
        'step-1o-turbo-vision'
      ).trim();

      const messages: Array<{
        role: string;
        content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
      }> = [];

      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }

      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ],
      });

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          response_format: { type: 'json_object' },
          temperature: generationConfig.temperature ?? 0.2,
          max_tokens: generationConfig.maxOutputTokens ?? 256,
        }),
      });

      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        const remoteMessage = payload?.error?.message || `HTTP ${response.status}`;
        throw new Error(`Vision model request failed: ${remoteMessage}`);
      }

      const content = payload?.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || !content.trim()) {
        throw new Error('Vision model returned empty response text');
      }

      return content;
    }

    // Fallback to Gemini text-only when no vision API key is configured.
    const text = await this.requestGemini(
      `${prompt}\nImage URL: ${imageDataUrl}`,
      generationConfig,
      systemPrompt,
    );
    return text;
  }

  private async requestGemini(
    prompt: string,
    generationConfig: GeminiGenerationConfig,
    systemPrompt?: string,
  ): Promise<string> {
    const deepseekBaseUrl = this.configService.get<string>('DEEPSEEK_BASE_URL', '');
    const deepseekApiKey = this.configService.get<string>('DEEPSEEK_API_KEY', '');

    if (deepseekBaseUrl && deepseekApiKey) {
      return this.requestDeepSeek(prompt, generationConfig, systemPrompt, deepseekBaseUrl, deepseekApiKey);
    }

    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey?.trim()) {
      throw new InternalServerErrorException('GEMINI_API_KEY is not configured');
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          ...(systemPrompt ? { system_instruction: { parts: [{ text: systemPrompt }] } } : {}),
          generationConfig,
        }),
      },
    );

    const data = (await response.json()) as GeminiResponse;

    if (!response.ok) {
      const remoteMessage = data.error?.message || `HTTP ${response.status}`;
      throw new Error(`Gemini request failed: ${remoteMessage}`);
    }

    const text = data.candidates?.[0]?.content?.parts?.find((part) => typeof part.text === 'string')?.text;
    if (!text) {
      throw new Error('Gemini returned empty response text');
    }

    return text;
  }

  private async requestDeepSeek(
    prompt: string,
    generationConfig: GeminiGenerationConfig,
    systemPrompt: string | undefined,
    baseUrl: string,
    apiKey: string,
  ): Promise<string> {
    const messages: Array<{ role: string; content: string }> = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const maxTokens = Math.max(generationConfig.maxOutputTokens || 1024, 2048);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.configService.get<string>('DEEPSEEK_MODEL', 'deepseek-v4-flash'),
        messages,
        temperature: generationConfig.temperature,
        max_tokens: maxTokens,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const remoteMessage = data?.error?.message || `HTTP ${response.status}`;
      throw new Error(`DeepSeek request failed: ${remoteMessage}`);
    }

    const msg = data?.choices?.[0]?.message;
    const content = msg?.content;
    const reasoning = msg?.reasoning_content;
    const text = (typeof content === 'string' && content.trim())
      ? content
      : (typeof reasoning === 'string' ? reasoning : '');
    if (!text) {
      throw new Error('DeepSeek returned empty response');
    }

    return text;
  }

  private parseJsonResponse<T>(rawText: string): T {
    const cleaned = rawText
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    try {
      return JSON.parse(cleaned) as T;
    } catch {
      throw new Error('Model returned invalid JSON response');
    }
  }
}
