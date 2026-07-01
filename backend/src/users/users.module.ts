import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfile(
    userId: string,
    body: {
      name?: string;
      avatar?: string;
      gender?: string;
      height?: number;
      weight?: number;
      age?: number;
      bodyStyle?: string;
      userImage?: string | null;
      userFaceImage?: string | null;
      idealBodyImage?: string | null;
      currentPhase?: string;
      goalWeight?: number;
      activityLevel?: string;
    },
    isOnboarding = false,
  ) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: body.name?.trim() || undefined,
        avatar: body.avatar ?? undefined,
        gender: body.gender ?? undefined,
        height: this.toOptionalNumber(body.height),
        weight: this.toOptionalNumber(body.weight),
        age: this.toOptionalInteger(body.age),
        bodyStyle: body.bodyStyle ?? undefined,
        userImage: this.toOptionalStringOrNull(body.userImage),
        userFaceImage: this.toOptionalStringOrNull(body.userFaceImage),
        idealBodyImage: this.toOptionalStringOrNull(body.idealBodyImage),
        currentPhase: body.currentPhase ?? undefined,
        goalWeight: this.toOptionalNumber(body.goalWeight),
        activityLevel: body.activityLevel ?? undefined,
        isProfileComplete: isOnboarding ? true : undefined,
      },
    });

    return this.toUserProfile(user);
  }

  async getUser(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    return this.toUserProfile(user);
  }

  private toOptionalNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private toOptionalInteger(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    const parsed = Number.parseInt(String(value), 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private toUserProfile(user: {
    id: string;
    email: string;
    name: string;
    avatar: string | null;
    gender: string | null;
    height: number | null;
    weight: number | null;
    age: number | null;
    bodyStyle: string | null;
    userImage: string | null;
    userFaceImage: string | null;
    currentPhase: string | null;
    goalWeight: number | null;
    activityLevel: string | null;
    idealBodyImage: string | null;
    isProfileComplete: boolean;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar ?? undefined,
      gender: user.gender ?? undefined,
      height: user.height ?? undefined,
      weight: user.weight ?? undefined,
      age: user.age ?? undefined,
      bodyStyle: user.bodyStyle ?? undefined,
      userImage: user.userImage ?? undefined,
      userFaceImage: user.userFaceImage ?? undefined,
      currentPhase: user.currentPhase ?? undefined,
      goalWeight: user.goalWeight ?? undefined,
      activityLevel: user.activityLevel ?? undefined,
      idealBodyImage: user.idealBodyImage ?? undefined,
      isProfileComplete: user.isProfileComplete,
    };
  }

  private toOptionalStringOrNull(value: unknown): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
}

@Controller('users')
@UseGuards(JwtAuthGuard)
class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('profile')
  updateProfile(
    @CurrentUser() user: { sub: string },
    @Body()
    body: {
      name?: string;
      avatar?: string;
      gender?: string;
      height?: number;
      weight?: number;
      age?: number;
      bodyStyle?: string;
      userImage?: string | null;
      userFaceImage?: string | null;
      idealBodyImage?: string | null;
      currentPhase?: string;
      goalWeight?: number;
      activityLevel?: string;
    },
  ) {
    return this.usersService.updateProfile(user.sub, body);
  }

  @Post('onboarding')
  onboarding(
    @CurrentUser() user: { sub: string },
    @Body()
    body: {
      name?: string;
      avatar?: string;
      gender?: string;
      height?: number;
      weight?: number;
      age?: number;
      bodyStyle?: string;
      userImage?: string | null;
      userFaceImage?: string | null;
      idealBodyImage?: string | null;
      currentPhase?: string;
      goalWeight?: number;
      activityLevel?: string;
    },
  ) {
    return this.usersService.updateProfile(user.sub, body, true);
  }

  @Get(':id')
  getUser(@Param('id') id: string) {
    return this.usersService.getUser(id);
  }
}

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
