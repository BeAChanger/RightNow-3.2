import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
class FitnessPlanService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(userId: string, data: {
    exerciseBase?: string;
    dietHabit?: string;
    sleepPattern?: string;
    occupation?: string;
    mealPlan?: string;
    waterPlan?: string;
    trainingPlan?: string;
    aiSummary?: string;
  }) {
    const existing = await this.prisma.fitnessPlan.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      return this.prisma.fitnessPlan.update({
        where: { id: existing.id },
        data,
      });
    }

    return this.prisma.fitnessPlan.create({
      data: { userId, ...data },
    });
  }

  async findLatest(userId: string) {
    return this.prisma.fitnessPlan.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

@Controller('fitness-plan')
@UseGuards(JwtAuthGuard)
class FitnessPlanController {
  constructor(private readonly service: FitnessPlanService) {}

  @Post()
  upsert(
    @CurrentUser() user: { sub: string },
    @Body() body: Record<string, string>,
  ) {
    return this.service.upsert(user.sub, body);
  }

  @Get()
  latest(@CurrentUser() user: { sub: string }) {
    return this.service.findLatest(user.sub);
  }
}

@Module({
  controllers: [FitnessPlanController],
  providers: [FitnessPlanService],
})
export class FitnessPlanModule {}
