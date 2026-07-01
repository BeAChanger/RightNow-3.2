import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WechatController } from './wechat.controller';
import { WechatService } from './wechat.service';

@Module({
  imports: [PrismaModule],
  controllers: [WechatController],
  providers: [WechatService],
  exports: [WechatService],
})
export class WechatModule {}
