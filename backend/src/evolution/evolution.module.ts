import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Logger,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { buildUploadUrl, imageUploadOptions } from '../common/upload.util';
import { PrismaService } from '../prisma/prisma.service';
import { EvolutionStageService } from '../evolution-stage/evolution-stage.service';
import { EvolutionStageModule } from '../evolution-stage/evolution-stage.module';

@Injectable()
class EvolutionService {
  private readonly logger = new Logger(EvolutionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly evolutionStageService?: EvolutionStageService,
  ) {}

  async list(userId: string) {
    const records = await this.prisma.evolutionRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((record) => this.mapRecord(record));
  }

  async create(userId: string, filename: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { weight: true },
    });

    const record = await this.prisma.evolutionRecord.create({
      data: {
        userId,
        imageUrl: buildUploadUrl(filename),
        weight: user?.weight ?? null,
        status: 'RECORD',
      },
    });

    if (this.evolutionStageService) {
      this.evolutionStageService.assessUpload(userId, record.id).catch((error) => {
        const message = error instanceof Error ? error.message : 'unknown error';
        this.logger.warn(`Assessment failed for record ${record.id}: ${message}`);
      });
    }

    return this.mapRecord(record);
  }

  async update(
    userId: string,
    id: string,
    body: { weight?: number; status?: string; note?: string },
  ) {
    const existing = await this.prisma.evolutionRecord.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Evolution record not found');
    }

    const record = await this.prisma.evolutionRecord.update({
      where: { id },
      data: {
        weight:
          body.weight === undefined ? undefined : this.parseOptionalNumber(body.weight),
        status: body.status?.trim() || undefined,
        note: body.note === undefined ? undefined : body.note?.trim() || null,
      },
    });

    return this.mapRecord(record);
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.evolutionRecord.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Evolution record not found');
    }

    await this.prisma.evolutionRecord.delete({
      where: { id },
    });

    return { deleted: true };
  }

  private parseOptionalNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new BadRequestException('weight must be numeric');
    }
    return parsed;
  }

  private mapRecord(record: {
    id: string;
    imageUrl: string;
    weight: number | null;
    status: string | null;
    note: string | null;
    createdAt: Date;
  }) {
    return {
      id: record.id,
      imageUrl: record.imageUrl,
      weight: record.weight ?? undefined,
      status: record.status ?? undefined,
      note: record.note ?? undefined,
      createdAt: record.createdAt.toISOString(),
    };
  }
}

@Controller('evolution')
@UseGuards(JwtAuthGuard)
class EvolutionController {
  constructor(private readonly evolutionService: EvolutionService) {}

  @Get()
  list(@CurrentUser() user: { sub: string }) {
    return this.evolutionService.list(user.sub);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  create(
    @CurrentUser() user: { sub: string },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('file is required');
    }

    return this.evolutionService.create(user.sub, file.filename);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() body: { weight?: number; status?: string; note?: string },
  ) {
    return this.evolutionService.update(user.sub, id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.evolutionService.remove(user.sub, id);
  }
}

@Module({
  imports: [EvolutionStageModule],
  controllers: [EvolutionController],
  providers: [EvolutionService],
})
export class EvolutionModule {}
