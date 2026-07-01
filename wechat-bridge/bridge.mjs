#!/usr/bin/env node
/**
 * RightNow ↔ WeChat bridge.
 * Uses Tencent iLink Bot API. sendmessage format matches the working demo exactly.
 *
 * Fix v2: bot_type as URL query param + ret-field validation in apiPost.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';

try { const { default: dotenv } = await import('dotenv'); dotenv.config(); } catch {}

const ILINK  = process.env.ILINK_BASE_URL || 'https://ilinkai.weixin.qq.com';
const BTYPE  = process.env.ILINK_BOT_TYPE || '3';
const CHVER  = process.env.ILINK_CHANNEL_VERSION || '1.0.2';
const TFILE  = process.env.TOKEN_FILE || '/app/data/.weixin-token.json';
const RNAPI  = (process.env.RIGHTNOW_API_BASE || 'http://localhost:5000/api').replace(/\/$/,'');
const ITOKEN = process.env.INTERNAL_API_TOKEN || '';
const PPORT  = +process.env.PUSH_PORT || 3000;
const PTOKEN = process.env.PUSH_TOKEN || ITOKEN;
const BKW    = (process.env.BIND_KEYWORDS || '绑定,bind,/bind').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
const BRE    = /\b([A-HJ-NP-Z2-9]{6})\b/i;
const LPTO   = 45_000;

let S = null, BUF = '', LPR = false, CTX = '';

const rnd = ()=>Buffer.from(String(crypto.randomBytes(4).readUInt32BE(0)),'utf-8').toString('base64');
const hdrs = t => { const h={'Content-Type':'application/json',AuthorizationType:'ilink_bot_token','X-WECHAT-UIN':rnd()}; if(t)h.Authorization='Bearer '+t; return h; };
const T = ms=>new Promise(r=>setTimeout(r,ms));

// apiPost — matches demo: adds base_info at root level.
// ★ v2: checks iLink ret field so we don't silently pass error responses upstream.
async function apiPost(ep, body, token, timeoutMs = 20_000) {
  const url = ILINK + '/' + ep;
  const payload = { ...body, base_info: { channel_version: CHVER } };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: 'POST', headers: hdrs(token), body: JSON.stringify(payload), signal: ctrl.signal });
    clearTimeout(timer);
    const txt = await res.text();
    console.log('  ◉ %s HTTP %d: %s', ep, res.status, txt.slice(0, 200));
    if (!res.ok) throw new Error(ep + ' HTTP ' + res.status + ': ' + txt);
    const data = JSON.parse(txt);
    // iLink returns { ret: 1, err_msg: "..." } on error even with HTTP 200
    if (data.ret != null && data.ret !== 0) {
      throw new Error(ep + ' iLink error ret=' + data.ret + ': ' + (data.err_msg || data.errmsg || 'unknown'));
    }
    return data;
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') { console.log('  ⏰ %s timeout', ep); return null; }
    console.log('  💥 %s: %s', ep, err.message);
    throw err;
  }
}

// sendMessage — matches demo: message_type 2, message_state 2
async function sendMessage(peerId, text, contextToken) {
  if (!text?.trim()) return;
  const truncated = text.length > 500 ? text.slice(0, 497) + '...' : text;
  const ctx = contextToken || CTX;
  const body = {
    msg: {
      to_user_id: peerId,
      message_type: 2,
      message_state: 2,
      context_token: ctx,
      item_list: [{ type: 1, text_item: { text: truncated } }]
    }
  };
  console.log('  ✉ sendMessage len=%d ctx=%s', truncated.length, String(ctx).slice(0, 15));
  await apiPost('ilink/bot/sendmessage', body, S.token);
}

// save/load token
function save(td) {
  fs.writeFileSync(TFILE, JSON.stringify({...td, savedAt: new Date().toISOString()}, null, 2), 'utf-8');
  try { fs.chmodSync(TFILE, 0o600); } catch {}
}
function load() {
  try { const r = JSON.parse(fs.readFileSync(TFILE, 'utf-8')); if (r.token && r.accountId) return r; } catch {}
  return null;
}

// RightNow backend calls
async function rnSend(pid, txt) {
  const res = await fetch(RNAPI + '/chat/internal/send-as', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Internal-Token': ITOKEN },
    body: JSON.stringify({ peerId: pid, content: txt, source: 'wechat' })
  });
  const text = await res.text();
  if (!res.ok) {
    let p; try { p = JSON.parse(text); } catch { p = { message: text }; }
    throw Object.assign(new Error(p.message || 'HTTP ' + res.status), { status: res.status, payload: p });
  }
  const data = JSON.parse(text);
  return data?.data?.content ?? data?.content ?? '';
}

async function rnBind(code, pid, bot) {
  const res = await fetch(RNAPI + '/wechat/bind/redeem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Internal-Token': ITOKEN },
    body: JSON.stringify({ code, peerId: pid, botAccountId: bot, source: 'bridge' })
  });
  const text = await res.text();
  if (!res.ok) {
    let p; try { p = JSON.parse(text); } catch { p = { message: text }; }
    throw Object.assign(new Error(p.message || 'HTTP ' + res.status), { status: res.status, payload: p });
  }
  return JSON.parse(text);
}

// message helpers
function exT(msg) {
  for (const item of (Array.isArray(msg.item_list) ? msg.item_list : [])) {
    if (item.type === 1 && item.text_item?.text) return item.text_item.text;
    if (item.type === 3 && item.voice_item?.recognized_text) return item.voice_item.recognized_text;
  }
  return null;
}
function isBind(t) {
  const l = t.toLowerCase();
  if (BKW.some(k => l.includes(k))) return true;
  if (/^[A-HJ-NP-Z2-9]{6}$/i.test(t.trim())) return true;
  return false;
}

async function handleInbound(msg) {
  const pid = msg.from_user_id;
  if (!pid || pid.endsWith('@im.bot')) return;
  const t = exT(msg);
  if (!t) return;
  const tx = t.trim();
  const c = msg.context_token;
  if (c) CTX = c;
  console.log('  ◀ inbound peer=%s text="%s" bind=%s ctx=%s', pid, tx.slice(0, 40), isBind(tx), String(c).slice(0, 15));

  let reply;
  if (isBind(tx)) {
    const m = tx.match(BRE);
    if (!m) {
      reply = '请把网页端生成的 6 位绑定码一起发过来，例如：绑定 ABC123';
    } else {
      try {
        await rnBind(m[1].toUpperCase(), pid, S.accountId);
        reply = '✅ 绑定成功！从现在起对话记录和网页端完全相同。';
        console.log('  ✔ bind ok');
      } catch (err) {
        reply = '❌ 绑定失败：' + (err.message || String(err));
        console.log('  ✘ bind failed:', err.message);
      }
    }
  } else {
    try {
      reply = await rnSend(pid, tx);
      console.log('  ✔ rnSend len=%d', reply.length);
    } catch (err) {
      console.log('  ✘ rnSend err:', err.message);
      reply = err.status === 404
        ? '你还没绑定账号，请从网页端生成绑定码发过来。'
        : '服务器错误：' + (err.message || String(err));
    }
  }

  if (!reply?.trim()) { console.log('  ↳ empty reply'); return; }
  await sendMessage(pid, reply, c).catch(err => console.error('💥 sendMessage:', err.message || err));
}

// login
async function login() {
  console.log('\n🔐 获取微信登录二维码...\n');
  // ★ v2: bot_type as query param (iLink may require it on the URL)
  const ep = 'ilink/bot/get_bot_qrcode?bot_type=' + encodeURIComponent(BTYPE);
  const q = await apiPost(ep, { bot_type: BTYPE }, '', 15_000);
  if (!q || !q.qrcode) throw new Error('Invalid QR response from iLink: ' + JSON.stringify(q || {}).slice(0, 200));
  let qr = q.qrcode, qu = q.qrcode_img_content;
  console.log('📱 QR:', qu);
  const dl = Date.now() + 5 * 60_000;
  let rf = 0;
  while (Date.now() < dl) {
    const s = await apiPost('ilink/bot/get_qrcode_status', { qrcode: qr }, '', 15_000);
    if (!s) continue;
    if (s.status === 'wait') { process.stdout.write('.'); }
    else if (s.status === 'scaned') { process.stdout.write('\n👀 已扫码，请确认...\n'); }
    else if (s.status === 'expired') {
      if (++rf > 3) throw new Error('二维码多次过期');
      console.log('\n⏳ 刷新 (' + rf + '/3)...');
      const n = await apiPost(ep, { bot_type: BTYPE }, '', 15_000);
      if (!n || !n.qrcode) throw new Error('Invalid QR refresh response from iLink');
      qr = n.qrcode; qu = n.qrcode_img_content;
      console.log('新URL:', qu);
    }
    else if (s.status === 'confirmed') {
      const td = { token: s.bot_token, baseUrl: s.baseurl || ILINK, accountId: s.ilink_bot_id, userId: s.ilink_user_id };
      save(td);
      console.log('\n✅ 已登录 Bot:', td.accountId);
      return td;
    }
    await T(1000);
  }
  throw new Error('登录超时');
}

// poll loop
async function poll() {
  LPR = true; BUF = ''; let c = 0;
  console.log('🟢 监听微信消息...');
  while (LPR) {
    try {
      const r = await apiPost('ilink/bot/getupdates', { get_updates_buf: BUF }, S.token, LPTO);
      c = 0;
      if (!r) continue;
      if (r.ret && r.ret !== 0) {
        if (r.ret === 401 || r.errcode === 401) { console.error('token失效'); LPR = false; return; }
        await T(1000);
        continue;
      }
      if (r.get_updates_buf) BUF = r.get_updates_buf;
      const ms = Array.isArray(r.msgs) ? r.msgs : [];
      if (ms.length) console.log('📬 %d msg(s)', ms.length);
      for (const m of ms) handleInbound(m).catch(e => console.error('💥 inbound:', e.message || e));
    } catch (err) {
      c++;
      const b = Math.min(60_000, 1000 * 2 ** Math.min(c, 6));
      console.error('poll err (%d): %s, sleep %dms', c, err.message, b);
      await T(b);
    }
  }
}

// QR for web
let PL = null;
async function startLogin() {
  // ★ v2: bot_type as query param (iLink may require it on the URL)
  const ep = 'ilink/bot/get_bot_qrcode?bot_type=' + encodeURIComponent(BTYPE);
  const r = await apiPost(ep, { bot_type: BTYPE }, '', 15_000);
  if (!r || !r.qrcode || !r.qrcode_img_content) {
    throw new Error('Invalid QR response from iLink: ' + JSON.stringify(r || {}).slice(0, 200));
  }
  PL = { qrcode: r.qrcode, qrcodeUrl: r.qrcode_img_content, exp: Date.now() + 5 * 60_000 };
  console.log('QR generated: ' + (r.qrcode_img_content || '').slice(0, 80));
  return { qrcode: PL.qrcode, qrcodeUrl: PL.qrcodeUrl };
}
async function checkLogin() {
  if (!PL) return { status: 'idle' };
  if (Date.now() > PL.exp) { PL = null; return { status: 'expired' }; }
  try {
    const s = await apiPost('ilink/bot/get_qrcode_status', { qrcode: PL.qrcode }, '', 15_000);
    if (!s) return { status: 'waiting' };
    if (s.status === 'confirmed') {
      const td = { token: s.bot_token, baseUrl: s.baseurl || ILINK, accountId: s.ilink_bot_id, userId: s.ilink_user_id };
      save(td); S = td; PL = null;
      poll().catch(e => console.error('poll crashed:', e));
      return { status: 'confirmed', accountId: td.accountId };
    }
    return { status: s.status === 'scaned' ? 'scaned' : 'waiting' };
  } catch { return { status: 'waiting' }; }
}

// HTTP server
function j(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(obj));
}
function rb(req) {
  return new Promise(r => {
    let b = ''; req.on('data', c => b += c); req.on('end', () => { try { r(JSON.parse(b)); } catch { r({}); } });
  });
}

const srv = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,X-Push-Token,X-Internal-Token' });
    return res.end();
  }
  const u = new URL(req.url, 'http://localhost');
  if (req.method === 'POST' && u.pathname === '/login/start') { try { const r = await startLogin(); j(res, 200, { ok: true, ...r }); } catch (e) { j(res, 500, { ok: false, error: e.message }); } return; }
  if (req.method === 'GET' && u.pathname === '/login/status') { try { const r = await checkLogin(); j(res, 200, { ok: true, ...r }); } catch (e) { j(res, 500, { ok: false, error: e.message }); } return; }

  const sup = req.headers['x-push-token'] || req.headers['x-internal-token'] || '';
  if (sup !== PTOKEN) { j(res, 401, { ok: false, error: 'unauthorized' }); return; }

  if (req.method === 'GET' && u.pathname === '/health') { j(res, 200, { ok: true, loggedIn: !!S, accountId: S?.accountId || null }); return; }
  if (req.method === 'POST' && u.pathname === '/push') {
    const b = await rb(req);
    if (!b.peerId || !b.text) { j(res, 400, { ok: false, error: 'peerId and text required' }); return; }
    if (!S) { j(res, 503, { ok: false, error: 'not logged in' }); return; }
    try { await sendMessage(b.peerId, b.text, undefined); j(res, 200, { ok: true }); } catch (e) { j(res, 500, { ok: false, error: e.message }); }
    return;
  }
  j(res, 404, { ok: false, error: 'not found' });
});

srv.listen(PPORT, '0.0.0.0', () => { console.log('🔔 Bridge HTTP :' + PPORT); });

const saved = load();
if (saved) { S = saved; console.log('Auto-login as bot ' + S.accountId); poll().catch(e => console.error('poll crashed:', e)); }
else { console.log('No saved token — waiting for POST /login/start'); }
