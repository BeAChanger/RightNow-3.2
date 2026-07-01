// Tool definitions for StepFun function calling (OpenAI-compatible format)
// Mirrors the tools defined in rightnow-tools.ts

export const TOOLS = [
  // ── P0: Identity + Context ──
  {
    type: "function",
    function: {
      name: "rightnow_bind_email",
      description: "用户明确发送8位绑定码时，把当前 IM 账号绑定到 RightNow 用户；不要主动要求邮箱或邮件流程。",
      parameters: {
        type: "object",
        properties: { code: { type: "string", description: "8位绑定码" } },
        required: ["code"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rightnow_get_context",
      description: "获取当前用户的完整上下文包：档案、训练/饮食计划、今日饮食摘要、今日待办、近期体重趋势。每次对话开始时应调用。",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "rightnow_get_profile",
      description: "获取当前绑定用户的基础档案（姓名、性别、身高、体重、年龄、体型等）。",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "rightnow_get_onboarding",
      description: "获取用户在 Web 端完成的详细建档信息（训练条件、饮食环境、力量锚点、目标等）。",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "rightnow_get_goal_image",
      description: "获取用户上传的体态图、面部图和理想身材图。",
      parameters: { type: "object", properties: {} },
    },
  },

  // ── P1: Diet ──
  {
    type: "function",
    function: {
      name: "rightnow_diet_summary_today",
      description: "获取今日热量、蛋白质、脂肪、碳水合计。",
      parameters: {
        type: "object",
        properties: { date: { type: "string", description: "日期 YYYY-MM-DD" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rightnow_log_diet",
      description: "写入一条饮食记录。name和calories为必填。请先展示分析结果给用户确认后再写入。",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "食物名称" },
          calories: { type: "number", description: "热量（千卡）" },
          protein: { type: "number", description: "蛋白质（克）" },
          fat: { type: "number", description: "脂肪（克）" },
          carbs: { type: "number", description: "碳水（克）" },
          mealType: { type: "string", description: "餐别：早餐/午餐/晚餐/加餐" },
          date: { type: "string", description: "日期 YYYY-MM-DD" },
        },
        required: ["name", "calories"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rightnow_analyze_food_text",
      description: "用 AI 分析文字描述的食物，返回估算的热量、蛋白质、脂肪、碳水和餐别。",
      parameters: {
        type: "object",
        properties: {
          foodName: { type: "string", description: "食物名称" },
          description: { type: "string", description: "补充描述（份量、做法等）" },
        },
        required: ["foodName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rightnow_analyze_food_image",
      description: "用 AI 分析食物图片，返回估算的营养成分。",
      parameters: {
        type: "object",
        properties: { imageBase64: { type: "string", description: "食物图片 base64" } },
        required: ["imageBase64"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rightnow_get_diet_gap",
      description: "获取今日饮食缺口：已摄入与目标宏量的差距。用于回答'还能吃什么'。",
      parameters: {
        type: "object",
        properties: { date: { type: "string", description: "日期 YYYY-MM-DD" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rightnow_diet_recent_list",
      description: "获取最近一段时间的饮食记录列表。",
      parameters: {
        type: "object",
        properties: { date: { type: "string", description: "日期 YYYY-MM-DD" } },
      },
    },
  },

  // ── Training ──
  {
    type: "function",
    function: {
      name: "rightnow_get_today_training",
      description: "获取今日训练安排（TODO 列表中的训练任务）。",
      parameters: {
        type: "object",
        properties: { date: { type: "string", description: "日期 YYYY-MM-DD" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rightnow_start_training",
      description: "开始一个新的训练会话。返回会话 ID、今日训练目标和最近同肌群训练记录。",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "rightnow_update_training",
      description: "在训练会话中追加一条记录（动作、重量、次数、感受等）。",
      parameters: {
        type: "object",
        properties: {
          sessionId: { type: "string", description: "训练会话 ID" },
          message: { type: "string", description: "训练记录内容" },
        },
        required: ["sessionId", "message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rightnow_complete_training",
      description: "完成当前训练会话，写入训练记录并自动完成训练 TODO。",
      parameters: {
        type: "object",
        properties: {
          sessionId: { type: "string", description: "训练会话 ID" },
          description: { type: "string", description: "训练总结描述" },
          duration: { type: "number", description: "训练时长（分钟）" },
          date: { type: "string", description: "日期 YYYY-MM-DD" },
          targetMuscle: { type: "string", description: "目标肌群：chest/back/legs/shoulders/arms/core" },
        },
        required: ["sessionId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rightnow_recent_training_by_muscle",
      description: "查询指定肌群的最近训练记录，用于规划下次训练。",
      parameters: {
        type: "object",
        properties: {
          muscle: { type: "string", description: "目标肌群：chest/back/legs/shoulders/arms/core" },
          limit: { type: "number", description: "返回条数，默认 5" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rightnow_get_current_session",
      description: "获取当前进行中的训练会话（如有）。",
      parameters: { type: "object", properties: {} },
    },
  },

  // ── Todos ──
  {
    type: "function",
    function: {
      name: "rightnow_get_today_todos",
      description: "获取今日待办事项列表（训练、饮食、饮水等）。",
      parameters: {
        type: "object",
        properties: { date: { type: "string", description: "日期 YYYY-MM-DD" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rightnow_complete_todo",
      description: "完成一个待办事项。",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "任务 ID" },
          category: { type: "string", description: "任务类别：diet/water/training" },
          date: { type: "string", description: "日期 YYYY-MM-DD" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rightnow_create_todo",
      description: "创建新的待办事项。",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "任务标题" },
          category: { type: "string", description: "任务类别" },
          date: { type: "string", description: "日期 YYYY-MM-DD" },
        },
        required: ["title"],
      },
    },
  },

  // ── Knowledge ──
  {
    type: "function",
    function: {
      name: "rightnow_search_knowledge",
      description: "搜索专业健身知识库（FAQ、减脂内核、营养学书籍）。训练计划、动作选择、平台期诊断必须先用此工具。",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "搜索关键词" },
          topK: { type: "number", description: "返回数量，默认 5" },
          domain: { type: "string", description: "搜索域：nutrition/training/general" },
        },
        required: ["query"],
      },
    },
  },
];

// Map frontend tool names (used by LLM) to backend RPC tool names
export const TOOL_RPC_MAP = {
  "rightnow_bind_email":             "auth.bind",
  "rightnow_get_profile":            "user.profile.get",
  "rightnow_get_onboarding":         "user.onboarding.get",
  "rightnow_get_goal_image":         "user.goal_image.get",
  "rightnow_get_context":            "memory.context.assemble",
  "rightnow_diet_summary_today":     "diet.summary.today",
  "rightnow_log_diet":               "diet.log.create",
  "rightnow_analyze_food_text":      "diet.analyze.text",
  "rightnow_analyze_food_image":     "diet.analyze.image",
  "rightnow_get_diet_gap":           "diet.gap.today",
  "rightnow_diet_recent_list":       "diet.recent.list",
  "rightnow_get_today_training":     "training.plan.today",
  "rightnow_start_training":         "training.session.start",
  "rightnow_update_training":        "training.session.update",
  "rightnow_complete_training":      "training.session.complete",
  "rightnow_recent_training_by_muscle": "training.recent.by_muscle",
  "rightnow_get_current_session":    "training.session.current",
  "rightnow_get_today_todos":        "todo.today.list",
  "rightnow_complete_todo":          "todo.complete",
  "rightnow_create_todo":            "todo.create",
  "rightnow_search_knowledge":       "knowledge.search",
};
