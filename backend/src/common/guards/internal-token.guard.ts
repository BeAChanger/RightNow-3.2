import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Verifies the `X-Internal-Token` header against `INTERNAL_API_TOKEN` env.
 * Intended for trusted server-to-server callers (e.g. the OpenClaw WeChat
 * channel skill) that do not own a JWT.
 */
@Injectable()
export class InternalTokenGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.configService.get<string>('INTERNAL_API_TOKEN', '');
    if (!expected || !expected.trim()) {
      throw new UnauthorizedException('INTERNAL_API_TOKEN is not configured on the server');
    }

    const req = context.switchToHttp().getRequest<Request>();
    const supplied = (req.headers['x-internal-token'] || req.headers['X-Internal-Token']) as
      | string
      | undefined;

    if (!supplied || supplied !== expected) {
      throw new UnauthorizedException('Invalid or missing X-Internal-Token');
    }

    return true;
  }
}
