import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
class CheckinsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, from?: string, to?: string) {
    const where: {
      userId: string;
      createdAt?: { gte?: Date; lte?: Date };
    } = { userId };

    if (from || to) {
      where.createdAt = {};
      if (from) {
        where.createdAt.gte = new Date(`${from}T00:00:00.000Z`);
      }
      if (to) {
        where.createdAt.lte = new Date(`${to}T23:59:59.999Z`);
      }
    }

    const records = await this.prisma.checkIn.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return records.map((record) => this.mapRecord(record));
  }

  async create(userId: string, body: { type: string; note?: string }) {
    if (!body.type?.trim()) {
      throw new BadRequestException('type is required');
    }

    const record = await this.prisma.checkIn.create({
      data: {
        userId,
        type: body.type.trim(),
        note: body.note?.trim() || null,
      },
    });

    return this.mapRecord(record);
  }

  async latest(userId: string) {
    const record = await this.prisma.checkIn.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return record ? this.mapRecord(record) : null;
  }

  private mapRecord(record: {
    id: string;
    type: string;
    note: string | null;
    createdAt: Date;
  }) {
    return {
      id: record.id,
      type: record.type,
      note: record.note ?? undefined,
      createdAt: record.createdAt.toISOString(),
    };
  }
}

@Controller('checkins')
@UseGuards(JwtAuthGuard)
class CheckinsController {
  constructor(private readonly checkinsService: CheckinsService) {}

  @Get()
  list(
    @CurrentUser() user: { sub: string },
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.checkinsService.list(user.sub, from, to);
  }

  @Post()
  create(@CurrentUser() user: { sub: string }, @Body() body: { type: string; note?: string }) {
    return this.checkinsService.create(user.sub, body);
  }

  @Get('latest')
  latest(@CurrentUser() user: { sub: string }) {
    return this.checkinsService.latest(user.sub);
  }
}

@Module({
  controllers: [CheckinsController],
  providers: [CheckinsService],
})
export class CheckinsModule {}
