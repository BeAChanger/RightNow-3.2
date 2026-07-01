import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(email: string, password: string, name: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: name.trim(),
      },
    });

    return this.buildAuthResponse(user, 'app');
  }

  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.buildAuthResponse(user, 'app');
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    return this.toAuthUser(user);
  }

  private buildAuthResponse(user: User, scope: 'app' | 'admin') {
    return {
      access_token: this.jwtService.sign({
        sub: user.id,
        email: user.email,
        name: user.name,
        scope,
      }),
      user: this.toAuthUser(user),
    };
  }

  private toAuthUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar ?? undefined,
      gender:
        user.gender === 'male' || user.gender === 'female'
          ? user.gender
          : undefined,
      bodyStyle: user.bodyStyle ?? undefined,
      userImage: user.userImage ?? undefined,
      userFaceImage: user.userFaceImage ?? undefined,
      idealBodyImage: user.idealBodyImage ?? undefined,
      currentPhase: user.currentPhase ?? undefined,
      isProfileComplete: user.isProfileComplete,
      height: user.height ?? undefined,
      weight: user.weight ?? undefined,
      age: user.age ?? undefined,
      goalWeight: user.goalWeight ?? undefined,
      activityLevel: user.activityLevel ?? undefined,
    };
  }
}
