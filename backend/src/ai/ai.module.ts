import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AiService } from './ai.service';
import { BodyFatEnsembleService } from './body-fat-ensemble.service';

@Module({
  imports: [PrismaModule],
  providers: [AiService, BodyFatEnsembleService],
  exports: [AiService, BodyFatEnsembleService],
})
export class AiModule {}
