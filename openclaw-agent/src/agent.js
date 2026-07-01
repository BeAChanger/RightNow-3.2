// LLM Agent — StepFun function-calling loop with RightNow RPC tools

import { rpc } from "./rpc.js";
import { TOOLS, TOOL_RPC_MAP } from "./tools.js";
import { buildSystemPrompt } from "./prompt.js";

const LLM_BASE = process.env.OPENCLAW_LLM_BASE_URL ?? "https://api.stepfun.com/v1";
const LLM_KEY = process.env.OPENCLAW_LLM_API_KEY ?? "";
const LLM_MODEL = process.env.OPENCLAW_LLM_MODEL ?? "step-2-16k";

const MAX_TOOL_ROUNDS = 5;

// In-memory conversation store: chatId → messages[]
// In production, use Redis/DB with TTL
const conversations = new Map();
const CONVERSATION_TTL = 30 * 60 * 1000; // 30 minutes
const MAX_HISTORY = 20; // keep last N messages

function getHistory(chatId) {
  const entry = conversations.get(chatId);
  if (!entry) return [];
  if (Date.now() - entry.lastAt > CONVERSATION_TTL) {
    conversations.delete(chatId);
    return [];
  }
  return entry.messages;
}

function pushHistory(chatId, message) {
  let entry = conversations.get(chatId);
  if (!entry) {
    entry = { messages: [], lastAt: 0 };
    conversations.set(chatId, entry);
  }
  entry.messages.push(message);
  entry.lastAt = Date.now();
  // Trim
  if (entry.messages.length > MAX_HISTORY + 2) {
    // Keep system message + last MAX_HISTORY
    const systemMsg = entry.messages.find(m => m.role === "system");
    entry.messages = systemMsg
      ? [systemMsg, ...entry.messages.slice(-MAX_HISTORY)]
      : entry.messages.slice(-MAX_HISTORY);
  }
}

/**
 * Process a user message and return the assistant's reply text.
 *
 * @param {string} userText - The user's message content
 * @param {{ channel: string, channelUserId: string, channelChatId?: string }} channelCtx
 * @param {string} chatId - Unique conversation ID (feishu chat_id)
 * @returns {Promise<string>} The assistant's reply
 */
export async function processMessage(userText, channelCtx, chatId) {
  const systemPrompt = buildSystemPrompt();

  // Initialize or get conversation history
  let history = getHistory(chatId);
  if (history.length === 0) {
    history = [{ role: "system", content: systemPrompt }];
  }

  // Add user message
  const userMsg = { role: "user", content: userText };
  history.push(userMsg);
  pushHistory(chatId, userMsg);

  // Build messages for LLM
  const messages = [...history];

  let finalReply = "";

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    console.log(`[agent] Round ${round + 1}, messages: ${messages.length}`);

    const llmRes = await fetch(`${LLM_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LLM_KEY}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages,
        tools: TOOLS,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!llmRes.ok) {
      const errText = await llmRes.text();
      console.error(`[agent] LLM HTTP ${llmRes.status}: ${errText.slice(0, 200)}`);
      return "抱歉，我现在脑子有点转不过来，稍等片刻再试试？🥲";
    }

    const llmData = await llmRes.json();
    const choice = llmData.choices?.[0];
    if (!choice) {
      console.error("[agent] No choices in LLM response");
      return "抱歉，AI 服务返回格式异常，请稍后再试。";
    }

    const { message } = choice;

    // If no tool calls, this is the final answer
    if (!message.tool_calls || message.tool_calls.length === 0) {
      finalReply = message.content ?? "";
      // Save assistant reply to history
      pushHistory(chatId, { role: "assistant", content: finalReply });
      break;
    }

    // Process tool calls
    console.log(`[agent] ${message.tool_calls.length} tool call(s)`);

    // Add assistant message (with tool calls) to messages.
    // StepFun sometimes returns tool_calls whose function.arguments is null/missing,
    // then rejects its own payload next round with HTTP 400
    // "tool_calls.function.arguments is required". Normalize to a valid JSON string.
    const normalizedToolCalls = message.tool_calls.map((tc) => ({
      id: tc.id,
      type: tc.type ?? "function",
      function: {
        name: tc.function?.name ?? "",
        arguments:
          typeof tc.function?.arguments === "string" && tc.function.arguments.length > 0
            ? tc.function.arguments
            : "{}",
      },
    }));

    messages.push({
      role: "assistant",
      content: message.content ?? null,
      tool_calls: normalizedToolCalls,
    });

    for (const tc of normalizedToolCalls) {
      const toolName = tc.function?.name ?? "";
      const rpcTool = TOOL_RPC_MAP[toolName];

      if (!rpcTool) {
        console.error(`[agent] Unknown tool: ${toolName}`);
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify({ ok: false, error: { code: "UNKNOWN_TOOL", message: `Unknown: ${toolName}` } }),
        });
        continue;
      }

      let args = {};
      try {
        args = JSON.parse(tc.function?.arguments ?? "{}");
      } catch {
        args = {};
      }

      console.log(`[agent] Calling ${toolName} → ${rpcTool} with`, JSON.stringify(args).slice(0, 200));

      const result = await rpc(rpcTool, args, channelCtx);

      let toolContent;
      if (result?.ok) {
        toolContent = JSON.stringify({ ok: true, data: result.data, user: result.user });
      } else {
        toolContent = JSON.stringify({
          ok: false,
          error: result?.error ?? { code: "TOOL_ERROR", message: "Unknown error" },
        });
      }

      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: toolContent,
      });

      // If NOT_BOUND, stop processing — let LLM guide the user to bind first
      if (result?.error?.code === "NOT_BOUND") {
        console.log("[agent] User not bound, breaking tool loop");
      }
    }

    // Continue loop — LLM will process tool results and possibly call more tools or give final answer
  }

  if (!finalReply) {
    finalReply = "收到了！不过处理过程中遇到了一些问题，能再说一遍吗？😅";
    pushHistory(chatId, { role: "assistant", content: finalReply });
  }

  return finalReply;
}

/**
 * Clear conversation history for a chat (e.g., user says "reset" or unbinds)
 */
export function clearHistory(chatId) {
  conversations.delete(chatId);
}
