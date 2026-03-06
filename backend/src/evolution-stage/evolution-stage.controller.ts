import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { EvolutionStageService } from './evolution-stage.service';

@Controller('evolution-stage')
@UseGuards(JwtAuthGuard)
export class EvolutionStageController {
  constructor(private readonly service: EvolutionStageService) {}

  @Get()
  async list(@CurrentUser() user: { sub: string }) {
    return this.service.getStages(user.sub);
  }

  @Post('assess/:recordId')
  async assess(@CurrentUser() user: { sub: string }, @Param('recordId') recordId: string) {
    return this.service.assessUpload(user.sub, recordId);
  }
}
