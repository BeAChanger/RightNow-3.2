import { Injectable } from '@nestjs/common';
import { AgentBindingService } from './agent-binding.service';
import { AgentAuditService } from './agent-audit.service';
import { ToolRegistry, ToolContext } from './tools/tool-registry';

export interface AgentRpcRequest {
  channel: string;
  channelUserId: string;
  channelChatId?: string;
  tool: string;
  args?: Record<string, unknown>;
}

export interface AgentRpcResponse {
  ok: boolean;
  user?: { id: string; email: string; name: string } | null;
  data?: unknown;
  error?: { code: string; message: string };
}

@Injectable()
export class AgentRpcService {
  constructor(
    private readonly binding: AgentBindingService,
    private readonly audit: AgentAuditService,
    private readonly registry: ToolRegistry,
  ) {}

  async dispatch(req: AgentRpcRequest): Promise<AgentRpcResponse> {
    const { channel, channelUserId, channelChatId, tool, args = {} } = req ?? {};

    if (!channel || !channelUserId || !tool) {
      return {
        ok: false,
        error: { code: 'INVALID_REQUEST', message: 'channel, channelUserId, tool are required' },
      };
    }

    // 1. Tool must be registered
    const handler = this.registry.get(tool);
    if (!handler) {
      await this.audit.log({ channel, channelUserId, tool, ok: false, errorCode: 'UNKNOWN_TOOL' });
      return { ok: false, error: { code: 'UNKNOWN_TOOL', message: `未知工具 ${tool}` } };
    }

    // 2. auth.bind is the only tool allowed for unbound users
    if (tool === 'auth.bind') {
      try {
        const a = args as any;
        const data = await this.binding.bindChannel(
          channel, channelUserId, a.code,
          a.displayName, channelChatId ?? a.channelChatId,
        );
        await this.audit.log({ channel, channelUserId, tool, ok: true });
        return { ok: true, user: data.user, data };
      } catch (e: any) {
        await this.audit.log({ channel, channelUserId, tool, ok: false, errorCode: 'BIND_FAILED' });
        return { ok: false, error: { code: 'BIND_FAILED', message: e?.message ?? '绑定失败' } };
      }
    }

    // 3. All other tools: resolve user first
    const user = await this.binding.resolveUser(channel, channelUserId);
    if (!user) {
      await this.audit.log({ channel, channelUserId, tool, ok: false, errorCode: 'NOT_BOUND' });
      return {
        ok: false,
        error: { code: 'NOT_BOUND', message: '尚未绑定，请先在 Web 生成绑定码并在小爪发送绑定码完成绑定' },
      };
    }

    // 4. Execute + audit
    try {
      const ctx: ToolContext = { userId: user.id, user, args, channel, channelUserId, channelChatId };
      const data = await handler.run(ctx);
      await this.audit.log({
        userId: user.id,
        channel,
        channelUserId,
        tool,
        ok: true,
        write: handler.write,
        args,
      });
      return { ok: true, user, data };
    } catch (e: any) {
      await this.audit.log({
        userId: user.id,
        channel,
        channelUserId,
        tool,
        ok: false,
        errorCode: e?.code ?? 'TOOL_ERROR',
        args,
      });
      return {
        ok: false,
        user,
        error: { code: e?.code ?? 'TOOL_ERROR', message: e?.message ?? '执行失败' },
      };
    }
  }
}
