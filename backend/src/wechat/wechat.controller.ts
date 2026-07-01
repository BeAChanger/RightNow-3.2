import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { InternalTokenGuard } from '../common/guards/internal-token.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { WechatService } from './wechat.service';

@Controller('wechat')
export class WechatController {
  constructor(
    private readonly wechatService: WechatService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Web user (JWT) ──────────────────────────────────────────────────────

  /** Generate a short binding code to type into WeChat. */
  @Post('bind/code')
  @UseGuards(JwtAuthGuard)
  generateBindCode(@CurrentUser() user: { sub: string }) {
    return this.wechatService.generateBindCode(user.sub);
  }

  /** Look up whether the current user already has a bound WeChat account. */
  @Get('binding')
  @UseGuards(JwtAuthGuard)
  getBinding(@CurrentUser() user: { sub: string }) {
    return this.wechatService.getBindingForUser(user.sub);
  }

  /** Remove the binding for the current user. */
  @Delete('binding')
  @UseGuards(JwtAuthGuard)
  unbind(@CurrentUser() user: { sub: string }) {
    return this.wechatService.unbind(user.sub);
  }

  // ─── Bot login QR (proxy to wechat-bridge) ────────────────────────────────

  /**
   * Start a bot login session on the bridge and return the QR code text
   * so the frontend can render it client-side.
   */
  @Post('bot/login/start')
  @UseGuards(JwtAuthGuard)
  async botLoginStart() {
    return this.bridgePost('/login/start', {});
  }

  /** Poll bridge for QR scan status. */
  @Get('bot/login/status')
  @UseGuards(JwtAuthGuard)
  async botLoginStatus() {
    return this.bridgeGet('/login/status');
  }

  /** Check if bridge is already logged in. If so, frontend skips QR. */
  @Get('bot/status')
  @UseGuards(JwtAuthGuard)
  async botStatus() {
    const resp = await this.bridgeGet('/health');
    return { loggedIn: resp?.loggedIn === true, accountId: resp?.accountId || null };
  }

  // ─── Bridge (Internal token) ─────────────────────────────────────────────

  /** Finalize a binding triggered by the user typing the code in WeChat. */
  @Post('bind/redeem')
  @UseGuards(InternalTokenGuard)
  redeem(
    @Body()
    body: {
      code?: string;
      peerId?: string;
      botAccountId?: string;
      source?: string;
    },
  ) {
    if (!body.code || !body.peerId) {
      throw new BadRequestException('code and peerId are required');
    }
    return this.wechatService.redeemBindCode({
      code: body.code,
      peerId: body.peerId,
      botAccountId: body.botAccountId,
      source: body.source,
    });
  }

  /** Reverse lookup peerId -> userId, for diagnostics from the bridge. */
  @Get('resolve')
  @UseGuards(InternalTokenGuard)
  resolve(@Query('peerId') peerId?: string) {
    if (!peerId) {
      throw new BadRequestException('peerId is required');
    }
    return this.wechatService.resolvePeer(peerId);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private get bridgeUrl() {
    return this.configService.get<string>('PUSH_BRIDGE_URL', 'http://wechat-bridge:3000').replace(/\/$/, '');
  }

  private get bridgeToken() {
    return this.configService.get<string>('INTERNAL_API_TOKEN', '');
  }

  private async bridgeGet(path: string) {
    const res = await fetch(`${this.bridgeUrl}${path}`, {
      headers: { 'X-Internal-Token': this.bridgeToken },
    });
    const text = await res.text();
    if (!res.ok) throw new BadRequestException(`Bridge ${path} failed: HTTP ${res.status}`);
    try { return JSON.parse(text); } catch { return { raw: text }; }
  }

  private async bridgePost(path: string, body: Record<string, unknown>) {
    const res = await fetch(`${this.bridgeUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Token': this.bridgeToken },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) throw new BadRequestException(`Bridge ${path} failed: HTTP ${res.status} — ${text.slice(0, 200)}`);
    try { return JSON.parse(text); } catch { return { raw: text }; }
  }
}
