import { rpc } from "./rightnow-tools.runtime.js";

interface ToolDef {
  name: string;
  description: string;
  parameters: object;
  execute: (args: any, runtime: any) => Promise<any>;
}

export function createRightnowTools(): ToolDef[] {
  const mk = (
    name: string,
    backendTool: string,
    description: string,
    parameters: object,
  ): ToolDef => ({
    name,
    description,
    parameters,
    execute: async (args: any, runtime: any) => {
      // Extract channel context from the runtime (OpenClaw passes IM context here)
      const channel = runtime?.channel ?? runtime?.context?.channel ?? "";
      const channelUserId = runtime?.channelUserId ?? runtime?.context?.channelUserId ?? "";
      const channelChatId = runtime?.channelChatId ?? runtime?.context?.channelChatId;
      return rpc(backendTool, args ?? {}, { channel, channelUserId, channelChatId });
    },
  });

  return [
    // ── P0: Identity + Today Status ──
    mk(
      "rightnow_bind_email",
      "auth.bind",
      "用绑定码把当前 IM 账号绑定到 RightNow 用户。用户在 Web 端生成绑定码后，在 IM 中发送给小爪，小爪调用此工具完成绑定。",
      {
        type: "object",
        properties: {
          code: { type: "string", description: "Web 端生成的 8 位绑定码" },
        },
        required: ["code"],
      },
    ),
    mk(
      "rightnow_get_profile",
      "user.profile.get",
      "获取当前绑定用户的基础档案（姓名、邮箱、性别、身高、体重、年龄、体型等）。",
      { type: "object", properties: {} },
    ),
    mk(
      "rightnow_get_onboarding",
      "user.onboarding.get",
      "获取用户在 Web 端完成的详细建档信息（训练条件、饮食环境、力量锚点、目标等）。",
      { type: "object", properties: {} },
    ),
    mk(
      "rightnow_get_goal_image",
      "user.goal_image.get",
      "获取用户上传的体态图、面部图和理想身材图。",
      { type: "object", properties: {} },
    ),
    mk(
      "rightnow_get_context",
      "memory.context.assemble",
      "获取当前用户的完整上下文包：档案、训练/饮食计划、今日饮食摘要、今日待办、近期体重趋势。每次对话开始时应调用此工具加载用户状态。",
      { type: "object", properties: {} },
    ),
    mk(
      "rightnow_diet_summary_today",
      "diet.summary.today",
      "获取今日热量、蛋白质、脂肪、碳水合计。支持传入 date 参数查询指定日期。",
      {
        type: "object",
        properties: { date: { type: "string", description: "日期 YYYY-MM-DD，不传则为今天" } },
      },
    ),
    mk(
      "rightnow_log_diet",
      "diet.log.create",
      "写入一条饮食记录。name 和 calories 为必填，protein/fat/carbs/mealType 为可选。",
      {
        type: "object",
        properties: {
          name: { type: "string", description: "食物名称" },
          calories: { type: "number", description: "热量（千卡）" },
          protein: { type: "number", description: "蛋白质（克）" },
          fat: { type: "number", description: "脂肪（克）" },
          carbs: { type: "number", description: "碳水（克）" },
          mealType: { type: "string", description: "餐别：早餐/午餐/晚餐/加餐" },
          date: { type: "string", description: "日期 YYYY-MM-DD，不传则为今天" },
        },
        required: ["name", "calories"],
      },
    ),

    // ── P1: Diet + Training + Hydration ──
    mk(
      "rightnow_analyze_food_text",
      "diet.analyze.text",
      "用 AI 分析文字描述的食物，返回估算的热量、蛋白质、脂肪、碳水和餐别。",
      {
        type: "object",
        properties: {
          foodName: { type: "string", description: "食物名称" },
          description: { type: "string", description: "补充描述（份量、做法等）" },
        },
        required: ["foodName"],
      },
    ),
    mk(
      "rightnow_analyze_food_image",
      "diet.analyze.image",
      "用 AI 分析食物图片，返回估算的热量、蛋白质、脂肪、碳水和餐别。",
      {
        type: "object",
        properties: {
          imageBase64: { type: "string", description: "食物的 base64 图片数据" },
        },
        required: ["imageBase64"],
      },
    ),
    mk(
      "rightnow_get_diet_gap",
      "diet.gap.today",
      "获取今日饮食缺口：今天已摄入与目标宏量之间的差距，用于回答'还能吃什么'类问题。",
      {
        type: "object",
        properties: { date: { type: "string", description: "日期 YYYY-MM-DD" } },
      },
    ),
    mk(
      "rightnow_diet_recent_list",
      "diet.recent.list",
      "获取最近一段时间的饮食记录列表。",
      {
        type: "object",
        properties: { date: { type: "string", description: "日期 YYYY-MM-DD" } },
      },
    ),
    mk(
      "rightnow_get_today_training",
      "training.plan.today",
      "获取今日训练安排（TODO 列表中的训练任务）。",
      {
        type: "object",
        properties: { date: { type: "string", description: "日期 YYYY-MM-DD" } },
      },
    ),
    mk(
      "rightnow_start_training",
      "training.session.start",
      "开始一个新的训练会话。返回会话 ID、今日训练目标和最近同肌群训练记录。",
      { type: "object", properties: {} },
    ),
    mk(
      "rightnow_update_training",
      "training.session.update",
      "在训练会话中追加一条记录（动作、重量、次数、感受等）。",
      {
        type: "object",
        properties: {
          sessionId: { type: "string", description: "训练会话 ID" },
          message: { type: "string", description: "训练记录内容" },
        },
        required: ["sessionId", "message"],
      },
    ),
    mk(
      "rightnow_complete_training",
      "training.session.complete",
      "完成当前训练会话，写入训练记录并自动完成训练 TODO。",
      {
        type: "object",
        properties: {
          sessionId: { type: "string", description: "训练会话 ID" },
          description: { type: "string", description: "训练总结描述" },
          duration: { type: "number", description: "训练时长（分钟）" },
          date: { type: "string", description: "日期 YYYY-MM-DD" },
          targetMuscle: { type: "string", description: "目标肌群" },
        },
        required: ["sessionId"],
      },
    ),
    mk(
      "rightnow_recent_training_by_muscle",
      "training.recent.by_muscle",
      "查询指定肌群的最近训练记录，用于规划下次训练。",
      {
        type: "object",
        properties: {
          muscle: { type: "string", description: "目标肌群：chest/back/legs/shoulders/arms/core" },
          limit: { type: "number", description: "返回条数，默认 5" },
        },
      },
    ),
    mk(
      "rightnow_get_current_session",
      "training.session.current",
      "获取当前进行中的训练会话（如有）。",
      { type: "object", properties: {} },
    ),

    // ── Todos ──
    mk(
      "rightnow_get_today_todos",
      "todo.today.list",
      "获取今日待办事项列表（训练、饮食、饮水等）。",
      {
        type: "object",
        properties: { date: { type: "string", description: "日期 YYYY-MM-DD" } },
      },
    ),
    mk(
      "rightnow_complete_todo",
      "todo.complete",
      "完成一个待办事项。可通过 id 指定具体任务，或通过 category 自动完成该类别下的第一个未完成任务。",
      {
        type: "object",
        properties: {
          id: { type: "string", description: "任务 ID" },
          category: { type: "string", description: "任务类别：diet/water/training" },
          date: { type: "string", description: "日期 YYYY-MM-DD" },
        },
      },
    ),
    mk(
      "rightnow_create_todo",
      "todo.create",
      "创建一个新的待办事项。",
      {
        type: "object",
        properties: {
          title: { type: "string", description: "任务标题" },
          category: { type: "string", description: "任务类别" },
          date: { type: "string", description: "日期 YYYY-MM-DD" },
        },
        required: ["title"],
      },
    ),

    // ── Knowledge ──
    mk(
      "rightnow_search_knowledge",
      "knowledge.search",
      "搜索专业健身知识库（含 FAQ、减脂内核、营养学书籍）。用于训练计划、动作选择、平台期诊断、饮食建议等需要专业知识支撑的场景。",
      {
        type: "object",
        properties: {
          query: { type: "string", description: "搜索关键词" },
          topK: { type: "number", description: "返回数量，默认 5" },
          domain: { type: "string", description: "搜索域：nutrition/training/general" },
        },
        required: ["query"],
      },
    ),
  ];
}
