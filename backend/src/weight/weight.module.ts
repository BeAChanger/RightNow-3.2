import {
  BadRequestException,
  Body,
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
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
class WeightService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, from?: string, to?: string) {
    const where: {
      userId: string;
      date?: { gte?: string; lte?: string };
    } = { userId };

    if (from || to) {
      where.date = {};
      if (from) {
        where.date.gte = from;
      }
      if (to) {
        where.date.lte = to;
      }
    }

    const records = await this.prisma.weightRecord.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });

    return records.map((record) => this.mapRecord(record));
  }

  async create(
    userId: string,
    body: { date?: string; weight: number; waist?: number; hip?: number },
  ) {
    const weight = this.parseRequiredNumber(body.weight, 'weight');
    const waist = this.parseOptionalNumber(body.waist);
    const hip = this.parseOptionalNumber(body.hip);
    const date = body.date || new Date().toISOString().slice(0, 10);

    const record = await this.prisma.weightRecord.create({
      data: {
        userId,
        date,
        weight,
        waist,
        hip,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { weight },
    });

    return this.mapRecord(record);
  }

  async update(
    userId: string,
    id: string,
    body: { date?: string; weight: number; waist?: number; hip?: number },
  ) {
    const existing = await this.prisma.weightRecord.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Weight record not found');
    }

    const weight = this.parseRequiredNumber(body.weight, 'weight');
    const waist = this.parseOptionalNumber(body.waist);
    const hip = this.parseOptionalNumber(body.hip);

    const record = await this.prisma.weightRecord.update({
      where: { id },
      data: {
        date: body.date || existing.date,
        weight,
        waist,
        hip,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { weight },
    });

    return this.mapRecord(record);
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.weightRecord.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Weight record not found');
    }

    await this.prisma.weightRecord.delete({
      where: { id },
    });

    return { deleted: true };
  }

  private parseRequiredNumber(value: unknown, field: string): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new BadRequestException(`${field} must be a positive number`);
    }
    return parsed;
  }

  private parseOptionalNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new BadRequestException('Numeric value is invalid');
    }
    return parsed;
  }

  private mapRecord(record: {
    id: string;
    date: string;
    weight: number;
    waist: number | null;
    hip: number | null;
  }) {
    return {
      id: record.id,
      date: record.date,
      weight: record.weight,
      waist: record.waist ?? undefined,
      hip: record.hip ?? undefined,
    };
  }
}

@Controller('weight')
@UseGuards(JwtAuthGuard)
class WeightController {
  constructor(private readonly weightService: WeightService) {}

  @Get()
  list(
    @CurrentUser() user: { sub: string },
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.weightService.list(user.sub, from, to);
  }

  @Post()
  create(
    @CurrentUser() user: { sub: string },
    @Body() body: { date?: string; weight: number; waist?: number; hip?: number },
  ) {
    return this.weightService.create(user.sub, body);
  }

  @Put(':id')
  update(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() body: { date?: string; weight: number; waist?: number; hip?: number },
  ) {
    return this.weightService.update(user.sub, id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.weightService.remove(user.sub, id);
  }
}

@Module({
  controllers: [WeightController],
  providers: [WeightService],
})
export class WeightModule {}
