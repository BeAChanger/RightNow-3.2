import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function upsertBasicUser(input: {
  email: string;
  name: string;
  password: string;
  profile?: {
    gender?: string;
    height?: number;
    weight?: number;
    age?: number;
    bodyStyle?: string;
    currentPhase?: string;
    goalWeight?: number;
    activityLevel?: string;
    isProfileComplete?: boolean;
  };
}) {
  const passwordHash = await bcrypt.hash(input.password, 10);

  return prisma.user.upsert({
    where: { email: input.email.toLowerCase() },
    update: {
      name: input.name,
      passwordHash,
      ...input.profile,
    },
    create: {
      email: input.email.toLowerCase(),
      name: input.name,
      passwordHash,
      ...input.profile,
    },
  });
}

async function main() {
  const demoUser = await upsertBasicUser({
    email: 'demo@rightnow.fit',
    name: 'Demo User',
    password: 'password123',
    profile: {
      gender: 'male',
      height: 176,
      weight: 74,
      age: 28,
      bodyStyle: 'athletic',
      currentPhase: 'B',
      goalWeight: 70,
      activityLevel: 'medium',
      isProfileComplete: true,
    },
  });

  const buddyUser = await upsertBasicUser({
    email: 'buddy@rightnow.fit',
    name: 'Buddy User',
    password: 'password123',
    profile: {
      gender: 'female',
      height: 165,
      weight: 58,
      age: 26,
      bodyStyle: 'slim',
      currentPhase: 'A',
      goalWeight: 56,
      activityLevel: 'medium',
      isProfileComplete: true,
    },
  });

  const adminEmail = (process.env.ADMIN_SEED_EMAIL || 'admin@admin.com').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_SEED_PASSWORD || '123456';
  const adminName = process.env.ADMIN_SEED_NAME || 'RightNow Admin';

  const adminUser = await upsertBasicUser({
    email: adminEmail,
    name: adminName,
    password: adminPassword,
    profile: {
      isProfileComplete: true,
    },
  });

  // Keep one default friendship for social module smoke tests.
  const friendship = await prisma.friendship.findFirst({
    where: {
      requesterId: demoUser.id,
      receiverId: buddyUser.id,
    },
  });

  if (!friendship) {
    await prisma.friendship.create({
      data: {
        requesterId: demoUser.id,
        receiverId: buddyUser.id,
        status: 'accepted',
      },
    });
  }

  console.log('Seed completed: demo, buddy, admin users are ready.');
  console.log(`Admin account: ${adminUser.email}`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
