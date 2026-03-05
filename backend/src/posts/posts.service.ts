import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  async list(userId: string, page = 1, limit = 10, visibility?: string) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const where: any = {};
    if (visibility === 'PUBLIC' || visibility === 'BUDDIES_ONLY') {
      where.visibility = visibility;
    }

    const [total, posts] = await Promise.all([
      this.prisma.post.count({ where }),
      this.prisma.post.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: true,
          _count: { select: { comments: true } },
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
        _count: { select: { comments: true } },
      },
    });

    if (!post) throw new NotFoundException('Post not found');
    return this.mapPost(post, userId);
  }

  async create(userId: string, body: any) {
    if (!body.content?.trim()) {
      throw new BadRequestException('content is required');
    }

    const post = await this.prisma.post.create({
      data: {
        userId,
        content: body.content.trim(),
        images: Array.isArray(body.images) ? body.images : [],
        tags: Array.isArray(body.tags) ? body.tags : [],
        visibility: body.visibility || 'PUBLIC',
        postType: body.postType || 'NORMAL',
        sourceType: body.sourceType || 'MANUAL',
        sourceRefId: body.sourceRefId,
        aiDraftPayload: body.aiDraftPayload,
      },
      include: {
        author: true,
        _count: { select: { comments: true } },
      },
    });

    return this.mapPost(post, userId);
  }

  async generateAiDraft(userId: string) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [recentTraining, weightRecords] = await Promise.all([
      this.prisma.trainingRecord.findMany({
        where: { userId, createdAt: { gte: sevenDaysAgo } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.weightRecord.findMany({
        where: { userId, date: { gte: thirtyDaysAgo.toISOString().split('T')[0] } },
        orderBy: { date: 'asc' },
      }),
    ]);

    const trainingCount = recentTraining.length;
    const weightChange = this.calculateWeightChange(weightRecords);
    const streak = await this.calculateStreak(userId);

    const prompt = await this.ai['resolvePrompt']('community.progress_draft', {
      trainingCount: String(trainingCount),
      weightChange,
      streak: String(streak),
    });

    const text = await this.ai['requestGemini'](prompt, { temperature: 0.7, maxOutputTokens: 256 });
    const result = this.ai['parseJsonResponse']<{ content: string }>(text);

    return {
      content: result.content,
      suggestedImages: recentTraining.filter(t => t.photoUrl).slice(0, 3).map(t => t.photoUrl),
      metrics: { trainingCount, weightChange, streak },
      sourceData: { trainingIds: recentTraining.map(t => t.id) },
    };
  }

  async generateFromTraining(userId: string, recordId: string) {
    const record = await this.prisma.trainingRecord.findFirst({
      where: { id: recordId, userId },
      include: { setDetails: true },
    });

    if (!record) throw new NotFoundException('Training record not found');

    const content = `完成了今天的训练！${record.description || ''}`;

    return {
      content,
      suggestedImages: record.photoUrl ? [record.photoUrl] : [],
      sourceRefId: record.id,
      sourceType: 'TRAINING_FEEDBACK',
    };
  }

  async remove(userId: string, id: string) {
    const post = await this.prisma.post.findFirst({ where: { id, userId } });
    if (!post) throw new NotFoundException('Post not found');
    await this.prisma.post.delete({ where: { id } });
    return { deleted: true };
  }

  async toggleLike(userId: string, id: string) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');

    const alreadyLiked = post.likedUserIds.includes(userId);
    const likedUserIds = alreadyLiked
      ? post.likedUserIds.filter((v) => v !== userId)
      : [...post.likedUserIds, userId];

    await this.prisma.post.update({ where: { id }, data: { likedUserIds } });
    return { liked: !alreadyLiked, likes: likedUserIds.length };
  }

  async getComments(postId: string) {
    const comments = await this.prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      include: { author: true },
    });
    return comments.map((c) => this.mapComment(c));
  }

  async addComment(userId: string, postId: string, content: string) {
    if (!content?.trim()) throw new BadRequestException('content is required');
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const comment = await this.prisma.comment.create({
      data: { userId, postId, content: content.trim() },
      include: { author: true },
    });
    return this.mapComment(comment);
  }

  async removeComment(userId: string, id: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment || comment.userId !== userId) {
      throw new NotFoundException('Comment not found');
    }
    await this.prisma.comment.delete({ where: { id } });
    return { deleted: true };
  }

  private calculateWeightChange(records: any[]): string {
    if (records.length < 2) return '暂无变化';
    const first = records[0].weight;
    const last = records[records.length - 1].weight;
    const change = last - first;
    if (Math.abs(change) < 0.1) return '保持稳定';
    return change > 0 ? `+${change.toFixed(1)}kg` : `${change.toFixed(1)}kg`;
  }

  private async calculateStreak(userId: string): Promise<number> {
    const records = await this.prisma.trainingRecord.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 30,
    });

    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    let checkDate = today;

    for (const record of records) {
      if (record.date === checkDate) {
        streak++;
        const d = new Date(checkDate);
        d.setDate(d.getDate() - 1);
        checkDate = d.toISOString().split('T')[0];
      } else {
        break;
      }
    }
    return streak;
  }

  private mapPost(post: any, currentUserId: string) {
    return {
      id: post.id,
      content: post.content,
      images: post.images,
      tags: post.tags,
      visibility: post.visibility,
      postType: post.postType,
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

  private mapComment(comment: any) {
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
