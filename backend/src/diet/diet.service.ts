import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface FoodAnalysis {
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  mealType: string;
}

export interface MealEstimateResult {
  estimated: FoodAnalysis;
  advice: string;
  mealTypeGuess: string;
  warning?: string;
  processedAt: string;
}

const DEFAULT_FOOD_ANALYSIS_SYSTEM_PROMPT = [
  '你是 RightNow 的食物识别与营养估算引擎，负责根据用户上传的食物图片或文字描述，识别食物并估算总热量和三大营养素。',
  '你必须只返回一个合法 JSON 对象，不要输出 Markdown、解释、前后缀或代码块。',
  'JSON 字段固定为：name、calories、protein、fat、carbs、mealType。',
  'calories 单位为千卡，protein/fat/carbs 单位为克，所有数值返回整数。',
  'mealType 只能是 早餐、午餐、晚餐、加餐 之一；无法判断时用 加餐。',
  '如果图片中有多种食物，name 用中文概括主要组合，并估算整张图片中可食用部分的总量。',
  '如果份量不明确，请基于常见餐具、手掌比例、食物体积和中国常见餐食份量做保守估算。',
  '不要给医疗诊断，不要声称结果绝对准确；但 JSON 内不要加入说明字段。',
].join('\n');

@Injectable()
export class DietService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  list(userId: string, date?: string) {
    return this.prisma.dietRecord.findMany({
      where: {
        userId,
        ...(date ? { date: this.normalizeDate(date) } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async summary(userId: string, date?: string) {
    const records = await this.prisma.dietRecord.findMany({
      where: {
        userId,
        ...(date ? { date: this.normalizeDate(date) } : {}),
      },
      select: {
        calories: true,
        fat: true,
        protein: true,
        carbs: true,
      },
    });

    return records.reduce(
      (acc, record) => ({
        totalCalories: acc.totalCalories + record.calories,
        totalFat: acc.totalFat + (record.fat ?? 0),
        totalProtein: acc.totalProtein + (record.protein ?? 0),
        totalCarbs: acc.totalCarbs + (record.carbs ?? 0),
      }),
      { totalCalories: 0, totalFat: 0, totalProtein: 0, totalCarbs: 0 },
    );
  }

  create(userId: string, body: {
    name?: string;
    calories?: number;
    fat?: number;
    protein?: number;
    carbs?: number;
    date?: string;
    mealType?: string;
  }) {
    return this.prisma.dietRecord.create({
      data: {
        userId,
        name: this.normalizeRequiredText(body.name, 'name'),
        calories: this.normalizeCalories(body.calories),
        fat: this.normalizeOptionalMacro(body.fat, 'fat'),
        protein: this.normalizeOptionalMacro(body.protein, 'protein'),
        carbs: this.normalizeOptionalMacro(body.carbs, 'carbs'),
        date: this.normalizeDate(body.date),
        mealType: this.normalizeOptionalText(body.mealType),
      },
    });
  }

  async update(userId: string, id: string, body: {
    name?: string;
    calories?: number;
    fat?: number;
    protein?: number;
    carbs?: number;
    date?: string;
    mealType?: string;
  }) {
    await this.ensureOwnedRecord(userId, id);

    return this.prisma.dietRecord.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: this.normalizeRequiredText(body.name, 'name') } : {}),
        ...(body.calories !== undefined ? { calories: this.normalizeCalories(body.calories) } : {}),
        ...(body.fat !== undefined ? { fat: this.normalizeOptionalMacro(body.fat, 'fat') } : {}),
        ...(body.protein !== undefined ? { protein: this.normalizeOptionalMacro(body.protein, 'protein') } : {}),
        ...(body.carbs !== undefined ? { carbs: this.normalizeOptionalMacro(body.carbs, 'carbs') } : {}),
        ...(body.date !== undefined ? { date: this.normalizeDate(body.date) } : {}),
        ...(body.mealType !== undefined ? { mealType: this.normalizeOptionalText(body.mealType) } : {}),
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.ensureOwnedRecord(userId, id);
    await this.prisma.dietRecord.delete({ where: { id } });
    return { success: true };
  }

  async analyzeText(body: { foodName?: string; description?: string }): Promise<FoodAnalysis> {
    const foodName = this.normalizeRequiredText(body.foodName, 'foodName');
    const description = this.normalizeOptionalText(body.description);
    const userText = description
      ? `请分析这份食物：${foodName}\n补充描述：${description}`
      : `请分析这份食物：${foodName}`;

    return this.requestStepVision([
      {
        role: 'user',
        content: [{ type: 'text', text: `${userText}\n请返回纯 JSON。` }],
      },
    ]);
  }

  async analyzeImage(body: { imageBase64?: string }): Promise<FoodAnalysis> {
    const imageUrl = this.normalizeImageDataUrl(body.imageBase64);

    return this.requestStepVision([
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: '识别这张图片中的食物，估算整张图中可食用部分的总热量、蛋白质、脂肪和碳水，并返回纯 JSON。',
          },
          {
            type: 'image_url',
            image_url: { url: imageUrl },
          },
        ],
      },
    ]);
  }

  private async requestStepVision(messages: Array<{
    role: 'user' | 'assistant';
    content: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;
  }>): Promise<FoodAnalysis> {
    const apiKey = this.configService.get<string>('STEPFUN_API_KEY')?.trim()
      || this.configService.get<string>('DIET_VISION_API_KEY')?.trim()
      || '';
    if (!apiKey) {
      throw new InternalServerErrorException('STEPFUN_API_KEY is not configured');
    }

    const baseUrl = (
      this.configService.get<string>('STEPFUN_BASE_URL')
      || this.configService.get<string>('DIET_VISION_BASE_URL')
      || 'https://api.stepfun.com/v1'
    ).trim().replace(/\/+$/, '');
    const model = (
      this.configService.get<string>('DIET_VISION_MODEL')
      || 'step-1o-turbo-vision'
    ).trim();
    const systemPrompt = (
      this.configService.get<string>('DIET_ANALYSIS_SYSTEM_PROMPT')
      || DEFAULT_FOOD_ANALYSIS_SYSTEM_PROMPT
    ).trim();

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages,
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        }),
      });
    } catch {
      throw new InternalServerErrorException('Food analysis service is unreachable');
    }

    let payload: any = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const message = payload?.error?.message || `Food analysis failed with HTTP ${response.status}`;
      throw new InternalServerErrorException(message);
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new InternalServerErrorException('Food analysis returned an empty response');
    }

    return this.normalizeFoodAnalysis(this.parseJson(content));
  }

  private normalizeFoodAnalysis(value: unknown): FoodAnalysis {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new InternalServerErrorException('Food analysis returned invalid JSON');
    }

    const source = value as Record<string, unknown>;
    return {
      name: this.normalizeOptionalText(source.name) || '未知食物',
      calories: this.roundNonNegative(source.calories),
      protein: this.roundNonNegative(source.protein),
      fat: this.roundNonNegative(source.fat),
      carbs: this.roundNonNegative(source.carbs),
      mealType: this.normalizeMealType(source.mealType),
    };
  }

  private parseJson(raw: string): unknown {
    const cleaned = raw.replace(/```json?\s*/gi, '').replace(/```/g, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start >= 0 && end > start) {
        return JSON.parse(cleaned.slice(start, end + 1));
      }
      throw new InternalServerErrorException('Food analysis returned non-JSON content');
    }
  }

  private async ensureOwnedRecord(userId: string, id: string) {
    const record = await this.prisma.dietRecord.findFirst({ where: { id, userId } });
    if (!record) {
      throw new NotFoundException('Diet record not found');
    }
    return record;
  }

  private normalizeRequiredText(value: unknown, fieldName: string): string {
    const text = this.normalizeOptionalText(value);
    if (!text) {
      throw new BadRequestException(`${fieldName} is required`);
    }
    return text;
  }

  private normalizeOptionalText(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private normalizeDate(value?: unknown): string {
    if (value === undefined || value === null || value === '') {
      return new Date().toISOString().slice(0, 10);
    }
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
      throw new BadRequestException('date must be in YYYY-MM-DD format');
    }
    return value.trim();
  }

  private normalizeCalories(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new BadRequestException('calories must be a non-negative number');
    }
    return Math.round(parsed);
  }

  private normalizeOptionalMacro(value: unknown, fieldName: string): number | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new BadRequestException(`${fieldName} must be a non-negative number`);
    }
    return Math.round(parsed);
  }

  private roundNonNegative(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 0;
    }
    return Math.round(parsed);
  }

  private normalizeMealType(value: unknown): string {
    const text = this.normalizeOptionalText(value);
    if (text && ['早餐', '午餐', '晚餐', '加餐'].includes(text)) {
      return text;
    }
    return '加餐';
  }

  private normalizeImageDataUrl(value: unknown): string {
    const text = this.normalizeRequiredText(value, 'imageBase64');
    if (text.startsWith('data:image/')) {
      return text;
    }
    if (/^[A-Za-z0-9+/=\s]+$/.test(text) && text.length > 100) {
      return `data:image/jpeg;base64,${text.replace(/\s/g, '')}`;
    }
    throw new BadRequestException('imageBase64 must be a valid image data URL or base64 string');
  }

  async estimateBeforeMeal(body: { imageBase64?: string }): Promise<MealEstimateResult> {
    const analysis = await this.analyzeImage(body);
    const advice = this.buildMealAdvice(analysis);
    const hour = new Date().getHours();
    let mealTypeGuess = analysis.mealType || 'snack';
    if (!analysis.mealType || analysis.mealType === 'snack') {
      if (hour < 10) mealTypeGuess = 'breakfast';
      else if (hour < 14) mealTypeGuess = 'lunch';
      else if (hour < 18) mealTypeGuess = 'snack';
      else mealTypeGuess = 'dinner';
    }
    let warning: string | undefined;
    if (analysis.calories > 1200) warning = '单餐热量超过 1200kcal，建议适当减少分量';
    else if (analysis.carbs > analysis.protein * 3 && analysis.protein < 20) warning = '碳水比例偏高且蛋白质不足，建议增加瘦肉/蛋/豆制品';
    return { estimated: analysis, advice, mealTypeGuess, warning, processedAt: new Date().toISOString() };
  }

  private buildMealAdvice(analysis: FoodAnalysis): string {
    const parts: string[] = [];
    const ratio = analysis.carbs / Math.max(analysis.protein, 1);
    if (ratio > 4) parts.push('这个分量作为正餐碳水偏多，建议减少 1/3 米饭/面类，加一份蔬菜');
    else if (ratio > 2.5) parts.push('碳水比例尚可，可以再加一份蛋白质（鸡胸/鱼/豆腐）让结构更均衡');
    else if (analysis.protein > 30 && analysis.carbs < 30) parts.push('高蛋白低碳水组合，适合减脂期的主餐搭配');
    else parts.push('宏量比例均衡，作为一餐搭配合理');
    if (analysis.fat > 40) parts.push('脂肪含量偏高，注意烹饪油用量');
    if (analysis.calories < 250) parts.push('热量偏低，作为正餐分量偏少');
    const hour = new Date().getHours();
    if (hour < 10 && analysis.carbs < 40) parts.push('早餐碳水偏低，建议增加燕麦/全麦面包');
    if (hour >= 17 && hour < 21 && analysis.carbs > 80) parts.push('晚餐碳水偏高，建议减半碳水并增加蔬菜');
    return parts.join('。');
  }
}
