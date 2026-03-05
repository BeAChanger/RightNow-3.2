import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();

    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Account is frozen');
    }

    if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
