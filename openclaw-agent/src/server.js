// 小爪 Gateway — Express server
// Handles Feishu webhooks / long connection, processes messages through StepFun LLM with RightNow RPC tools

import express from "express";
import { parseEvent, handleChallenge, extractMessage, sendReply } from "./feishu.js";
import { startFeishuLongConnection, getFeishuLongConnectionStatus } from "./feishu-ws.js";
import { handleIncomingMessage } from "./message-handler.js";

const PORT = parseInt(process.env.PORT ?? "18789", 10);
const FEISHU_SUBSCRIPTION_MODE = (process.env.FEISHU_SUBSCRIPTION_MODE ?? "websocket").toLowerCase();

const app = express();

// ── Raw body capture (needed for Feishu event verification) ──
app.use(express.raw({ type: "*/*", limit: "1mb" }));

// ── Health check ──
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    feishu: {
      appId: process.env.FEISHU_APP_ID ? "configured" : "missing",
      secret: process.env.FEISHU_APP_SECRET ? "configured" : "missing",
      subscriptionMode: FEISHU_SUBSCRIPTION_MODE,
      longConnection: getFeishuLongConnectionStatus(),
    },
    llm: {
      model: process.env.OPENCLAW_LLM_MODEL ?? "step-2-16k",
      base: process.env.OPENCLAW_LLM_BASE_URL ?? "https://api.stepfun.com/v1",
      key: process.env.OPENCLAW_LLM_API_KEY ? "configured" : "missing",
    },
    rpc: {
      base: process.env.RIGHTNOW_API_BASE ?? "http://backend:5000/api",
      token: process.env.AGENT_SERVICE_TOKEN ? "configured" : "MISSING",
    },
  });
});

// ── Shared Feishu webhook handler ──
const feishuHandler = async (req, res) => {
  // Convert raw Buffer body to string
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf-8") : String(req.body ?? "");

  console.log(`[webhook] Received: ${rawBody.slice(0, 300)}`);

  // 1. Parse event (handle encryption if applicable)
  const event = parseEvent(rawBody);
  if (!event) {
    console.error("[webhook] Failed to parse event body");
    return res.status(400).json({ error: "bad_request" });
  }

  // 2. Handle URL verification challenge
  const challenge = handleChallenge(event);
  if (challenge) {
    console.log(`[webhook] URL challenge: ${challenge.challenge}`);
    return res.json(challenge);
  }

  // 3. Extract message
  const msg = extractMessage(event);
  if (!msg) {
    // Not a message event (could be other event types we don't handle)
    console.log("[webhook] Non-message event, ignoring");
    return res.json({ code: 0 });
  }

  // 4. Respond to Feishu immediately (within 3s to avoid timeout)
  res.json({ code: 0 });

  // 5. Process message asynchronously
  setImmediate(() => {
    handleIncomingMessage(msg, sendReply, { source: "webhook" });
  });
};

// Register on both paths: /feishu (nginx strips /imhook prefix), /imhook/feishu (direct)
app.post("/feishu", feishuHandler);
app.post("/imhook/feishu", feishuHandler);

// ── Start ──
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[gateway] 小爪 Gateway listening on :${PORT}`);
  console.log(`[gateway] LLM: ${process.env.OPENCLAW_LLM_MODEL ?? "step-2-16k"} @ ${process.env.OPENCLAW_LLM_BASE_URL ?? "https://api.stepfun.com/v1"}`);
  console.log(`[gateway] RPC: ${process.env.RIGHTNOW_API_BASE ?? "http://backend:5000/api"}`);
  console.log(`[gateway] Feishu app: ${process.env.FEISHU_APP_ID ? "configured ✅" : "NOT configured ❌"}`);
  console.log(`[gateway] Feishu subscription mode: ${FEISHU_SUBSCRIPTION_MODE}`);
});

if (["ws", "websocket", "long_connection", "long-connection"].includes(FEISHU_SUBSCRIPTION_MODE)) {
  startFeishuLongConnection().catch(err => {
    console.error("[gateway] Failed to start Feishu long connection:", err);
  });
}
