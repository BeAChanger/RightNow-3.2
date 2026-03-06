import { Controller } from '@nestjs/common';
import { PostsService } from './posts.service';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}
}

@Controller('comments')
export class CommentsController {
  constructor(private readonly postsService: PostsService) {}
}
