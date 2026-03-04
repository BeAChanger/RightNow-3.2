import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, page = 1, limit = 10) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const [total, posts] = await Promise.all([
      this.prisma.post.count(),
      this.prisma.post.findMany({
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: true,
          _count: {
            select: { comments: true },
          },
        },
      }),
    ]);

    return {
      data: posts.map((post) => this.mapPost(post, userId)),
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  async get(userId: string, id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        author: true,
        _count: {
          select: { comments: true },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return this.mapPost(post, userId);
  }

  async create(
    userId: string,
    body: { content: string; images?: string[]; tags?: string[] },
  ) {
    if (!body.content?.trim()) {
      throw new BadRequestException('content is required');
    }

    const post = await this.prisma.post.create({
      data: {
        userId,
        content: body.content.trim(),
        images: Array.isArray(body.images) ? body.images : [],
        tags: Array.isArray(body.tags) ? body.tags : [],
      },
      include: {
        author: true,
        _count: {
          select: { comments: true },
        },
      },
    });

    return this.mapPost(post, userId);
  }

  async createFromTrainingRecord(
    userId: string,
    body: {
      trainingRecordId: string;
      content: string;
      images?: string[];
      tags?: string[];
    }
  ) {
    const record = await this.prisma.trainingRecord.findFirst({
      where: { id: body.trainingRecordId, userId },
      include: { setDetails: true }
    });

    if (!record) {
      throw new NotFoundException('Training record not found');
    }

    const post = await this.prisma.post.create({
      data: {
        userId,
        content: body.content,
        images: body.images || (record.photoUrl ? [record.photoUrl] : []),
        tags: body.tags || ['训练打卡'],
        sourceType: 'training_record',
        sourceRecordId: record.id,
        structuredData: {
          exercises: record.setDetails.map(s => ({
            name: s.exerciseName,
            sets: s.setNumber,
            reps: s.reps,
            weight: s.weight
          }))
        }
      },
      include: {
        author: true,
        _count: {
          select: { comments: true },
        },
      },
    });

    await this.prisma.aiFeedbackCard.updateMany({
      where: { trainingRecordId: record.id },
      data: { sharedToPostId: post.id }
    });

    return this.mapPost(post, userId);
  }

  async remove(userId: string, id: string) {
    const post = await this.prisma.post.findFirst({
      where: { id, userId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    await this.prisma.post.delete({
      where: { id },
    });

    return { deleted: true };
  }

  async toggleLike(userId: string, id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const alreadyLiked = post.likedUserIds.includes(userId);
    const likedUserIds = alreadyLiked
      ? post.likedUserIds.filter((value) => value !== userId)
      : [...post.likedUserIds, userId];

    await this.prisma.post.update({
      where: { id },
      data: { likedUserIds },
    });

    return {
      liked: !alreadyLiked,
      likes: likedUserIds.length,
    };
  }

  async getComments(postId: string) {
    const comments = await this.prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      include: { author: true },
    });

    return comments.map((comment) => this.mapComment(comment));
  }

  async addComment(userId: string, postId: string, content: string) {
    if (!content?.trim()) {
      throw new BadRequestException('content is required');
    }

    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const comment = await this.prisma.comment.create({
      data: {
        userId,
        postId,
        content: content.trim(),
      },
      include: { author: true },
    });

    return this.mapComment(comment);
  }

  async removeComment(userId: string, id: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
    });

    if (!comment || comment.userId !== userId) {
      throw new NotFoundException('Comment not found');
    }

    await this.prisma.comment.delete({
      where: { id },
    });

    return { deleted: true };
  }

  private mapPost(
    post: {
      id: string;
      content: string;
      images: string[];
      tags: string[];
      likedUserIds: string[];
      createdAt: Date;
      author: { id: string; name: string; avatar: string | null };
      _count: { comments: number };
    },
    currentUserId: string,
  ) {
    return {
      id: post.id,
      content: post.content,
      images: post.images,
      tags: post.tags,
      author: {
        id: post.author.id,
        name: post.author.name,
        avatar: post.author.avatar ?? undefined,
      },
      likes: post.likedUserIds.length,
      liked: post.likedUserIds.includes(currentUserId),
      commentCount: post._count.comments,
      createdAt: post.createdAt.toISOString(),
    };
  }

  private mapComment(comment: {
    id: string;
    content: string;
    createdAt: Date;
    author: { id: string; name: string; avatar: string | null };
  }) {
    return {
      id: comment.id,
      content: comment.content,
      author: {
        id: comment.author.id,
        name: comment.author.name,
        avatar: comment.author.avatar ?? undefined,
      },
      createdAt: comment.createdAt.toISOString(),
    };
  }
}

@Controller('posts')
@UseGuards(JwtAuthGuard)
class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  list(
    @CurrentUser() user: { sub: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.postsService.list(
      user.sub,
      Number.parseInt(page || '1', 10),
      Number.parseInt(limit || '10', 10),
    );
  }

  @Get(':id')
  get(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.postsService.get(user.sub, id);
  }

  @Post()
  create(
    @CurrentUser() user: { sub: string },
    @Body() body: { content: string; images?: string[]; tags?: string[] },
  ) {
    return this.postsService.create(user.sub, body);
  }

  @Post('from-training')
  createFromTraining(
    @CurrentUser() user: { sub: string },
    @Body() body: {
      trainingRecordId: string;
      content: string;
      images?: string[];
      tags?: string[];
    }
  ) {
    return this.postsService.createFromTrainingRecord(user.sub, body);
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
class CommentsController {
  constructor(private readonly postsService: PostsService) {}

  @Delete(':id')
  remove(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.postsService.removeComment(user.sub, id);
  }
}

@Module({
  controllers: [PostsController, CommentsController],
  providers: [PostsService],
})
export class PostsModule {}
