import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PostsService } from './posts.service';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  list(
    @CurrentUser() user: { sub: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('visibility') visibility?: string,
  ) {
    return this.postsService.list(
      user.sub,
      Number.parseInt(page || '1', 10),
      Number.parseInt(limit || '10', 10),
      visibility,
    );
  }

  @Get(':id')
  get(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.postsService.get(user.sub, id);
  }

  @Post()
  create(@CurrentUser() user: { sub: string }, @Body() body: any) {
    return this.postsService.create(user.sub, body);
  }

  @Post('draft/ai')
  generateAiDraft(@CurrentUser() user: { sub: string }) {
    return this.postsService.generateAiDraft(user.sub);
  }

  @Post('from-training/:recordId')
  generateFromTraining(
    @CurrentUser() user: { sub: string },
    @Param('recordId') recordId: string,
  ) {
    return this.postsService.generateFromTraining(user.sub, recordId);
  }

  @Delete(':id')
  remove(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.postsService.remove(user.sub, id);
  }

  @Post(':id/like')
  toggleLike(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.postsService.toggleLike(user.sub, id);
  }

  @Get(':id/comments')
  getComments(@Param('id') id: string) {
    return this.postsService.getComments(id);
  }

  @Post(':id/comments')
  addComment(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() body: { content: string },
  ) {
    return this.postsService.addComment(user.sub, id, body.content);
  }
}

@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly postsService: PostsService) {}

  @Delete(':id')
  remove(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.postsService.removeComment(user.sub, id);
  }
}
