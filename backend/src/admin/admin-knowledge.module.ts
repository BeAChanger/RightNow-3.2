import {
  BadGatewayException,
  BadRequestException,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAuditModule, AdminAuditService } from './admin-audit.module';
import { AdminGuard } from './admin.guard';

interface RagSource {
  source: string;
  domain?: string;
  chunks?: number;
}

@Injectable()
class AdminKnowledgeService {
  private readonly ragServiceUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly auditService: AdminAuditService,
  ) {
    this.ragServiceUrl = this.configService.get<string>(
      'RAG_SERVICE_URL',
      'http://localhost:8000',
    );
  }

  async upload(params: {
    actorId: string;
    file: Express.Multer.File;
    domain?: string;
    request: Request;
  }) {
    if (!params.file) {
      throw new BadRequestException('file is required');
    }

    const domain = params.domain?.trim() || 'general';
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(params.file.buffer)], {
      type: params.file.mimetype,
    });
    formData.append('file', blob, params.file.originalname);

    const ragResponse = await this.callRag(`/import/file?domain=${encodeURIComponent(domain)}`, {
      method: 'POST',
      body: formData,
    });

    const sourceName = String(ragResponse.source || params.file.originalname);
    const chunksCount = Number.parseInt(String(ragResponse.chunks_added || 0), 10) || 0;
    const fileType = this.extractFileType(sourceName, params.file.mimetype);

    const record = await this.prisma.knowledgeSource.upsert({
      where: { sourceName },
      update: {
        domain,
        fileType,
        chunksCount,
        status: 'ACTIVE',
        uploadedBy: params.actorId,
      },
      create: {
        sourceName,
        domain,
        fileType,
        chunksCount,
        status: 'ACTIVE',
        uploadedBy: params.actorId,
      },
    });

    await this.auditService.log({
      actorId: params.actorId,
      action: 'admin.knowledge.upload',
      targetType: 'KnowledgeSource',
      targetId: record.id,
      diff: {
        sourceName,
        domain,
        chunksCount,
      },
      request: params.request,
    });

    return {
      id: record.id,
      sourceName: record.sourceName,
      domain: record.domain,
      fileType: record.fileType ?? undefined,
      chunksCount: record.chunksCount,
      status: record.status,
      uploadedBy: record.uploadedBy ?? undefined,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      rag: ragResponse,
    };
  }

  async listSources() {
    const ragResponse = await this.callRag('/documents/sources', {
      method: 'GET',
    });

    const ragSources = Array.isArray(ragResponse.sources)
      ? (ragResponse.sources as RagSource[])
      : [];

    const activeSourceNames = ragSources.map((item) => String(item.source));

    await Promise.all(
      ragSources.map((item) => {
        const sourceName = String(item.source);
        const domain = item.domain?.trim() || 'general';
        const chunksCount = Number.parseInt(String(item.chunks || 0), 10) || 0;

        return this.prisma.knowledgeSource.upsert({
          where: { sourceName },
          update: {
            domain,
            chunksCount,
            status: 'ACTIVE',
            fileType: this.extractFileType(sourceName),
          },
          create: {
            sourceName,
            domain,
            chunksCount,
            status: 'ACTIVE',
            fileType: this.extractFileType(sourceName),
          },
        });
      }),
    );

    await this.prisma.knowledgeSource.updateMany({
      where: {
        sourceName: { notIn: activeSourceNames },
        status: { not: 'DELETED' },
      },
      data: {
        status: 'DELETED',
        chunksCount: 0,
      },
    });

    const rows = await this.prisma.knowledgeSource.findMany({
      include: {
        uploader: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return {
      items: rows.map((row) => ({
        id: row.id,
        sourceName: row.sourceName,
        domain: row.domain,
        fileType: row.fileType ?? undefined,
        chunksCount: row.chunksCount,
        status: row.status,
        uploadedBy: row.uploadedBy ?? undefined,
        uploader: row.uploader ?? undefined,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
    };
  }

  async deleteBySource(params: {
    actorId: string;
    sourceName: string;
    request: Request;
  }) {
    const sourceName = params.sourceName.trim();
    if (!sourceName) {
      throw new BadRequestException('sourceName is required');
    }

    const response = await this.callRag(`/documents/by-source/${encodeURIComponent(sourceName)}`, {
      method: 'DELETE',
    });

    await this.prisma.knowledgeSource.updateMany({
      where: { sourceName },
      data: {
        status: 'DELETED',
        chunksCount: 0,
      },
    });
    const chunksDeleted = Number.parseInt(
      String(response.chunks_deleted ?? 0),
      10,
    ) || 0;

    await this.auditService.log({
      actorId: params.actorId,
      action: 'admin.knowledge.delete_source',
      targetType: 'KnowledgeSource',
      targetId: sourceName,
      diff: {
        chunksDeleted,
      },
      request: params.request,
    });

    return response;
  }

  async rescan(params: {
    actorId: string;
    force: boolean;
    request: Request;
  }) {
    const response = await this.callRag(
      `/import/rescan?force=${params.force ? 'true' : 'false'}`,
      {
        method: 'POST',
      },
    );

    await this.listSources();
    const filesProcessed = Number.parseInt(
      String(response.files_processed ?? 0),
      10,
    ) || 0;
    const chunksAdded = Number.parseInt(
      String(response.chunks_added ?? 0),
      10,
    ) || 0;

    await this.auditService.log({
      actorId: params.actorId,
      action: 'admin.knowledge.rescan',
      targetType: 'KnowledgeSource',
      diff: {
        force: params.force,
        filesProcessed,
        chunksAdded,
      },
      request: params.request,
    });

    return response;
  }

  private extractFileType(sourceName: string, mimeType?: string): string {
    const lower = sourceName.toLowerCase();
    if (lower.endsWith('.pdf')) {
      return 'pdf';
    }
    if (lower.endsWith('.md')) {
      return 'markdown';
    }

    if (mimeType) {
      return mimeType;
    }

    return 'unknown';
  }

  private async callRag(path: string, init: RequestInit): Promise<Record<string, unknown>> {
    const url = `${this.ragServiceUrl}${path}`;

    let response: Response;
    try {
      response = await fetch(url, init);
    } catch {
      throw new BadGatewayException('RAG service is unavailable');
    }

    let payload: Record<string, unknown> = {};
    const text = await response.text();
    if (text) {
      try {
        payload = JSON.parse(text) as Record<string, unknown>;
      } catch {
        payload = { message: text };
      }
    }

    if (!response.ok) {
      const message = typeof payload.message === 'string'
        ? payload.message
        : `RAG service request failed with status ${response.status}`;
      throw new BadGatewayException(message);
    }

    return payload;
  }
}

@Controller('admin/knowledge')
@UseGuards(JwtAuthGuard, AdminGuard)
class AdminKnowledgeController {
  constructor(private readonly knowledgeService: AdminKnowledgeService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  upload(
    @CurrentUser() user: { sub: string },
    @UploadedFile() file?: Express.Multer.File,
    @Query('domain') domain?: string,
    @Req() request?: Request,
  ) {
    if (!file) {
      throw new BadRequestException('file is required');
    }

    return this.knowledgeService.upload({
      actorId: user.sub,
      file,
      domain,
      request: request as Request,
    });
  }

  @Get('sources')
  listSources() {
    return this.knowledgeService.listSources();
  }

  @Delete('sources/:sourceName')
  deleteBySource(
    @CurrentUser() user: { sub: string },
    @Param('sourceName') sourceName: string,
    @Req() request: Request,
  ) {
    return this.knowledgeService.deleteBySource({
      actorId: user.sub,
      sourceName,
      request,
    });
  }

  @Post('rescan')
  rescan(
    @CurrentUser() user: { sub: string },
    @Query('force') force?: string,
    @Req() request?: Request,
  ) {
    return this.knowledgeService.rescan({
      actorId: user.sub,
      force: force === 'true',
      request: request as Request,
    });
  }
}

@Module({
  imports: [AdminAuditModule],
  controllers: [AdminKnowledgeController],
  providers: [AdminKnowledgeService, AdminGuard],
})
export class AdminKnowledgeModule {}




