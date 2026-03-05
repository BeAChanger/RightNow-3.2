import { BadRequestException, Body, Controller, Injectable, Module, Post } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { getModelPromptBinding, ModelPromptCode } from './prompt-catalog';

interface RenderPromptBody {
  code?: string;
  variables?: Record<string, unknown>;
}

@Injectable()
class PromptRuntimeService {
  constructor(private readonly prisma: PrismaService) {}

  async render(codeRaw: string, variables: Record<string, unknown>) {
    const binding = this.tryGetBinding(codeRaw);
    const templateRow = await this.prisma.promptTemplate.findUnique({
      where: {
        key_scene: {
          key: binding.key,
          scene: binding.scene,
        },
      },
      select: {
        id: true,
        content: true,
        enabled: true,
      },
    });

    const useDbTemplate =
      !!templateRow &&
      templateRow.enabled &&
      typeof templateRow.content === 'string' &&
      templateRow.content.trim().length > 0;

    const rawTemplate = useDbTemplate ? templateRow!.content : binding.fallbackContent;
    const prompt = this.renderTemplate(rawTemplate, variables);

    return {
      code: binding.code,
      scene: binding.scene,
      key: binding.key,
      source: useDbTemplate ? 'db' : 'fallback',
      templateId: useDbTemplate ? templateRow!.id : null,
      prompt,
    };
  }

  private tryGetBinding(codeRaw: string) {
    try {
      return getModelPromptBinding(codeRaw as ModelPromptCode);
    } catch {
      throw new BadRequestException(`Unknown prompt code: ${codeRaw}`);
    }
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
}

@Controller('prompts/runtime')
class PromptRuntimeController {
  constructor(private readonly service: PromptRuntimeService) {}

  @Post('render')
  render(@Body() body: RenderPromptBody) {
    const code = body.code?.trim();
    if (!code) {
      throw new BadRequestException('code is required');
    }

    return this.service.render(code, body.variables || {});
  }
}

@Module({
  imports: [PrismaModule],
  providers: [PromptRuntimeService],
  controllers: [PromptRuntimeController],
})
export class PromptRuntimeModule {}