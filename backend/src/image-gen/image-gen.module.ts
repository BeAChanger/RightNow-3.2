import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  InternalServerErrorException,
  Module,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

interface IdealBodyGenerateInput {
  prompt?: string;
  currentImageBase64?: string;
  referenceImageBase64?: string;
  size?: string;
}

interface ImageProviderConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  size: string;
}

@Injectable()
class ImageGenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async create(userId: string, data: {
    sourceImageUrl?: string;
    targetStyle?: string;
    prompt?: string;
  }) {
    return this.prisma.imageGenTask.create({
      data: { userId, ...data, status: 'pending' },
    });
  }

  async findByUser(userId: string) {
    return this.prisma.imageGenTask.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }

  async findOne(id: string, userId: string) {
    return this.prisma.imageGenTask.findFirst({
      where: { id, userId },
    });
  }

  async updateStatus(id: string, data: {
    status: string;
    resultImageUrl?: string;
    errorMessage?: string;
  }) {
    return this.prisma.imageGenTask.update({
      where: { id },
      data,
    });
  }

  async generateIdealBody(userId: string, data: IdealBodyGenerateInput) {
    const prompt = data.prompt?.trim();
    if (!prompt) {
      throw new BadRequestException('Image prompt is required');
    }

    const config = this.getImageProviderConfig(data.size);
    const task = await this.createTaskSafely(userId, prompt);

    try {
      const image = data.currentImageBase64?.trim()
        ? await this.requestImageEdit(config, prompt, data.currentImageBase64, data.referenceImageBase64)
        : await this.requestImageGeneration(config, prompt);

      await this.updateTaskSafely(task?.id, {
        status: 'completed',
      });

      return {
        image,
        taskId: task?.id ?? null,
      };
    } catch (error) {
      await this.updateTaskSafely(task?.id, {
        status: 'failed',
        errorMessage: this.toSafeErrorMessage(error),
      });
      throw new InternalServerErrorException('Image generation failed. Please try again later.');
    }
  }

  private getImageProviderConfig(size?: string): ImageProviderConfig {
    const apiKey = (
      this.configService.get<string>('IMAGE_GEN_API_KEY')
      || this.configService.get<string>('CODEX_API_KEY')
      || ''
    ).trim();

    if (!apiKey) {
      throw new InternalServerErrorException('IMAGE_GEN_API_KEY is not configured');
    }

    const baseUrl = (
      this.configService.get<string>('IMAGE_GEN_BASE_URL')
      || this.configService.get<string>('CODEX_BASE_URL')
      || 'https://code.newcli.com/codex/v1'
    ).trim().replace(/\/+$/, '');

    const model = (
      this.configService.get<string>('IMAGE_GEN_MODEL')
      || this.configService.get<string>('CODEX_IMAGE_MODEL')
      || 'gpt-image-2'
    ).trim();

    return {
      apiKey,
      baseUrl,
      model,
      size: this.normalizeSize(size),
    };
  }

  private normalizeSize(size?: string): string {
    const value = size?.trim();
    const allowed = new Set(['1024x1024', '1024x1536', '1536x1024', 'auto']);
    return value && allowed.has(value) ? value : '1024x1024';
  }

  private async requestImageGeneration(config: ImageProviderConfig, prompt: string): Promise<string> {
    const response = await this.proxyFetch(`${config.baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        prompt,
        n: 1,
        size: config.size,
        response_format: 'b64_json',
      }),
    });

    return this.extractProviderImage(response);
  }

  private async requestImageEdit(
    config: ImageProviderConfig,
    prompt: string,
    currentImageBase64: string,
    referenceImageBase64?: string,
  ): Promise<string> {
    try {
      return await this.requestImageEditOnce(
        config,
        prompt,
        currentImageBase64,
        referenceImageBase64,
      );
    } catch (error) {
      if (!referenceImageBase64?.trim()) {
        throw error;
      }

      return this.requestImageEditOnce(config, prompt, currentImageBase64);
    }
  }

  private async requestImageEditOnce(
    config: ImageProviderConfig,
    prompt: string,
    currentImageBase64: string,
    referenceImageBase64?: string,
  ): Promise<string> {
    const formData = new FormData();
    formData.append('image', this.toImageBlob(currentImageBase64), 'body.png');
    if (referenceImageBase64?.trim()) {
      formData.append('image', this.toImageBlob(referenceImageBase64), 'reference.png');
    }
    formData.append('prompt', prompt);
    formData.append('model', config.model);
    formData.append('n', '1');
    formData.append('size', config.size);
    formData.append('response_format', 'b64_json');

    const response = await this.proxyFetch(`${config.baseUrl}/images/edits`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: formData,
    });

    return this.extractProviderImage(response);
  }

  private toImageBlob(dataUrlOrBase64: string): Blob {
    const trimmed = dataUrlOrBase64.trim();
    if (!trimmed) {
      throw new BadRequestException('Image payload is empty');
    }

    let mimeType = 'image/png';
    let base64Data = trimmed;

    if (trimmed.startsWith('data:')) {
      const commaIndex = trimmed.indexOf(',');
      if (commaIndex < 0) {
        throw new BadRequestException('Invalid image data URL');
      }
      const meta = trimmed.slice(5, commaIndex);
      mimeType = meta.split(';')[0] || mimeType;
      base64Data = trimmed.slice(commaIndex + 1);
    }

    const bytes = Buffer.from(base64Data.replace(/\s/g, ''), 'base64');
    if (!bytes.byteLength) {
      throw new BadRequestException('Invalid image payload');
    }

    return new Blob([bytes], { type: mimeType });
  }

  private async extractProviderImage(response: Response): Promise<string> {
    let payload: any = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const remoteMessage = payload?.error?.message || payload?.message || `HTTP ${response.status}`;
      throw new Error(`Image provider request failed: ${remoteMessage}`);
    }

    const first = payload?.data?.[0];
    if (typeof first?.b64_json === 'string' && first.b64_json.trim()) {
      return `data:image/png;base64,${first.b64_json}`;
    }
    if (typeof first?.url === 'string' && first.url.trim()) {
      return first.url;
    }

    throw new Error('Image provider returned no image payload');
  }

  private async createTaskSafely(userId: string, prompt: string): Promise<{ id: string } | null> {
    try {
      return await this.prisma.imageGenTask.create({
        data: {
          userId,
          prompt,
          targetStyle: 'ideal-body',
          status: 'processing',
        },
        select: { id: true },
      });
    } catch {
      return null;
    }
  }

  private async updateTaskSafely(
    id: string | undefined,
    data: { status: string; errorMessage?: string },
  ) {
    if (!id) return;
    try {
      await this.prisma.imageGenTask.update({
        where: { id },
        data,
      });
    } catch {
      // The generated image is still returned even if task bookkeeping fails.
    }
  }

  private toSafeErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message.slice(0, 500);
    }
    return 'Unknown image generation error';
  }

  private async proxyFetch(url: string, options: RequestInit): Promise<Response> {
    const proxyUrl = this.configService.get<string>('IMAGE_GEN_PROXY_URL')?.trim();
    if (proxyUrl) {
      // undici is bundled with Node.js 18+; require bypasses TS module resolution
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ProxyAgent } = require('undici') as { ProxyAgent: new (url: string) => unknown };
      return fetch(url, { ...options, dispatcher: new ProxyAgent(proxyUrl) } as RequestInit);
    }
    return fetch(url, options);
  }
}

@Controller('image-gen')
@UseGuards(JwtAuthGuard)
class ImageGenController {
  constructor(private readonly service: ImageGenService) {}

  @Post()
  create(
    @CurrentUser() user: { sub: string },
    @Body() body: { sourceImageUrl?: string; targetStyle?: string; prompt?: string },
  ) {
    return this.service.create(user.sub, body);
  }

  @Post('ideal-body')
  generateIdealBody(
    @CurrentUser() user: { sub: string },
    @Body() body: IdealBodyGenerateInput,
  ) {
    return this.service.generateIdealBody(user.sub, body);
  }

  @Get()
  list(@CurrentUser() user: { sub: string }) {
    return this.service.findByUser(user.sub);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
  ) {
    return this.service.findOne(id, user.sub);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { status: string; resultImageUrl?: string; errorMessage?: string },
  ) {
    return this.service.updateStatus(id, body);
  }
}

@Module({
  controllers: [ImageGenController],
  providers: [ImageGenService],
})
export class ImageGenModule {}
