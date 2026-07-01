// Feishu long connection (WebSocket) client
// Receives Feishu events without a public webhook URL and reuses the same agent pipeline.

import * as Lark from "@larksuiteoapi/node-sdk";
import { handleIncomingMessage } from "./message-handler.js";

const APP_ID = process.env.FEISHU_APP_ID ?? "";
const APP_SECRET = process.env.FEISHU_APP_SECRET ?? "";

let channel = null;
let started = false;

function isConfigured() {
  return Boolean(APP_ID && APP_SECRET);
}

function normalizeChannelMessage(message) {
  const text = (message.content ?? "").trim();
  if (!text || text === "[unsupported message]") return null;

  return {
    messageId: message.messageId,
    chatId: message.chatId,
    text,
    senderId: message.senderId,
    chatType: message.chatType ?? "p2p",
  };
}

async function sendChannelReply(messageId, text, msg) {
  if (!channel) return { ok: false, error: "ws_not_started" };

  try {
    const data = await channel.send(
      msg.chatId,
      { text },
      { replyTo: messageId },
    );
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err?.message ?? String(err) };
  }
}

/**
 * Start Feishu persistent connection. Safe to call once during server boot.
 */
export async function startFeishuLongConnection() {
  if (started) return channel;
  started = true;

  if (!isConfigured()) {
    console.error("[feishu-ws] FEISHU_APP_ID / FEISHU_APP_SECRET missing; long connection disabled");
    return null;
  }

  channel = Lark.createLarkChannel({
    appId: APP_ID,
    appSecret: APP_SECRET,
    loggerLevel: Lark.LoggerLevel.info,
    source: "rightnow-xiaozhua",
    includeRawEvent: false,
    policy: {
      dmMode: "open",
      requireMention: false,
      respondToMentionAll: true,
    },
  });

  channel.on({
    message: async (message) => {
      const msg = normalizeChannelMessage(message);
      if (!msg) {
        console.log("[feishu-ws] Ignored empty or unsupported message");
        return;
      }

      // Acknowledge the WebSocket push quickly; run the slow LLM/RPC work async.
      setImmediate(() => {
        handleIncomingMessage(msg, sendChannelReply, { source: "feishu-ws" });
      });
    },
    reconnecting: () => console.warn("[feishu-ws] reconnecting..."),
    reconnected: () => console.log("[feishu-ws] reconnected"),
    error: (err) => console.error("[feishu-ws] error:", err),
    reject: (evt) => console.warn("[feishu-ws] rejected message:", evt),
  });

  console.log("[feishu-ws] Starting Feishu long connection...");
  await channel.connect();
  console.log("[feishu-ws] Feishu long connection ready");
  return channel;
}

export function getFeishuLongConnectionStatus() {
  if (!channel) {
    return { enabled: false, state: started ? "not_configured" : "not_started" };
  }

  return {
    enabled: true,
    ...channel.getConnectionStatus(),
  };
}

export async function stopFeishuLongConnection() {
  if (!channel) return;
  await channel.disconnect();
  channel = null;
  started = false;
}
