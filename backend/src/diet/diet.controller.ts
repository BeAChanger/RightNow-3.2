import { Controller, Post, Get, Delete, Body, Param, Query, UseGuards, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { imageUploadOptions } from '../common/upload.util';
import { DietService } from './diet.service';
import { AnalyzeTextDto } from './dto/analyze-text.dto';
import { ConfirmRecordDto } from './dto/confirm-record.dto';

@Controller('diet')
@UseGuards(JwtAuthGuard)
export class DietController {
  constructor(private readonly dietService: DietService) {}

  @Post('analyze-photo')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  async analyzePhoto(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.dietService.analyzePhoto(userId, file);
  }

  @Post('analyze-text')
  async analyzeText(
    @CurrentUser('id') userId: string,
    @Body() dto: AnalyzeTextDto,
  ) {
    return this.dietService.analyzeText(userId, dto.name, dto.description);
  }

  @Post('records')
  async confirmRecord(
    @CurrentUser('id') userId: string,
    @Body() dto: ConfirmRecordDto,
  ) {
    return this.dietService.confirmRecord(userId, dto.draftId, {
      calories: dto.calories,
      protein: dto.protein,
      fat: dto.fat,
      carbs: dto.carbs,
    });
  }

  @Get('records')
  async getRecords(
    @CurrentUser('id') userId: string,
    @Query('date') date: string,
  ) {
    return this.dietService.getRecords(userId, date);
  }

  @Delete('records/:id')
  async deleteRecord(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.dietService.deleteRecord(userId, id);
  }

  @Get('calendar')
  async getCalendar(
    @CurrentUser('id') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.dietService.getCalendar(userId, startDate, endDate);
  }
}


