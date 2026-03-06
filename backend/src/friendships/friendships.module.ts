import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
class FriendshipsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const records = await this.prisma.friendship.findMany({
      where: {
        OR: [{ requesterId: userId }, { receiverId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        requester: true,
        receiver: true,
      },
    });

    return records.map((record) => this.mapRecord(record, userId));
  }

  async getRecommendations(userId: string) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    const existingFriendships = await this.prisma.friendship.findMany({
      where: {
        OR: [{ requesterId: userId }, { receiverId: userId }],
      },
      select: {
        requesterId: true,
        receiverId: true,
      },
    });

    const excludeIds = new Set([
      userId,
      ...existingFriendships.map((f) =>
        f.requesterId === userId ? f.receiverId : f.requesterId,
      ),
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [currentUserTraining, candidates] = await Promise.all([
      this.prisma.trainingRecord.count({
        where: { userId, createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.user.findMany({
        where: {
          id: { notIn: Array.from(excludeIds) },
          isProfileComplete: true,
        },
        select: {
          id: true,
          name: true,
          avatar: true,
          bodyStyle: true,
          trainingRecords: {
            where: { createdAt: { gte: thirtyDaysAgo } },
            select: { id: true, createdAt: true },
          },
        },
      }),
    ]);

    const recommendations = await Promise.all(
      candidates.map(async (candidate) => {
        const trainingCount30 = candidate.trainingRecords.length;
        const trainingCount7 = candidate.trainingRecords.filter(
          (r) => r.createdAt >= sevenDaysAgo,
        ).length;

        const rhythmScore =
          currentUserTraining === 0 || trainingCount30 === 0
            ? 0
            : 1 - Math.abs(currentUserTraining - trainingCount30) / Math.max(currentUserTraining, trainingCount30);

        const goalScore =
          currentUser.bodyStyle && candidate.bodyStyle === currentUser.bodyStyle ? 1 : 0;

        const activityScore = trainingCount7 / 7;

        const matchScore = rhythmScore * 0.6 + goalScore * 0.3 + activityScore * 0.1;

        const reasons = [];
        if (rhythmScore > 0.7) reasons.push('训练节奏相近');
        if (goalScore === 1) reasons.push('目标一致');
        if (activityScore > 0.5) reasons.push('近期活跃');

        return {
          user: {
            id: candidate.id,
            name: candidate.name,
            avatar: candidate.avatar ?? undefined,
          },
          matchScore: Math.round(matchScore * 100) / 100,
          matchReason: reasons.join('，') || '可以互相激励',
        };
      }),
    );

    return recommendations
      .filter((r) => r.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10);
  }

  async request(userId: string, receiverId: string) {
    const targetId = receiverId.trim();
    if (!targetId) {
      throw new BadRequestException('receiverId is required');
    }
    if (targetId === userId) {
      throw new BadRequestException('Cannot add yourself');
    }

    let receiver = await this.prisma.user.findUnique({
      where: { id: targetId },
    });

    if (!receiver) {
      const passwordHash = await bcrypt.hash('password123', 10);
      receiver = await this.prisma.user.create({
        data: {
          id: targetId,
          email: `${targetId}@placeholder.rightnow.local`,
          passwordHash,
          name: `Buddy ${targetId.slice(0, 6)}`,
          isProfileComplete: true,
        },
      });
    }

    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId, receiverId: receiver.id },
          { requesterId: receiver.id, receiverId: userId },
        ],
      },
      include: {
        requester: true,
        receiver: true,
      },
    });

    if (existing) {
      if (
        existing.status === 'pending' &&
        existing.receiverId === userId &&
        existing.requesterId === receiver.id
      ) {
        const accepted = await this.prisma.friendship.update({
          where: { id: existing.id },
          data: { status: 'accepted' },
          include: {
            requester: true,
            receiver: true,
          },
        });
        return this.mapRecord(accepted, userId);
      }

      return this.mapRecord(existing, userId);
    }

    const record = await this.prisma.friendship.create({
      data: {
        requesterId: userId,
        receiverId: receiver.id,
        status: 'pending',
      },
      include: {
        requester: true,
        receiver: true,
      },
    });

    return this.mapRecord(record, userId);
  }

  async accept(userId: string, id: string) {
    const existing = await this.prisma.friendship.findUnique({
      where: { id },
      include: {
        requester: true,
        receiver: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Friendship not found');
    }

    if (existing.requesterId !== userId && existing.receiverId !== userId) {
      throw new ForbiddenException('Not allowed to accept this request');
    }

    const record = await this.prisma.friendship.update({
      where: { id },
      data: { status: 'accepted' },
      include: {
        requester: true,
        receiver: true,
      },
    });

    return this.mapRecord(record, userId);
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.friendship.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Friendship not found');
    }

    if (existing.requesterId !== userId && existing.receiverId !== userId) {
      throw new ForbiddenException('Not allowed to remove this friendship');
    }

    await this.prisma.friendship.delete({
      where: { id },
    });

    return { deleted: true };
  }

  private mapRecord(
    record: {
      id: string;
      status: string;
      createdAt: Date;
      requesterId: string;
      receiverId: string;
      requester: { id: string; name: string; avatar: string | null };
      receiver: { id: string; name: string; avatar: string | null };
    },
    currentUserId: string,
  ) {
    const otherUser =
      record.requesterId === currentUserId ? record.receiver : record.requester;

    return {
      id: record.id,
      user: {
        id: otherUser.id,
        name: otherUser.name,
        avatar: otherUser.avatar ?? undefined,
      },
      status: record.status as 'pending' | 'accepted',
      createdAt: record.createdAt.toISOString(),
    };
  }
}

@Controller('friendships')
@UseGuards(JwtAuthGuard)
class FriendshipsController {
  constructor(private readonly friendshipsService: FriendshipsService) {}

  @Get()
  list(@CurrentUser() user: { sub: string }) {
    return this.friendshipsService.list(user.sub);
  }

  @Get('recommendations')
  getRecommendations(@CurrentUser() user: { sub: string }) {
    return this.friendshipsService.getRecommendations(user.sub);
  }

  @Post('request')
  request(
    @CurrentUser() user: { sub: string },
    @Body() body: { receiverId: string },
  ) {
    return this.friendshipsService.request(user.sub, body.receiverId);
  }

  @Patch(':id/accept')
  accept(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.friendshipsService.accept(user.sub, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.friendshipsService.remove(user.sub, id);
  }
}

@Module({
  controllers: [FriendshipsController],
  providers: [FriendshipsService],
})
export class FriendshipsModule {}
