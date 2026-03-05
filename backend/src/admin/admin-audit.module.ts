import {
  Controller,
  Get,
  Injectable,
  Module,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AdminGuard } from './admin.guard';

interface AuditLogPayload {
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string;
  diff?: Prisma.InputJsonValue;
  request?: Request;
}

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(payload: AuditLogPayload) {
    const userAgentHeader = payload.request?.headers['user-agent'];
    const userAgent = Array.isArray(userAgentHeader)
      ? userAgentHeader[0]
      : userAgentHeader;

    await this.prisma.adminAuditLog.create({
      data: {
        actorId: payload.actorId,
        action: payload.action,
        targetType: payload.targetType,
        targetId: payload.targetId,
        diff: payload.diff,
        ip: payload.request?.ip,
        userAgent,
      },
    });
  }

  async list(params: {
    action?: string;
    actorId?: string;
    start?: string;
    end?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Number.isFinite(params.page) ? Math.max(1, params.page || 1) : 1;
    const pageSize = Number.isFinite(params.pageSize)
      ? Math.min(100, Math.max(1, params.pageSize || 20))
      : 20;

    const where: Prisma.AdminAuditLogWhereInput = {};

    if (params.action?.trim()) {
      where.action = { contains: params.action.trim(), mode: 'insensitive' };
    }

    if (params.actorId?.trim()) {
      where.actorId = params.actorId.trim();
    }

    const startDate = this.parseDate(params.start);
    const endDate = this.parseDate(params.end);
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    const [total, rows] = await Promise.all([
      this.prisma.adminAuditLog.count({ where }),
      this.prisma.adminAuditLog.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        actorId: row.actorId,
        action: row.action,
        targetType: row.targetType,
        targetId: row.targetId ?? undefined,
        diff: row.diff ?? undefined,
        ip: row.ip ?? undefined,
        userAgent: row.userAgent ?? undefined,
        createdAt: row.createdAt.toISOString(),
        actor: {
          id: row.actor.id,
          email: row.actor.email,
          name: row.actor.name,
          role: row.actor.role,
        },
      })),
      total,
      page,
      pageSize,
    };
  }

  private parseDate(value?: string): Date | undefined {
    if (!value) {
      return undefined;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return undefined;
    }

    return parsed;
  }
}

@Controller('admin/audit')
@UseGuards(JwtAuthGuard, AdminGuard)
class AdminAuditController {
  constructor(private readonly auditService: AdminAuditService) {}

  @Get()
  list(
    @CurrentUser() _user: { sub: string },
    @Query('action') action?: string,
    @Query('actorId') actorId?: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.auditService.list({
      action,
      actorId,
      start,
      end,
      page: Number.parseInt(page || '1', 10),
      pageSize: Number.parseInt(pageSize || '20', 10),
    });
  }
}

@Module({
  controllers: [AdminAuditController],
  providers: [AdminAuditService, AdminGuard],
  exports: [AdminAuditService],
})
export class AdminAuditModule {}

