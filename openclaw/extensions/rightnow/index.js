// RightNow plugin entrypoint
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { registerRightNowTools } from "./src/rightnow-tools.js";
import { registerKnowledgeTools } from "./src/rightnow-knowledge.js";

function resolveConfig(api) {
  const cfg = api.pluginConfig || {};
  return {
    rightnowApiBase:
      cfg.rightnowApiBase ||
      process.env.RIGHTNOW_API_BASE ||
      "http://backend:5000/api",
    agentServiceToken:
      cfg.agentServiceToken || process.env.AGENT_SERVICE_TOKEN || "",
    ragServiceUrl:
      cfg.ragServiceUrl || process.env.RAG_SERVICE_URL || "http://rag:8000",
  };
}

export default definePluginEntry({
  id: "rightnow",
  name: "RightNow Fitness Coach",
  description:
    "RightNow fitness platform data tools and knowledge base integration",
  register(api) {
    const config = resolveConfig(api);

    registerRightNowTools(api, config);
    registerKnowledgeTools(api, config);

    api.registerMemoryPromptSupplement(({ availableTools }) => {
      const lines = [];
      const dataTools = [...availableTools].filter((t) =>
        t.startsWith("rightnow_")
      );
      const kbTools = [...availableTools].filter((t) =>
        t.startsWith("search_")
      );

      if (dataTools.length === 0 && kbTools.length === 0) return lines;

      lines.push("## RightNow 健身教练专用工具");
      lines.push("");

      if (dataTools.length > 0) {
        lines.push("### 数据工具");
        lines.push(
          "你通过 rightnow_ 系列工具读写用户的健身数据。这些工具直接操作 RightNow 后端数据库。"
        );
        lines.push("");
        lines.push("### 核心流程");
        lines.push(
          "1. 每条消息开始时 -> 调用 rightnow_get_context 获取用户最新数据"
        );
        lines.push(
          "2. 用户要记录饮食 -> 先 rightnow_analyze_food_text 分析 -> 展示结果 -> 用户确认 -> rightnow_log_diet"
        );
        lines.push(
          "3. 用户要训练 -> rightnow_start_training -> 记录动作 -> rightnow_complete_training"
        );
        lines.push("4. 用户提到绑定码 -> rightnow_bind_email");
        lines.push("");
      }

      if (kbTools.length > 0) {
        lines.push("### 知识库工具");
        lines.push(
          "- search_faq: 优先使用。适合用户问常见问题（怎么减脂、平台期怎么办、什么动作练胸）。使用较高的 minScore (0.5+) 以获得精确匹配。"
        );
        lines.push(
          "- search_core_theory: 当 FAQ 无结果或需要更深入理论时使用。"
        );
        lines.push(
          "- search_books: 当需要深度营养学知识时使用。"
        );
        lines.push("");
      }

      return lines;
    });
  },
});
