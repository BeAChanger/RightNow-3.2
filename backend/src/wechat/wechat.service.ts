import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
const CODE_LENGTH = 6;

function randomCode(): string {
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

@Injectable()
export class WechatService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Called by the logged-in web user. Generates a short code they paste
   * into WeChat (`/绑定 ABC123`) so the bridge can finalize the binding.
   */
  async generateBindCode(userId: string): Promise<{ code: string; expiresAt: string }> {
    // Invalidate stale codes for this user (best-effort, ignore failures).
    await this.prisma.wechatBindCode
      .deleteMany({
        where: {
          userId,
          OR: [{ expiresAt: { lt: new Date() } }, { consumedAt: { not: null } }],
        },
      })
      .catch(() => undefined);

    // Try a few times in the unlikely event of a collision.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = randomCode();
      const expiresAt = new Date(Date.now() + CODE_TTL_MS);
      try {
        await this.prisma.wechatBindCode.create({
          data: { userId, code, expiresAt },
        });
        return { code, expiresAt: expiresAt.toISOString() };
      } catch (err: unknown) {
        // unique constraint -> try again
        if ((err as { code?: string })?.code === 'P2002') continue;
        throw err;
      }
    }
    throw new Error('Failed to allocate a binding code');
  }

  /** Called by the OpenClaw bridge (internal-token) after a user types the code in WeChat. */
  async redeemBindCode(input: {
    code: string;
    peerId: string;
    botAccountId?: string;
    source?: string;
  }): Promise<{ userId: string }> {
    const code = input.code.trim().toUpperCase();
    const peerId = input.peerId.trim();
    if (!code || !peerId) {
      throw new BadRequestException('code and peerId are required');
    }

    const row = await this.prisma.wechatBindCode.findUnique({ where: { code } });
    if (!row || row.consumedAt || row.expiresAt < new Date()) {
      throw new NotFoundException('Bind code is invalid or expired');
    }

    // If this peer is already bound to someone else, remove old binding first.
    // The new user has a valid bind code, so they clearly own this WeChat now.
    const existingPeer = await this.prisma.wechatBinding.findUnique({
      where: { peerId },
      select: { userId: true },
    });
    if (existingPeer && existingPeer.userId !== row.userId) {
      await this.prisma.wechatBinding.delete({ where: { userId: existingPeer.userId } });
    }

    await this.prisma.$transaction([
      this.prisma.wechatBinding.upsert({
        where: { userId: row.userId },
        create: {
          userId: row.userId,
          peerId,
          botAccountId: input.botAccountId,
          source: input.source || 'openclaw',
        },
        update: {
          peerId,
          botAccountId: input.botAccountId,
          source: input.source || 'openclaw',
        },
      }),
      this.prisma.wechatBindCode.update({
        where: { id: row.id },
        data: { consumedAt: new Date() },
      }),
    ]);

    return { userId: row.userId };
  }

  async getBindingForUser(userId: string) {
    const binding = await this.prisma.wechatBinding.findUnique({
      where: { userId },
      select: { peerId: true, botAccountId: true, source: true, createdAt: true },
    });
    return binding;
  }

  async unbind(userId: string) {
    await this.prisma.wechatBinding.deleteMany({ where: { userId } }).catch(() => undefined);
    return { ok: true };
  }

  /** Reverse lookup used by the bridge if it wants to know who owns a peer. */
  async resolvePeer(peerId: string) {
    const binding = await this.prisma.wechatBinding.findUnique({
      where: { peerId },
      select: { userId: true },
    });
    return binding;
  }
}
