import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AgentBindingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private hash(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  async createBindCode(userId: string) {
    const ttlMin = Number(this.config.get('AGENT_BIND_CODE_TTL_MIN') ?? 10);
    const code = randomBytes(4).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + ttlMin * 60_000);
    await this.prisma.agentBindToken.create({
      data: { userId, tokenHash: this.hash(code), expiresAt },
    });
    return { code, expiresAt };
  }

  async bindChannel(
    channel: string,
    channelUserId: string,
    code: string,
    displayName?: string,
    channelChatId?: string,
  ) {
    const cleanCode = code.trim().toUpperCase();
    const token = await this.prisma.agentBindToken.findUnique({
      where: { tokenHash: this.hash(cleanCode) },
    });
    if (!token || token.usedAt || token.expiresAt < new Date()) {
      throw new BadRequestException('绑定码无效或已过期');
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: token.userId },
    });

    const binding = await this.prisma.agentChannelBinding.upsert({
      where: { channel_channelUserId: { channel, channelUserId } },
      create: {
        userId: user.id,
        email: user.email,
        channel,
        channelUserId,
        channelChatId,
        displayName,
        status: 'active',
      },
      update: {
        userId: user.id,
        email: user.email,
        status: 'active',
        channelChatId,
        displayName,
        lastSeenAt: new Date(),
      },
    });

    await this.prisma.agentBindToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    });

    return {
      bound: true,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  async resolveUser(channel: string, channelUserId: string) {
    const binding = await this.prisma.agentChannelBinding.findUnique({
      where: { channel_channelUserId: { channel, channelUserId } },
    });
    if (!binding || binding.status !== 'active') return null;

    await this.prisma.agentChannelBinding.update({
      where: { id: binding.id },
      data: { lastSeenAt: new Date() },
    });

    return this.prisma.user.findUnique({
      where: { id: binding.userId },
      select: { id: true, email: true, name: true },
    });
  }

  async listBindings(userId: string) {
    return this.prisma.agentChannelBinding.findMany({
      where: { userId },
      select: {
        id: true,
        channel: true,
        displayName: true,
        status: true,
        lastSeenAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(userId: string, id: string) {
    const b = await this.prisma.agentChannelBinding.findFirst({
      where: { id, userId },
    });
    if (!b) throw new NotFoundException('绑定不存在');
    await this.prisma.agentChannelBinding.update({
      where: { id },
      data: { status: 'revoked' },
    });
    return { revoked: true };
  }
}
