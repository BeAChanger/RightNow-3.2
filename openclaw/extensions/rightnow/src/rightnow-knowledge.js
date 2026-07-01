// RightNow knowledge-base tools - 3 tools calling RAG service directly
import { Type } from "typebox";

let ragConfig = null;

async function searchRAG(collection, query, topK, minScore) {
  const cfg = ragConfig;
  if (!cfg) throw new Error("RightNow plugin not configured");

  const body = {
    collection,
    query,
    top_k: topK,
  };
  if (minScore !== undefined && minScore > 0) {
    body.score_threshold = minScore;
  }

  const response = await fetch(cfg.ragServiceUrl + "/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error("RAG error: " + response.status + " " + text.slice(0, 200));
  }

  return response.json();
}

function fmt(data) {
  const text = JSON.stringify(data, null, 2);
  return { content: [{ type: "text", text }], details: data };
}

// ── Tools ──

function createSearchFaqTool() {
  return {
    name: "search_faq",
    label: "Search FAQ",
    description:
      "搜索常见健身问题（FAQ精炼答案，高精度快速匹配）。适合用户问常见问题：怎么减脂、平台期怎么办等。优先使用此工具。",
    parameters: Type.Object(
      {
        query: Type.String({ description: "搜索关键词" }),
        topK: Type.Optional(
          Type.Number({ description: "返回结果数，默认5" })
        ),
        minScore: Type.Optional(
          Type.Number({ description: "最低相似度阈值，默认0.5" })
        ),
      },
      { additionalProperties: false }
    ),
    async execute(_toolCallId, params, _signal) {
      const p = params;
      const result = await searchRAG(
        "kb_l1_faq",
        p.query,
        p.topK ?? 5,
        p.minScore ?? 0.5
      );
      return fmt(result);
    },
  };
}

function createSearchCoreTheoryTool() {
  return {
    name: "search_core_theory",
    label: "Search Core Theory",
    description:
      "搜索健身核心理论（训练计划原理、动作选择、饮食原理等）。适合需要深入理论支撑的问题。当 FAQ 无结果时使用。",
    parameters: Type.Object(
      {
        query: Type.String({ description: "搜索关键词" }),
        topK: Type.Optional(
          Type.Number({ description: "返回结果数，默认5" })
        ),
        minScore: Type.Optional(
          Type.Number({ description: "最低相似度阈值，默认0.3" })
        ),
      },
      { additionalProperties: false }
    ),
    async execute(_toolCallId, params, _signal) {
      const p = params;
      const result = await searchRAG(
        "kb_l2_core",
        p.query,
        p.topK ?? 5,
        p.minScore ?? 0.3
      );
      return fmt(result);
    },
  };
}

function createSearchBooksTool() {
  return {
    name: "search_books",
    label: "Search Books",
    description:
      "搜索深度营养学知识库（营养学全书、研究报告、健身博客）。适合复杂的营养学问题。",
    parameters: Type.Object(
      {
        query: Type.String({ description: "搜索关键词" }),
        topK: Type.Optional(
          Type.Number({ description: "返回结果数，默认5" })
        ),
      },
      { additionalProperties: false }
    ),
    async execute(_toolCallId, params, _signal) {
      const p = params;
      const result = await searchRAG(
        "kb_l3_books",
        p.query,
        p.topK ?? 5,
        undefined
      );
      return fmt(result);
    },
  };
}

export function registerKnowledgeTools(api, config) {
  ragConfig = config;

  const tools = [
    createSearchFaqTool(),
    createSearchCoreTheoryTool(),
    createSearchBooksTool(),
  ];

  for (const tool of tools) {
    api.registerTool(tool, { name: tool.name });
  }
}
