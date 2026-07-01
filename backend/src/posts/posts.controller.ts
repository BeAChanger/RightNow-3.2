import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PostsService } from './posts.service';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  list(@CurrentUser('sub') userId: string) {
    return this.postsService.list();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postsService.findOne(id);
  }

  @Post()
  create(@CurrentUser('sub') userId: string, @Body() body: { content?: string; images?: string[]; trainingData?: any }) {
    return this.postsService.create(userId, body);
  }

  @Delete(':id')
  remove(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.postsService.remove(userId, id);
  }

  @Post(':id/like')
  toggleLike(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.postsService.toggleLike(userId, id);
  }

  @Get(':id/comments')
  getComments(@Param('id') id: string) {
    return this.postsService.getComments(id);
  }

  @Post(':id/comments')
  addComment(@CurrentUser('sub') userId: string, @Param('id') id: string, @Body() body: { content: string }) {
    return this.postsService.addComment(userId, id, body.content);
  }

  @Post('from-training')
  createFromTraining(@CurrentUser('sub') userId: string, @Body() body: { trainingRecordId?: string; content?: string; images?: string[] }) {
    return this.postsService.createFromTraining(userId, body);
  }
}

@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly postsService: PostsService) {}

  @Delete(':commentId')
  removeComment(@CurrentUser('sub') userId: string, @Param('commentId') commentId: string) {
    return this.postsService.removeComment(userId, commentId);
  }
}
