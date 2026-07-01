import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TrainingSessionService } from './training-session.service';

@Controller('training-sessions')
@UseGuards(JwtAuthGuard)
export class TrainingSessionController {
  constructor(private readonly service: TrainingSessionService) {}

  @Post()
  create(@CurrentUser() user: { sub: string }) {
    return this.service.create(user.sub);
  }

  @Get(':id')
  findOne(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.service.findOne(id, user.sub);
  }

  @Patch(':id')
  updateLog(@CurrentUser() user: { sub: string }, @Param('id') id: string, @Body() body: { message: any }) {
    return this.service.updateLog(id, user.sub, body.message);
  }

  @Post(':id/complete')
  complete(@CurrentUser() user: { sub: string }, @Param('id') id: string, @Body() data: any) {
    return this.service.complete(id, user.sub, data);
  }

  @Delete(':id')
  cancel(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.service.cancel(id, user.sub);
  }
}
