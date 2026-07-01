export async function rpc(
  tool: string,
  args: Record<string, unknown>,
  channelCtx: { channel: string; channelUserId: string; channelChatId?: string },
) {
  const base = process.env.RIGHTNOW_API_BASE ?? "http://backend:5000/api";
  const token = process.env.AGENT_SERVICE_TOKEN ?? "";
  const res = await fetch(`${base}/agent/rpc`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      channel: channelCtx.channel,
      channelUserId: channelCtx.channelUserId,
      channelChatId: channelCtx.channelChatId,
      tool,
      args,
    }),
  });
  if (!res.ok) {
    throw new Error(`RightNow RPC ${tool} HTTP ${res.status}`);
  }
  // Backend wraps as { success: true, data: { ok, user?, data?, error? } }
  // Unwrap one layer; the inner { ok, data } is the actual response
  const payload: any = await res.json();
  if (payload?.data && typeof payload.data === "object") {
    return payload.data as { ok: boolean; user?: unknown; data?: unknown; error?: { code: string; message: string } };
  }
  return payload;
}
