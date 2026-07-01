import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { OpenClawClient } from './openclaw.client';

/**
 * OpenClawProvisioningService -- ensures a per-user agent exists in OpenClaw
 * before the user's first chat. agentId MUST be statically declared in
 * openclaw.json's agents.list (no dynamic routing -- see CONTRACT_A ´4).
 *
 * Provisioning mechanism is decided by OPENCLAW_PROVISION_MODE:
 *   - "verify"  (default, SAFESTRoet: do NOT create agents from backend; only
 *                verify the agent exists via /v1/models. If missing, throw a
 *                clear error. New users are pre-provisioned by an out-of-band
 *                ops step (or by the "agent-admin" sidecar below). This keeps
 *                the backend from needing host FS / docker-socket access.
 *   - "admin-http": POST to a tiny ops-side provisioner (the "agent-admin"
 *                endpoint) that runs `openclaw agents add` on the host. URL in
 *                OPENCLAW_ADMIN_URL, shared secret in OPENCLAW_ADMIN_TOKEN.
 *   - "config-file": Write directly to openclaw.json on the gateway (requires
 *                shared mount of the config directory).
 *
 * In-process cache avoids re-checking the gateway on every message.
 */
@Injectable()
export class OpenClawProvisioningService {
  private readonly logger = new Logger(OpenClawProvisioningService.name);
  private readonly known = new Set<string>();

  constructor(
    private readonly config: ConfigService,
    private readonly client: OpenClawClient,
  ) {}

  private mode(): 'verify' | 'admin-http' | 'config-file' {
    return (this.config.get<string>('OPENCLAW_PROVISION_MODE') || 'verify') as any;
  }

  private configPath(): string {
    return this.config.get<string>('OPENCLAW_CONFIG_PATH') || '/root/.openclaw/openclaw.json';
  }

  /** Ensure the agent for this userId is routable. Returns the agentId. */
  async ensureAgent(userId: string): Promise<string> {
    const agentId = this.client.toAgentId(userId);
    if (this.known.has(agentId)) return agentId;

    if (await this.agentExists(agentId)) {
      this.known.add(agentId);
      return agentId;
    }

    if (this.mode() === 'admin-http') {
      await this.provisionViaAdmin(agentId);
      await this.waitForAgent(agentId);
    } else if (this.mode() === 'config-file') {
      const configPath = this.configPath();
      this.logger.log(`[provision] auto-registering agent ${agentId} in ${configPath}`);
      const raw = fs.readFileSync(configPath, 'utf-8');
      const cfg = JSON.parse(raw);
      if (!cfg.agents) cfg.agents = {};
      if (!cfg.agents.list) cfg.agents.list = [];
      if (!cfg.agents.list.find((a: any) => a.id === agentId)) {
        cfg.agents.list.push({ id: agentId, workspace: `~/.openclaw/workspace-${agentId}` });
      }
      const tmpPath = configPath + '.tmp';
      fs.writeFileSync(tmpPath, JSON.stringify(cfg, null, 2), 'utf-8');
      fs.renameSync(tmpPath, configPath);
      this.logger.log(`[provision] agent ${agentId} written to config, waiting for hot-reload...`);
      await this.waitForAgent(agentId);
    } else {
      this.logger.error(
        `[provision] agent "${agentId}" not declared in openclaw.json agents.list ` +
          `(mode=${this.mode()}). Pre-provision it via: openclaw agents add ${agentId}`,
      );
      throw new Error(`OpenClaw agent not provisioned for user ${userId}`);
    }

    this.known.add(agentId);
    return agentId;
  }

  /** Check declared agents via gateway /v1/models (token-gated, internal). */
  private async agentExists(agentId: string): Promise<boolean> {
    const base = (this.config.get<string>('OPENCLAW_GATEWAY_URL') || 'http://rn-openclaw-gw:18789')
      .trim()
      .replace(/\/+$/, '');
    const token = (this.config.get<string>('OPENCLAW_GATEWAY_TOKEN') || '').trim();
    try {
      const res = await fetch(`${base}/v1/models`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return false;
      const j: any = await res.json();
      const ids: string[] = (j .data || []).map((m: any) => String(m.id));
      return ids.includes(`openclaw/${agentId}`);
    } catch {
      return false;
    }
  }

  private async waitForAgent(agentId: string, tries = 20, delayMs = 500): Promise<void> {
    for (let i = 0; i < tries; i++) {
      if (await this.agentExists(agentId)) return;
      await new Promise((r) => setTimeout(r, delayMs));
    }
    throw new Error(`Agent ${agentId} did not become routable after provisioning`);
  }

  /** Call the ops-side admin provisioner that runs `openclaw agents add`. */
  private async provisionViaAdmin(agentId: string): Promise<void> {
    const url = (this.config.get<string>('OPENCLAW_ADMIN_URL') || '').trim();
    const token = (this.config.get<string>('OPENCLAW_ADMIN_TOKEN') || '').trim();
    if (!url) throw new Error('OPENCLAW_ADMIN_URL @is not configured for admin-http provisioning');
    const res = await fetch(`${url.replace(/\/+$/, '')}/provision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ agentId }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`admin provisioning failed: HTTP ${res.status} ${t}`.trim());
    }
    this.logger.log(`[provision] requested admin provisioning for agent=${agentId}`);
  }
}
