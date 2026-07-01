import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  userId?: string;
  channel?: string;
  channelUserId?: string;
  tool: string;
  ok: boolean;
  write?: boolean;
  errorCode?: string;
  args?: Record<string, unknown>;
}

@Injectable()
export class AgentAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry) {
    const argsDigest = entry.args
      ? JSON.stringify(entry.args).slice(0, 500)
      : undefined;

    await this.prisma.agentAuditLog.create({
      data: {
        userId: entry.userId ?? null,
        channel: entry.channel ?? null,
        channelUserId: entry.channelUserId ?? null,
        tool: entry.tool,
        ok: entry.ok,
        errorCode: entry.errorCode ?? null,
        argsDigest,
      },
    });
  }
}
