import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AiService } from './ai.service';

@Module({
  imports: [PrismaModule],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}