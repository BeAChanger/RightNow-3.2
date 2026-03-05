import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GroupRole } from '@prisma/client';

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  async createGroup(userId: string, name: string, avatar?: string, description?: string) {
    return this.prisma.group.create({
      data: {
        name,
        avatar,
        description,
        members: {
          create: { userId, role: GroupRole.CREATOR },
        },
      },
      include: { members: true },
    });
  }

  async getMyGroups(userId: string) {
    const members = await this.prisma.groupMember.findMany({
      where: { userId },
      include: { group: true },
      orderBy: { joinedAt: 'desc' },
    });
    return members.map(m => m.group);
  }

  async getGroup(groupId: string, userId: string) {
    await this.checkMembership(groupId, userId);
    return this.prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });
  }

  async updateGroup(groupId: string, userId: string, data: { name?: string; avatar?: string; description?: string }) {
    await this.checkRole(groupId, userId, [GroupRole.CREATOR, GroupRole.ADMIN]);
    return this.prisma.group.update({
      where: { id: groupId },
      data,
    });
  }

  async deleteGroup(groupId: string, userId: string) {
    await this.checkRole(groupId, userId, [GroupRole.CREATOR]);
    return this.prisma.group.delete({ where: { id: groupId } });
  }

  async addMember(groupId: string, userId: string, targetUserId: string) {
    await this.checkMembership(groupId, userId);
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.memberCount >= group.maxMembers) throw new ForbiddenException('Group is full');

    const member = await this.prisma.groupMember.create({
      data: { groupId, userId: targetUserId },
    });
    await this.prisma.group.update({
      where: { id: groupId },
      data: { memberCount: { increment: 1 } },
    });
    return member;
  }

  async removeMember(groupId: string, userId: string, targetUserId: string) {
    await this.checkRole(groupId, userId, [GroupRole.CREATOR, GroupRole.ADMIN]);
    await this.prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId: targetUserId } },
    });
    await this.prisma.group.update({
      where: { id: groupId },
      data: { memberCount: { decrement: 1 } },
    });
  }

  async getMessages(groupId: string, userId: string, page = 1, limit = 50) {
    await this.checkMembership(groupId, userId);
    const messages = await this.prisma.groupMessage.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return messages.reverse();
  }

  async sendMessage(groupId: string, userId: string, content: string, type = 'TEXT') {
    await this.checkMembership(groupId, userId);
    return this.prisma.groupMessage.create({
      data: { groupId, senderId: userId, content, type: type as any },
    });
  }

  private async checkMembership(groupId: string, userId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a group member');
    return member;
  }

  private async checkRole(groupId: string, userId: string, allowedRoles: GroupRole[]) {
    const member = await this.checkMembership(groupId, userId);
    if (!allowedRoles.includes(member.role)) throw new ForbiddenException('Insufficient permissions');
    return member;
  }
}
