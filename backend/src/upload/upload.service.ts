import { BadRequestException, Injectable } from '@nestjs/common';
import { buildUploadUrl } from '../common/upload.util';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UploadService {
  constructor(private readonly prisma: PrismaService) {}

  async save(userId: string, filename: string, kind: 'general' | 'avatar') {
    const url = buildUploadUrl(filename);

    await this.prisma.uploadAsset.create({
      data: {
        userId,
        url,
        kind,
      },
    });

    if (kind === 'avatar') {
      await this.prisma.user.update({
        where: { id: userId },
        data: { avatar: url },
      });
    }

    return { url };
  }

  async uploadFile(file: Express.Multer.File, userId: string): Promise<string> {
    if (!file?.filename) {
      throw new BadRequestException('file is required');
    }

    const result = await this.save(userId, file.filename, 'general');
    return result.url;
  }

  async list(userId: string, query: { kind?: string; limit?: number }) {
    const kind = query.kind?.trim();
    const requestedLimit = query.limit ?? 30;

    if (!Number.isFinite(requestedLimit) || requestedLimit <= 0) {
      throw new BadRequestException('limit must be a positive integer');
    }

    const take = Math.min(Math.floor(requestedLimit), 200);

    const assets = await this.prisma.uploadAsset.findMany({
      where: {
        userId,
        ...(kind ? { kind } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
    });

    return assets.map((asset) => ({
      id: asset.id,
      url: asset.url,
      kind: asset.kind,
      createdAt: asset.createdAt.toISOString(),
    }));
  }
}
