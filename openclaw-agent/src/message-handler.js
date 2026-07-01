// Shared IM message handler — used by Feishu webhook and Feishu long connection

import { processMessage } from "./agent.js";

/**
 * Process one normalized IM message and send a text reply.
 *
 * @param {{ messageId: string, chatId: string, senderId: string, text: string }} msg
 * @param {(messageId: string, text: string, msg: object) => Promise<{ok: boolean, data?: unknown, error?: unknown}>} replyFn
 * @param {{ source?: string }} options
 */
export async function handleIncomingMessage(msg, replyFn, options = {}) {
  const source = options.source ?? "im";

  console.log(`[${source}] Message from ${msg.senderId} in ${msg.chatId}: ${msg.text.slice(0, 100)}`);

  try {
    const channelCtx = {
      channel: "feishu",
      channelUserId: msg.senderId,
      channelChatId: msg.chatId,
    };

    const reply = await processMessage(msg.text, channelCtx, msg.chatId);

    console.log(`[${source}] Reply (${reply.length} chars): ${reply.slice(0, 150)}`);

    const sent = await replyFn(msg.messageId, reply, msg);
    if (!sent?.ok) {
      console.error(`[${source}] Failed to send reply:`, sent?.data ?? sent?.error ?? sent);
    }
  } catch (err) {
    console.error(`[${source}] Error processing message:`, err);
    try {
      await replyFn(msg.messageId, "抱歉，处理你的消息时出了点问题，稍等一下再试试～🥲", msg);
    } catch {
      // ignore send failure
    }
  }
}
