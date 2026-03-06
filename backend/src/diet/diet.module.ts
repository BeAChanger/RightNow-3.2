import { Module } from '@nestjs/common';
import { DietController } from './diet.controller';
import { DietService } from './diet.service';
import { DietCleanupService } from './diet-cleanup.service';
import { AiModule } from '../ai/ai.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [AiModule, UploadModule],
  controllers: [DietController],
  providers: [DietService, DietCleanupService],
  exports: [DietService],
})
export class DietModule {}
