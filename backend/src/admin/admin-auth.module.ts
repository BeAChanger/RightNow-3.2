import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAuditModule, AdminAuditService } from './admin-audit.module';
import { AdminGuard } from './admin.guard';

interface AdminAuthResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    status: UserStatus;
  };
}

@Injectable()
class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AdminAuditService,
  ) {}

  async login(email: string, password: string, request?: Request): Promise<AdminAuthResponse> {
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

    if (user.status === UserStatus.FROZEN) {
      throw new ForbiddenException('Account is frozen');
    }

    if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Admin access required');
    }

    await this.auditService.log({
      actorId: user.id,
      action: 'admin.auth.login',
      targetType: 'AuthSession',
      targetId: user.id,
      request,
    });

    return {
      access_token: this.jwtService.sign({
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        scope: 'admin',
      }),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      },
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    });

    if (user.status === UserStatus.FROZEN) {
      throw new ForbiddenException('Account is frozen');
    }

    if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Admin access required');
    }

    return user;
  }
}

@Controller('admin/auth')
class AdminAuthController {
  constructor(private readonly authService: AdminAuthService) {}

  @Post('login')
  login(@Body() body: { email: string; password: string }, @Req() request: Request) {
    return this.authService.login(body.email || '', body.password || '', request);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, AdminGuard)
  me(@CurrentUser() user: { sub: string }) {
    return this.authService.me(user.sub);
  }
}

@Module({
  imports: [
    AdminAuditModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'rightnow-dev-secret'),
        signOptions: { expiresIn: '30d' },
      }),
    }),
  ],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, AdminGuard],
})
export class AdminAuthModule {}
