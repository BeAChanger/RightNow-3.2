// RightNow RPC client — calls POST /api/agent/rpc on backend

const BASE = process.env.RIGHTNOW_API_BASE ?? "http://backend:5000/api";
const TOKEN = process.env.AGENT_SERVICE_TOKEN ?? "";

/**
 * Call a RightNow Agent RPC tool.
 * Returns { ok, user?, data?, error? }
 */
export async function rpc(tool, args = {}, channelCtx = {}) {
  const { channel = "", channelUserId = "", channelChatId } = channelCtx;

  const body = {
    channel,
    channelUserId,
    channelChatId: channelChatId ?? undefined,
    tool,
    args,
  };

  const res = await fetch(`${BASE}/agent/rpc`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error(`[rpc] ${tool} HTTP ${res.status}`);
    return { ok: false, error: { code: "HTTP_ERROR", message: `RPC HTTP ${res.status}` } };
  }

  const payload = await res.json();
  // Backend wraps: { success: true, data: { ok, user?, data?, error? } }
  if (payload?.data && typeof payload.data === "object") {
    return payload.data;
  }
  return payload;
}
