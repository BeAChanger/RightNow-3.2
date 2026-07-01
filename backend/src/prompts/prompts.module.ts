import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PromptsController } from './prompts.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PromptsController],
})
export class PromptsModule {}
