import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
      {
        temperature: 0.3,
        topP: 0.8,
        maxOutputTokens: 512,
      },
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
      {
        temperature: 0.3,
        topP: 0.8,
        maxOutputTokens: 512,
      },
      systemPrompt,
    );

    return this.parseJsonResponse<{
      calories: number;
      protein: number;
      fat: number;
      carbs: number;
    }>(text);
  }

  async estimateBodyFatFromImage(imageUrl: string): Promise<number> {
    const prompt = `Estimate body fat percentage from this photo URL: ${imageUrl}. Return a number only, for example 15.5`;
    const text = await this.requestGemini(prompt, {
      temperature: 0.2,
      maxOutputTokens: 50,
    });
    const parsed = Number.parseFloat(text.trim());
    if (!Number.isFinite(parsed)) {
      throw new Error('Model returned invalid body fat percentage');
    }
    return parsed;
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
            key_scene: {
              key: binding.key,
              scene: binding.scene,
            },
          },
          select: {
            content: true,
            enabled: true,
          },
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
      if (value === undefined || value === null) {
        return '';
      }
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

  private async requestGemini(
    prompt: string,
    generationConfig: GeminiGenerationConfig,
    systemPrompt?: string,
  ): Promise<string> {
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
