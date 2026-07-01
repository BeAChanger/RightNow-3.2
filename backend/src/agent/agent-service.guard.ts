import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class AgentServiceGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers['authorization'] ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    const expected = (this.config.get<string>('AGENT_SERVICE_TOKEN') ?? '').trim();
    if (!expected || token !== expected) {
      throw new UnauthorizedException('Invalid agent service token');
    }
    return true;
  }
}
