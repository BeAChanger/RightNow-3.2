// RightNow data tools - 20 tools calling backend RPC
import { existsSync, readFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { Type } from "typebox";

let rpcConfig = null;

function cleanString(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function isAgentSessionKey(value) {
  return !value || value.startsWith("agent:");
}

function normalizeUserId(value) {
  const raw = cleanString(value);
  if (!raw || isAgentSessionKey(raw)) return "";
  return raw.startsWith("openclaw/") ? raw.slice("openclaw/".length) : raw;
}

function resolveRpcIdentity(ctx) {
  const delivery = ctx?.deliveryContext || {};
  const channel =
    cleanString(ctx?.messageChannel) ||
    cleanString(delivery.channel) ||
    "web";

  const webUserId =
    normalizeUserId(ctx?.sessionKey) ||
    normalizeUserId(ctx?.agentId);

  let channelUserId =
    cleanString(ctx?.requesterSenderId) ||
    cleanString(delivery.to) ||
    cleanString(delivery.threadId == null ? "" : String(delivery.threadId)) ||
    webUserId ||
    cleanString(ctx?.sessionId) ||
    "p0-single-user";

  if (channel === "web" && webUserId) {
    channelUserId = webUserId;
  }

  return {
    channel,
    channelUserId,
    channelChatId:
      cleanString(delivery.threadId == null ? "" : String(delivery.threadId)) ||
      cleanString(delivery.to) ||
      undefined,
  };
}

function mimeFromPath(filePath) {
  switch (extname(filePath).toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".png":
    default:
      return "image/png";
  }
}

function resolveImagePath(rawPath) {
  const value = cleanString(rawPath);
  if (!value) return "";
  if (value.startsWith("media://inbound/")) {
    const fileName = basename(value.slice("media://inbound/".length));
    return join("/root/.openclaw/media/inbound", fileName);
  }
  return value;
}

function normalizeToolArgs(tool, args) {
  if (tool !== "diet.analyze.image" || !args || typeof args !== "object") {
    return args;
  }

  const next = { ...args };
  const rawImagePath =
    typeof next.imagePath === "string"
      ? next.imagePath.trim()
      : typeof next.MediaPath === "string"
        ? next.MediaPath.trim()
        : "";
  const imagePath = resolveImagePath(rawImagePath);

  if (!next.imageBase64 && imagePath) {
    if (!existsSync(imagePath)) {
      throw new Error(`image file not found: ${rawImagePath}`);
    }
    const base64 = readFileSync(imagePath).toString("base64");
    next.imageBase64 = `data:${mimeFromPath(imagePath)};base64,${base64}`;
  }

  delete next.imagePath;
  delete next.MediaPath;
  return next;
}

function isLargeKey(key) {
  const k = String(key).toLowerCase();
  return (
    k.includes("base64") ||
    k.includes("image") ||
    k.includes("avatar") ||
    k.includes("photo") ||
    k.includes("picture") ||
    k.includes("raw")
  );
}

function compactForModel(value, depth = 0, key = "") {
  if (value == null) return value;
  if (typeof value === "string") {
    if (value.startsWith("data:image/")) return `[image data omitted, ${value.length} chars]`;
    if (isLargeKey(key) && value.length > 120) return `[${key} omitted, ${value.length} chars]`;
    if (value.length > 1200) return value.slice(0, 1200) + `... [truncated ${value.length - 1200} chars]`;
    return value;
  }
  if (typeof value !== "object") return value;
  if (depth >= 5) return "[nested object omitted]";

  if (Array.isArray(value)) {
    const limit = 8;
    const items = value.slice(0, limit).map((item) => compactForModel(item, depth + 1, key));
    if (value.length > limit) items.push(`[${value.length - limit} more omitted]`);
    return items;
  }

  const out = {};
  for (const [childKey, childValue] of Object.entries(value)) {
    if (isLargeKey(childKey) && typeof childValue === "string" && childValue.length > 120) {
      out[childKey] = `[${childKey} omitted, ${childValue.length} chars]`;
      continue;
    }
    out[childKey] = compactForModel(childValue, depth + 1, childKey);
  }
  return out;
}

async function rpcCall(tool, args, ctx) {
  const cfg = rpcConfig;
  if (!cfg) throw new Error("RightNow plugin not configured");
  const identity = resolveRpcIdentity(ctx);

  const body = {
    tool,
    channel: identity.channel,
    channelUserId: identity.channelUserId,
    channelChatId: identity.channelChatId,
    args: normalizeToolArgs(tool, args),
  };

  const response = await fetch(cfg.rightnowApiBase + "/agent/rpc", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + cfg.agentServiceToken,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error("RPC error: " + response.status + " " + text.slice(0, 200));
  }

  const payload = await response.json();
  // Backend wraps: { success: true, data: { ok, user?, data?, error? } }
  if (payload && payload.data && typeof payload.data === "object") {
    return payload.data;
  }
  return payload;
}

function fmt(data) {
  const details = compactForModel(
    data && typeof data === "object" ? data : { raw: data }
  );
  const text = JSON.stringify(details, null, 2);
  return { content: [{ type: "text", text }], details };
}

// ── Tools ──

const TOOLS = [
  // ── P0: Identity + Context ──
  {
    name: "rightnow_bind_email",
    label: "Bind Email",
    description:
      "用户明确发送8位绑定码时，把当前 IM 账号绑定到 RightNow 用户；不要主动要求邮箱或邮件流程。",
    parameters: Type.Object(
      { code: Type.String({ description: "8位绑定码" }) },
      { additionalProperties: false }
    ),
  },
  {
    name: "rightnow_get_context",
    label: "Get Context",
    description:
      "获取当前用户的完整上下文包：档案、训练/饮食计划、今日饮食摘要、今日待办、近期体重趋势。每次对话开始时应调用。",
    parameters: Type.Object({}, { additionalProperties: false }),
  },
  {
    name: "rightnow_get_profile",
    label: "Get Profile",
    description:
      "获取当前绑定用户的基础档案（姓名、性别、身高、体重、年龄、体型等）。",
    parameters: Type.Object({}, { additionalProperties: false }),
  },
  {
    name: "rightnow_get_onboarding",
    label: "Get Onboarding",
    description:
      "获取用户在 Web 端完成的详细建档信息（训练条件、饮食环境、力量锚点、目标等）。",
    parameters: Type.Object({}, { additionalProperties: false }),
  },
  {
    name: "rightnow_get_goal_image",
    label: "Get Goal Image",
    description: "获取用户上传的体态图、面部图和理想身材图。",
    parameters: Type.Object({}, { additionalProperties: false }),
  },

  // ── P1: Diet ──
  {
    name: "rightnow_diet_summary_today",
    label: "Diet Summary Today",
    description: "获取今日热量、蛋白质、脂肪、碳水合计。",
    parameters: Type.Object(
      {
        date: Type.Optional(
          Type.String({ description: "日期 YYYY-MM-DD" })
        ),
      },
      { additionalProperties: false }
    ),
  },
  {
    name: "rightnow_log_diet",
    label: "Log Diet",
    description:
      "写入一条饮食记录。name和calories为必填。请先展示分析结果给用户确认后再写入。",
    parameters: Type.Object(
      {
        name: Type.String({ description: "食物名称" }),
        calories: Type.Number({ description: "热量（千卡）" }),
        protein: Type.Optional(
          Type.Number({ description: "蛋白质（克）" })
        ),
        fat: Type.Optional(Type.Number({ description: "脂肪（克）" })),
        carbs: Type.Optional(Type.Number({ description: "碳水（克）" })),
        mealType: Type.Optional(
          Type.String({ description: "餐别：早餐/午餐/晚餐/加餐" })
        ),
        date: Type.Optional(
          Type.String({ description: "日期 YYYY-MM-DD" })
        ),
      },
      { additionalProperties: false }
    ),
  },
  {
    name: "rightnow_analyze_food_text",
    label: "Analyze Food Text",
    description:
      "用 AI 分析文字描述的食物，返回估算的热量、蛋白质、脂肪、碳水和餐别。",
    parameters: Type.Object(
      {
        foodName: Type.String({ description: "食物名称" }),
        description: Type.Optional(
          Type.String({ description: "补充描述（份量、做法等）" })
        ),
      },
      { additionalProperties: false }
    ),
  },
  {
    name: "rightnow_analyze_food_image",
    label: "Analyze Food Image",
    description:
      "用 AI 分析食物图片，返回估算的营养成分。可传 imageBase64；如果消息上下文提供 MediaPath/本地图片路径，也可传 imagePath 或 MediaPath。",
    parameters: Type.Object(
      {
        imageBase64: Type.Optional(Type.String({ description: "食物图片 base64 或 data URL" })),
        imagePath: Type.Optional(Type.String({ description: "OpenClaw 提供的本地食物图片路径" })),
        MediaPath: Type.Optional(Type.String({ description: "OpenClaw 上下文里的 MediaPath" })),
      },
      { additionalProperties: false }
    ),
  },
  {
    name: "rightnow_get_diet_gap",
    label: "Get Diet Gap",
    description:
      "获取今日饮食缺口：已摄入与目标宏量的差距。用于回答还能吃什么。",
    parameters: Type.Object(
      {
        date: Type.Optional(
          Type.String({ description: "日期 YYYY-MM-DD" })
        ),
      },
      { additionalProperties: false }
    ),
  },
  {
    name: "rightnow_diet_recent_list",
    label: "Diet Recent List",
    description: "获取最近一段时间的饮食记录列表。",
    parameters: Type.Object(
      {
        date: Type.Optional(
          Type.String({ description: "日期 YYYY-MM-DD" })
        ),
      },
      { additionalProperties: false }
    ),
  },

  // ── P2: Training ──
  {
    name: "rightnow_get_today_training",
    label: "Get Today Training",
    description: "获取今日训练安排（TODO 列表中的训练任务）。",
    parameters: Type.Object(
      {
        date: Type.Optional(
          Type.String({ description: "日期 YYYY-MM-DD" })
        ),
      },
      { additionalProperties: false }
    ),
  },
  {
    name: "rightnow_start_training",
    label: "Start Training",
    description:
      "开始一个新的训练会话。返回会话 ID、今日训练目标和最近同肌群训练记录。",
    parameters: Type.Object({}, { additionalProperties: false }),
  },
  {
    name: "rightnow_update_training",
    label: "Update Training",
    description:
      "在训练会话中追加一条记录（动作、重量、次数、感受等）。",
    parameters: Type.Object(
      {
        sessionId: Type.String({ description: "训练会话 ID" }),
        message: Type.String({ description: "训练记录内容" }),
      },
      { additionalProperties: false }
    ),
  },
  {
    name: "rightnow_complete_training",
    label: "Complete Training",
    description:
      "完成当前训练会话，写入训练记录并自动完成训练 TODO。",
    parameters: Type.Object(
      {
        sessionId: Type.String({ description: "训练会话 ID" }),
        description: Type.Optional(
          Type.String({ description: "训练总结描述" })
        ),
        duration: Type.Optional(
          Type.Number({ description: "训练时长（分钟）" })
        ),
        date: Type.Optional(
          Type.String({ description: "日期 YYYY-MM-DD" })
        ),
        targetMuscle: Type.Optional(
          Type.String({
            description: "目标肌群：chest/back/legs/shoulders/arms/core",
          })
        ),
      },
      { additionalProperties: false }
    ),
  },
  {
    name: "rightnow_recent_training_by_muscle",
    label: "Recent Training By Muscle",
    description: "查询指定肌群的最近训练记录，用于规划下次训练。",
    parameters: Type.Object(
      {
        muscle: Type.String({
          description:
            "目标肌群：chest/back/legs/shoulders/arms/core",
        }),
        limit: Type.Optional(
          Type.Number({ description: "返回条数，默认 5" })
        ),
      },
      { additionalProperties: false }
    ),
  },
  {
    name: "rightnow_get_current_session",
    label: "Get Current Session",
    description: "获取当前进行中的训练会话（如有）。",
    parameters: Type.Object({}, { additionalProperties: false }),
  },

  // ── P3: Todos ──
  {
    name: "rightnow_get_today_todos",
    label: "Get Today Todos",
    description: "获取今日待办事项列表（训练、饮食、饮水等）。",
    parameters: Type.Object(
      {
        date: Type.Optional(
          Type.String({ description: "日期 YYYY-MM-DD" })
        ),
      },
      { additionalProperties: false }
    ),
  },
  {
    name: "rightnow_complete_todo",
    label: "Complete Todo",
    description: "完成一个待办事项。",
    parameters: Type.Object(
      {
        id: Type.String({ description: "任务 ID" }),
        category: Type.Optional(
          Type.String({ description: "任务类别：diet/water/training" })
        ),
        date: Type.Optional(
          Type.String({ description: "日期 YYYY-MM-DD" })
        ),
      },
      { additionalProperties: false }
    ),
  },
  {
    name: "rightnow_create_todo",
    label: "Create Todo",
    description: "创建新的待办事项。",
    parameters: Type.Object(
      {
        title: Type.String({ description: "任务标题" }),
        category: Type.Optional(
          Type.String({ description: "任务类别" })
        ),
        date: Type.Optional(
          Type.String({ description: "日期 YYYY-MM-DD" })
        ),
      },
      { additionalProperties: false }
    ),
  },
];

// RPC name map
const TOOL_RPC_MAP = {
  rightnow_bind_email: "auth.bind",
  rightnow_get_profile: "user.profile.get",
  rightnow_get_onboarding: "user.onboarding.get",
  rightnow_get_goal_image: "user.goal_image.get",
  rightnow_get_context: "memory.context.assemble",
  rightnow_diet_summary_today: "diet.summary.today",
  rightnow_log_diet: "diet.log.create",
  rightnow_analyze_food_text: "diet.analyze.text",
  rightnow_analyze_food_image: "diet.analyze.image",
  rightnow_get_diet_gap: "diet.gap.today",
  rightnow_diet_recent_list: "diet.recent.list",
  rightnow_get_today_training: "training.plan.today",
  rightnow_start_training: "training.session.start",
  rightnow_update_training: "training.session.update",
  rightnow_complete_training: "training.session.complete",
  rightnow_recent_training_by_muscle: "training.recent.by_muscle",
  rightnow_get_current_session: "training.session.current",
  rightnow_get_today_todos: "todo.today.list",
  rightnow_complete_todo: "todo.complete",
  rightnow_create_todo: "todo.create",
};

export function registerRightNowTools(api, config) {
  rpcConfig = config;

  for (const def of TOOLS) {
    const rpcName = TOOL_RPC_MAP[def.name];
    api.registerTool(
      (ctx) => ({
        name: def.name,
        label: def.label,
        description: def.description,
        parameters: def.parameters,
        async execute(_toolCallId, params, _signal) {
          const result = await rpcCall(rpcName, params, ctx);
          return fmt(result);
        },
      }),
      { name: def.name }
    );
  }
}
