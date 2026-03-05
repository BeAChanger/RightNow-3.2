import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DietCleanupService {
  constructor(private readonly prisma: PrismaService) {}

  // Keep a callable cleanup entrypoint; scheduler can be wired later if needed.
  async cleanupExpiredData() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];

    const deleted = await this.prisma.dietRecord.deleteMany({
      where: { date: { lt: cutoffDate } },
    });

    console.log(`[DietCleanup] Deleted ${deleted.count} records before ${cutoffDate}`);
  }
}
