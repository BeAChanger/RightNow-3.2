import { Module } from '@nestjs/common';
import { PostsController, CommentsController } from './posts.controller';
import { PostsService } from './posts.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [PostsController, CommentsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
