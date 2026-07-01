import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { getModelPromptBinding } from './prompt-catalog';

/**
 * Serves the `/prompts/runtime/render` endpoint that the frontend
 * `resolveManagedPrompt` calls to fetch managed prompts from the database.
 * Falls back to the hardcoded prompt catalog when no DB row exists.
 */
@Controller('prompts')
@UseGuards(JwtAuthGuard)
export class PromptsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('runtime/render')
  async render(@Body() body: { code?: string; variables?: Record<string, unknown> }) {
    const code = body.code?.trim();
    if (!code) return { prompt: '' };

    // Try database first (PromptTemplate table)
    // The table may not exist yet; guard gracefully.
    try {
      const parts = code.split('.');
      const scene = parts.pop() || '';
      const key = parts.join('.');

      const row = await (this.prisma as any).promptTemplate?.findUnique({
        where: { key_scene: { key, scene } },
        select: { content: true, enabled: true },
      });

      if (row?.enabled && row.content) {
        const rendered = this.renderTemplate(row.content, body.variables || {});
        return { prompt: rendered };
      }
    } catch {
      /* table doesn't exist or query failed — fall through */
    }

    // Fallback to local catalog
    const binding = getModelPromptBinding(code as any);
    if (binding) {
      const rendered = this.renderTemplate(binding.fallbackContent, body.variables || {});
      return { prompt: rendered };
    }

    // Unknown code — return empty
    return { prompt: '' };
  }

  private renderTemplate(template: string, variables: Record<string, unknown>): string {
    return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, name: string) => {
      const value = variables[name];
      if (value === undefined || value === null) return '';
      return String(value);
    });
  }
}
