import { Injectable } from '@nestjs/common';

export interface ToolContext {
  userId?: string;
  user?: { id: string; email: string; name: string };
  channel: string;
  channelUserId: string;
  channelChatId?: string;
  args: Record<string, unknown>;
}

export interface ToolHandler {
  name: string;
  write: boolean;
  run(ctx: ToolContext): Promise<unknown>;
}

@Injectable()
export class ToolRegistry {
  private readonly map = new Map<string, ToolHandler>();

  register(h: ToolHandler) {
    this.map.set(h.name, h);
  }

  get(name: string): ToolHandler | undefined {
    return this.map.get(name);
  }

  list(): string[] {
    return [...this.map.keys()];
  }
}
