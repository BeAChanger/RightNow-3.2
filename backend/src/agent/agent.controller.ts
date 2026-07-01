import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AgentServiceGuard } from './agent-service.guard';
import { AgentBindingService } from './agent-binding.service';
import { AgentRpcService, AgentRpcRequest } from './agent-rpc.service';

// ── OpenClaw 调用：服务 token 鉴权 ──
@Controller('agent')
export class AgentRpcController {
  constructor(private readonly rpc: AgentRpcService) {}

  @Post('rpc')
  @UseGuards(AgentServiceGuard)
  async dispatch(@Body() body: AgentRpcRequest) {
    return this.rpc.dispatch(body);
  }
}

// ── Web 端调用：JWT 鉴权 ──
@Controller('agent/bindings')
@UseGuards(JwtAuthGuard)
export class AgentBindingController {
  constructor(private readonly binding: AgentBindingService) {}

  @Post('code')
  async createCode(@CurrentUser('id') userId: string) {
    return this.binding.createBindCode(userId);
  }

  @Get()
  async list(@CurrentUser('id') userId: string) {
    return this.binding.listBindings(userId);
  }

  @Delete(':id')
  async revoke(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.binding.revoke(userId, id);
  }
}
