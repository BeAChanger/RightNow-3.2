import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { DietService } from './diet.service';

@Controller('diet')
@UseGuards(JwtAuthGuard)
export class DietController {
  constructor(private readonly dietService: DietService) {}

  @Get()
  list(@CurrentUser('id') userId: string, @Query('date') date?: string) {
    return this.dietService.list(userId, date);
  }

  @Get('summary')
  summary(@CurrentUser('id') userId: string, @Query('date') date?: string) {
    return this.dietService.summary(userId, date);
  }

  @Post('analyze/text')
  analyzeText(@Body() body: { foodName?: string; description?: string }) {
    return this.dietService.analyzeText(body);
  }

  @Post('analyze/image')
  analyzeImage(@Body() body: { imageBase64?: string }) {
    return this.dietService.analyzeImage(body);
  }

  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() body: {
      name?: string;
      calories?: number;
      fat?: number;
      protein?: number;
      carbs?: number;
      date?: string;
      mealType?: string;
    },
  ) {
    return this.dietService.create(userId, body);
  }

  @Put(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      calories?: number;
      fat?: number;
      protein?: number;
      carbs?: number;
      date?: string;
      mealType?: string;
    },
  ) {
    return this.dietService.update(userId, id, body);
  }

  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.dietService.remove(userId, id);
  }
  @Post("estimate-before-meal")
  estimateBeforeMeal(@Body() body: { imageBase64?: string }) {
    return this.dietService.estimateBeforeMeal(body);
  }
}
