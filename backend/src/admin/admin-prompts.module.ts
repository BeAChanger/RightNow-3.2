import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request } from 'express';
import {
  MODEL_PROMPT_BINDINGS,
  toPromptBindingIdentity,
} from '../prompts/prompt-catalog';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAuditModule, AdminAuditService } from './admin-audit.module';
import { AdminGuard } from './admin.guard';

interface PromptPayload {
  key: string;
  scene: string;
  content: string;
  variables?: string[];
  enabled?: boolean;
}

@Injectable()
class AdminPromptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AdminAuditService,
  ) {}

  async listModelBindings() {
    const bindingsWhere = MODEL_PROMPT_BINDINGS.map((binding) => ({
      key: binding.key,
      scene: binding.scene,
    }));

    const rows = await this.prisma.promptTemplate.findMany({
      where: {
        OR: bindingsWhere,
      },
      include: {
        updater: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const templateMap = new Map(
      rows.map((row) => [toPromptBindingIdentity(row.scene, row.key), row]),
    );

    return MODEL_PROMPT_BINDINGS.map((binding) => {
      const current = templateMap.get(toPromptBindingIdentity(binding.scene, binding.key));
      return {
        code: binding.code,
        title: binding.title,
        description: binding.description,
        scene: binding.scene,
        key: binding.key,
        variables: binding.variables,
        fallbackContent: binding.fallbackContent,
        current: current
          ? {
              id: current.id,
              content: current.content,
              variables: this.readVariables(current.variables),
              enabled: current.enabled,
              updatedAt: current.updatedAt.toISOString(),
              updater: current.updater
                ? {
                    id: current.updater.id,
                    email: current.updater.email,
                    name: current.updater.name,
                  }
                : null,
            }
          : null,
      };
    });
  }

  async list(params: {
    keyword?: string;
    scene?: string;
    enabled?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Number.isFinite(params.page) ? Math.max(1, params.page || 1) : 1;
    const pageSize = Number.isFinite(params.pageSize)
      ? Math.min(100, Math.max(1, params.pageSize || 20))
      : 20;

    const where: Prisma.PromptTemplateWhereInput = {};

    if (params.keyword?.trim()) {
      const keyword = params.keyword.trim();
      where.OR = [
        { key: { contains: keyword, mode: 'insensitive' } },
        { scene: { contains: keyword, mode: 'insensitive' } },
        { content: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    if (params.scene?.trim()) {
      where.scene = params.scene.trim();
    }

    if (params.enabled === 'true' || params.enabled === 'false') {
      where.enabled = params.enabled === 'true';
    }

    const [total, rows] = await Promise.all([
      this.prisma.promptTemplate.count({ where }),
      this.prisma.promptTemplate.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          updater: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map((row) => this.mapTemplate(row)),
      total,
      page,
      pageSize,
    };
  }

  async create(actorId: string, body: PromptPayload, request: Request) {
    const payload = this.normalizePayload(body);

    try {
      const created = await this.prisma.promptTemplate.create({
        data: {
          key: payload.key,
          scene: payload.scene,
          content: payload.content,
          variables: payload.variables,
          enabled: payload.enabled,
          createdBy: actorId,
          updatedBy: actorId,
        },
        include: {
          creator: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          updater: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      await this.auditService.log({
        actorId,
        action: 'admin.prompts.create',
        targetType: 'PromptTemplate',
        targetId: created.id,
        diff: {
          key: payload.key,
          scene: payload.scene,
        },
        request,
      });

      return this.mapTemplate(created);
    } catch (error: unknown) {
      this.handleConflict(error, 'Prompt key + scene already exists');
      throw error;
    }
  }

  async update(actorId: string, id: string, body: PromptPayload, request: Request) {
    const existing = await this.prisma.promptTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Prompt template not found');
    }

    const payload = this.normalizePayload(body, false);

    try {
      const updated = await this.prisma.promptTemplate.update({
        where: { id },
        data: {
          key: payload.key,
          scene: payload.scene,
          content: payload.content,
          variables: payload.variables,
          enabled: payload.enabled,
          updatedBy: actorId,
        },
        include: {
          creator: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          updater: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      await this.auditService.log({
        actorId,
        action: 'admin.prompts.update',
        targetType: 'PromptTemplate',
        targetId: id,
        diff: {
          before: {
            key: existing.key,
            scene: existing.scene,
            enabled: existing.enabled,
          },
          after: {
            key: updated.key,
            scene: updated.scene,
            enabled: updated.enabled,
          },
        },
        request,
      });

      return this.mapTemplate(updated);
    } catch (error: unknown) {
      this.handleConflict(error, 'Prompt key + scene already exists');
      throw error;
    }
  }

  async remove(actorId: string, id: string, request: Request) {
    const existing = await this.prisma.promptTemplate.findUnique({
      where: { id },
      select: {
        id: true,
        key: true,
        scene: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Prompt template not found');
    }

    await this.prisma.promptTemplate.delete({
      where: { id },
    });

    await this.auditService.log({
      actorId,
      action: 'admin.prompts.delete',
      targetType: 'PromptTemplate',
      targetId: id,
      diff: {
        key: existing.key,
        scene: existing.scene,
      },
      request,
    });

    return { deleted: true };
  }

  async test(id: string, body: { variables?: Record<string, unknown> }) {
    const template = await this.prisma.promptTemplate.findUnique({
      where: { id },
      select: {
        id: true,
        key: true,
        scene: true,
        content: true,
        variables: true,
      },
    });

    if (!template) {
      throw new NotFoundException('Prompt template not found');
    }

    const allowedVariables = this.readVariables(template.variables);
    const provided = body.variables || {};
    const rendered = this.renderTemplate(template.content, provided);
    const missingVariables = allowedVariables.filter(
      (name) => !(name in provided) || provided[name] === undefined || provided[name] === null,
    );

    return {
      templateId: template.id,
      key: template.key,
      scene: template.scene,
      prompt: rendered,
      missingVariables,
    };
  }

  private normalizePayload(body: PromptPayload, requireAll = true) {
    const key = body.key?.trim();
    const scene = body.scene?.trim();
    const content = body.content?.trim();

    if (requireAll) {
      if (!key || !scene || !content) {
        throw new BadRequestException('key, scene and content are required');
      }
    }

    if (!requireAll) {
      if (body.key !== undefined && !key) {
        throw new BadRequestException('key cannot be empty');
      }
      if (body.scene !== undefined && !scene) {
        throw new BadRequestException('scene cannot be empty');
      }
      if (body.content !== undefined && !content) {
        throw new BadRequestException('content cannot be empty');
      }
    }

    if (body.variables !== undefined && !Array.isArray(body.variables)) {
      throw new BadRequestException('variables must be string array');
    }

    if (Array.isArray(body.variables) && body.variables.some((item) => typeof item !== 'string')) {
      throw new BadRequestException('variables must be string array');
    }

    return {
      key,
      scene,
      content,
      variables: body.variables,
      enabled: body.enabled,
    };
  }

  private renderTemplate(template: string, variables: Record<string, unknown>): string {
    return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, varName: string) => {
      const value = variables[varName];
      if (value === undefined || value === null) {
        return '';
      }
      return String(value);
    });
  }

  private readVariables(value: Prisma.JsonValue): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.filter((item): item is string => typeof item === 'string');
  }

  private mapTemplate(row: {
    id: string;
    key: string;
    scene: string;
    content: string;
    variables: Prisma.JsonValue;
    enabled: boolean;
    createdBy: string;
    updatedBy: string;
    createdAt: Date;
    updatedAt: Date;
    creator?: {
      id: string;
      email: string;
      name: string;
    };
    updater?: {
      id: string;
      email: string;
      name: string;
    };
  }) {
    return {
      id: row.id,
      key: row.key,
      scene: row.scene,
      content: row.content,
      variables: row.variables,
      enabled: row.enabled,
      createdBy: row.createdBy,
      updatedBy: row.updatedBy,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      creator: row.creator,
      updater: row.updater,
    };
  }

  private handleConflict(error: unknown, message: string) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(message);
    }
  }
}

@Controller('admin/prompts')
@UseGuards(JwtAuthGuard, AdminGuard)
class AdminPromptsController {
  constructor(private readonly promptsService: AdminPromptsService) {}

  @Get('bindings')
  listModelBindings() {
    return this.promptsService.listModelBindings();
  }

  @Get()
  list(
    @Query('keyword') keyword?: string,
    @Query('scene') scene?: string,
    @Query('enabled') enabled?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.promptsService.list({
      keyword,
      scene,
      enabled,
      page: Number.parseInt(page || '1', 10),
      pageSize: Number.parseInt(pageSize || '20', 10),
    });
  }

  @Post()
  create(
    @CurrentUser() user: { sub: string },
    @Body() body: PromptPayload,
    @Req() request: Request,
  ) {
    return this.promptsService.create(user.sub, body, request);
  }

  @Put(':id')
  update(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() body: PromptPayload,
    @Req() request: Request,
  ) {
    return this.promptsService.update(user.sub, id, body, request);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Req() request: Request,
  ) {
    return this.promptsService.remove(user.sub, id, request);
  }

  @Post(':id/test')
  test(
    @Param('id') id: string,
    @Body() body: { variables?: Record<string, unknown> },
  ) {
    return this.promptsService.test(id, body);
  }
}

@Module({
  imports: [AdminAuditModule],
  controllers: [AdminPromptsController],
  providers: [AdminPromptsService, AdminGuard],
})
export class AdminPromptsModule {}