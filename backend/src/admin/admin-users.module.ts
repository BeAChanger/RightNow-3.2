import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAuditModule, AdminAuditService } from './admin-audit.module';
import { AdminGuard } from './admin.guard';

@Injectable()
class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AdminAuditService,
  ) {}

  async list(params: {
    keyword?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Number.isFinite(params.page) ? Math.max(1, params.page || 1) : 1;
    const pageSize = Number.isFinite(params.pageSize)
      ? Math.min(100, Math.max(1, params.pageSize || 20))
      : 20;

    const where: Prisma.UserWhereInput = {};

    if (params.keyword?.trim()) {
      const keyword = params.keyword.trim();
      where.OR = [
        { email: { contains: keyword, mode: 'insensitive' } },
        { name: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    if (params.status?.trim()) {
      const normalizedStatus = params.status.trim().toUpperCase();
      if (normalizedStatus !== UserStatus.ACTIVE && normalizedStatus !== UserStatus.FROZEN) {
        throw new BadRequestException('status must be ACTIVE or FROZEN');
      }
      where.status = normalizedStatus as UserStatus;
    }

    const [total, rows] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          isProfileComplete: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    };
  }

  async updateStatus(params: {
    actorId: string;
    userId: string;
    status: UserStatus;
    request: Request;
  }) {
    const user = await this.prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        id: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (params.actorId === params.userId && params.status === UserStatus.FROZEN) {
      throw new ForbiddenException('You cannot freeze your own account');
    }

    const updated = await this.prisma.user.update({
      where: { id: params.userId },
      data: { status: params.status },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        isProfileComplete: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.auditService.log({
      actorId: params.actorId,
      action: 'admin.users.update_status',
      targetType: 'User',
      targetId: params.userId,
      diff: {
        beforeStatus: user.status,
        afterStatus: params.status,
      },
      request: params.request,
    });

    return {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}

@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
class AdminUsersController {
  constructor(private readonly usersService: AdminUsersService) {}

  @Get()
  list(
    @Query('keyword') keyword?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.usersService.list({
      keyword,
      status,
      page: Number.parseInt(page || '1', 10),
      pageSize: Number.parseInt(pageSize || '20', 10),
    });
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() body: { status: UserStatus },
    @Req() request: Request,
  ) {
    if (body.status !== UserStatus.ACTIVE && body.status !== UserStatus.FROZEN) {
      throw new BadRequestException('status must be ACTIVE or FROZEN');
    }

    return this.usersService.updateStatus({
      actorId: user.sub,
      userId: id,
      status: body.status,
      request,
    });
  }
}

@Module({
  imports: [AdminAuditModule],
  controllers: [AdminUsersController],
  providers: [AdminUsersService, AdminGuard],
})
export class AdminUsersModule {}

