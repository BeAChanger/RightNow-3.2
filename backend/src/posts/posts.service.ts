import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(page = 1, limit = 10) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const [total, items] = await Promise.all([
      this.prisma.post.count(),
      this.prisma.post.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
        include: {
          author: { select: { id: true, name: true, avatar: true } },
          _count: { select: { comments: true } },
        },
      }),
    ]);

    return {
      data: items.map((p) => ({
        id: p.id,
        content: p.content,
        images: p.images,
        likedUserIds: p.likedUserIds,
        likeCount: p.likedUserIds.length,
        commentCount: p._count.comments,
        tags: p.tags,
        author: p.author,
        createdAt: p.createdAt.toISOString(),
      })),
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  async findOne(id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { id: true, name: true, avatar: true } } },
        },
      },
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async create(userId: string, body: { content?: string; images?: string[]; tags?: string[] }) {
    return this.prisma.post.create({
      data: {
        userId,
        content: body.content || '',
        images: body.images || [],
        tags: body.tags || [],
      },
    });
  }

  async remove(userId: string, id: string) {
    const post = await this.prisma.post.findFirst({ where: { id, userId } });
    if (!post) throw new NotFoundException('Post not found');
    await this.prisma.post.delete({ where: { id } });
    return { ok: true };
  }

  async toggleLike(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    const already = post.likedUserIds.includes(userId);
    await this.prisma.post.update({
      where: { id: postId },
      data: already
        ? { likedUserIds: { set: post.likedUserIds.filter((id) => id !== userId) } }
        : { likedUserIds: { push: userId } },
    });
    return { ok: true, liked: !already };
  }

  async getComments(postId: string) {
    return this.prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { id: true, name: true, avatar: true } } },
    });
  }

  async addComment(userId: string, postId: string, content: string) {
    return this.prisma.comment.create({
      data: { userId, postId, content },
      include: { author: { select: { id: true, name: true, avatar: true } } },
    });
  }

  async removeComment(userId: string, commentId: string) {
    const c = await this.prisma.comment.findFirst({ where: { id: commentId, userId } });
    if (!c) throw new NotFoundException('Comment not found');
    await this.prisma.comment.delete({ where: { id: commentId } });
    return { ok: true };
  }

  async createFromTraining(userId: string, body: { trainingRecordId?: string; content?: string; images?: string[] }) {
    return this.prisma.post.create({
      data: {
        userId,
        content: body.content || '',
        images: body.images || [],
        sourceType: 'training_record',
        sourceRecordId: body.trainingRecordId,
      },
    });
  }
}
