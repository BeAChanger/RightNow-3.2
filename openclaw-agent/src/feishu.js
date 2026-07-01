// Feishu (飞书) API client and webhook event handler

import crypto from "node:crypto";

const APP_ID = process.env.FEISHU_APP_ID ?? "";
const APP_SECRET = process.env.FEISHU_APP_SECRET ?? "";
const ENCRYPT_KEY = process.env.FEISHU_ENCRYPT_KEY ?? ""; // base64, from Feishu console "Event Subscriptions"

// ── Token management ──

let cachedToken = null;
let tokenExpiresAt = 0;

export async function getTenantToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const res = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
  });

  if (!res.ok) {
    console.error(`[feishu] Token fetch HTTP ${res.status}`);
    return null;
  }

  const data = await res.json();
  if (data.code !== 0) {
    console.error(`[feishu] Token error: ${data.code} ${data.msg}`);
    return null;
  }

  cachedToken = data.tenant_access_token;
  tokenExpiresAt = Date.now() + (data.expire ?? 7200) * 1000;
  return cachedToken;
}

// ── Send reply message ──

export async function sendReply(messageId, text) {
  const token = await getTenantToken();
  if (!token) return { ok: false, error: "no_token" };

  const content = JSON.stringify({ text });

  const res = await fetch(
    `https://open.feishu.cn/open-apis/im/v1/messages/${messageId}/reply`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content, msg_type: "text" }),
    },
  );

  const data = await res.json();
  return { ok: data.code === 0, data };
}

// ── Send message to chat ──

export async function sendToChat(chatId, text) {
  const token = await getTenantToken();
  if (!token) return { ok: false, error: "no_token" };

  const content = JSON.stringify({ text });

  const res = await fetch(
    "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ receive_id: chatId, content, msg_type: "text" }),
    },
  );

  const data = await res.json();
  return { ok: data.code === 0, data };
}

// ── Event decryption (Feishu AES-256-CBC) ──

function decrypt(encryptedText) {
  if (!ENCRYPT_KEY) return null;

  try {
    const key = Buffer.from(ENCRYPT_KEY, "base64"); // 32 bytes
    const buf = Buffer.from(encryptedText, "base64");
    const iv = buf.subarray(0, 16);
    const ciphertext = buf.subarray(16);

    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    decipher.setAutoPadding(true);

    let decrypted = decipher.update(ciphertext, undefined, "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (e) {
    console.error("[feishu] Decrypt failed:", e.message);
    return null;
  }
}

// ── Parse incoming webhook body ──

export function parseEvent(rawBody) {
  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return null;
  }

  // 1. Try encrypted format: { encrypt: "..." }
  if (body.encrypt) {
    const plain = decrypt(body.encrypt);
    if (!plain) return null;
    try {
      body = JSON.parse(plain);
    } catch {
      return null;
    }
  }

  return body;
}

// ── Handle URL verification challenge ──

export function handleChallenge(body) {
  // Plain mode: { type: "url_verification", challenge: "..." }
  if (body.type === "url_verification" && body.challenge) {
    return { challenge: body.challenge };
  }

  // Encrypted mode: the decrypt step above handles it, then body will have challenge
  if (body.challenge) {
    return { challenge: body.challenge };
  }

  return null;
}

// ── Extract message from event ──

export function extractMessage(body) {
  // Event v2 format
  if (body.schema === "2.0" && body.header?.event_type === "im.message.receive_v1") {
    const event = body.event;
    const msg = event?.message;
    if (!msg) return null;

    let text = "";
    try {
      const content = typeof msg.content === "string" ? JSON.parse(msg.content) : msg.content;
      text = content?.text ?? "";
    } catch {
      text = "";
    }

    if (!text) return null;

    return {
      messageId: msg.message_id,
      chatId: msg.chat_id,
      text,
      senderId: event.sender?.sender_id?.open_id ?? event.sender?.sender_id?.user_id ?? "",
      chatType: msg.chat_type ?? "p2p",
    };
  }

  // Event v1 format or other
  if (body.type === "event_callback" && body.event?.type === "message") {
    const msg = body.event;
    return {
      messageId: msg.message_id ?? msg.open_message_id,
      chatId: msg.chat_id ?? msg.open_chat_id,
      text: msg.text ?? msg.content ?? "",
      senderId: msg.user_id ?? msg.open_id ?? "",
      chatType: msg.chat_type ?? "p2p",
    };
  }

  return null;
}
