import { ToolHandler } from './tool-registry';
import { UsersService } from '../../users/users.module';
import { PrismaService } from '../../prisma/prisma.service';

export function userTools(users: UsersService, prisma: PrismaService): ToolHandler[] {
  return [
    {
      name: 'user.profile.get',
      write: false,
      async run(ctx) {
        return users.getUser(ctx.userId!);
      },
    },
    {
      name: 'user.onboarding.get',
      write: false,
      async run(ctx) {
        return prisma.aiCoachOnboardingProfile.findUnique({
          where: { userId: ctx.userId! },
        });
      },
    },
    {
      name: 'user.goal_image.get',
      write: false,
      async run(ctx) {
        const user = await prisma.user.findUnique({
          where: { id: ctx.userId! },
          select: {
            userImage: true,
            userFaceImage: true,
            idealBodyImage: true,
            gender: true,
            height: true,
            weight: true,
            goalWeight: true,
          },
        });
        return user;
      },
    },
  ];
}
