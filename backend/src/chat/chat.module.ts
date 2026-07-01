import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PushService } from '../common/push.service';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { OpenClawModule } from '../openclaw/openclaw.module';

@Module({
  imports: [PrismaModule, OpenClawModule],
  controllers: [ChatController],
  providers: [ChatService, PushService],
  exports: [ChatService],
})
export class ChatModule {}
