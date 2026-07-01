// RightNow knowledge-base tools — 3 tools that call the RAG service directly.
import { Type } from "typebox";
import type { AnyAgentTool, OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";
import type { RightNowPluginConfig } from "../index.js";

let ragConfig: RightNowPluginConfig | null = null;

// ── RAG call ──

interface RagSearchParams {
  collection: string;
  query: string;
  top_k: number;
  score_threshold?: number;
}

async function searchRAG(params: RagSearchParams): Promise<unknown> {
  const config = ragConfig;
  if (!config) throw new Error("RightNow plugin not configured");

  const body: Record<string, unknown> = {
    collection: params.collection,
    query: params.query,
    top_k: params.top_k,
  };
  if (params.score_threshold !== undefined && params.score_threshold > 0) {
    body.score_threshold = params.score_threshold;
  }

  const response = await fetch(`${config.ragServiceUrl}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`RAG error: ${response.status} ${await response.text().catch(() => "")}`);
  }

  return response.json();
}

function formatRagResult(data: unknown): { content: { type: "text"; text: string }[]; details: unknown } {
  const text = JSON.stringify(data, null, 2);
  return {
    content: [{ type: "text" as const, text }],
    details: data,
  };
}

// ── Tools ──

function createSearchFaqTool(): AnyAgentTool {
  return {
    name: "search_faq",
    label: "Search FAQ",
    description:
      "搜索常见健身问题（FAQ精炼答案，高精度快速匹配）。适合用户问常见问题：怎么减脂、平台期怎么办等。优先使用此工具。",
    parameters: Type.Object({
      query: Type.String({ description: "搜索关键词" }),
      topK: Type.Optional(Type.Number({ description: "返回结果数，默认5" })),
      minScore: Type.Optional(Type.Number({ description: "最低相似度阈值，默认0.5" })),
    }, { additionalProperties: false }),
    execute: async (_toolCallId, rawParams, _signal) => {
      const params = rawParams as { query: string; topK?: number; minScore?: number };
      const result = await searchRAG({
        collection: "kb_l1_faq",
        query: params.query,
        top_k: params.topK ?? 5,
        score_threshold: params.minScore ?? 0.5,
      });
      return formatRagResult(result);
    },
  };
}

function createSearchCoreTheoryTool(): AnyAgentTool {
  return {
    name: "search_core_theory",
    label: "Search Core Theory",
    description:
      "搜索健身核心理论（训练计划原理、动作选择、饮食原理等）。适合需要深入理论支撑的问题。当 FAQ 无结果时使用。",
    parameters: Type.Object({
      query: Type.String({ description: "搜索关键词" }),
      topK: Type.Optional(Type.Number({ description: "返回结果数，默认5" })),
      minScore: Type.Optional(Type.Number({ description: "最低相似度阈值，默认0.3" })),
    }, { additionalProperties: false }),
    execute: async (_toolCallId, rawParams, _signal) => {
      const params = rawParams as { query: string; topK?: number; minScore?: number };
      const result = await searchRAG({
        collection: "kb_l2_core",
        query: params.query,
        top_k: params.topK ?? 5,
        score_threshold: params.minScore ?? 0.3,
      });
      return formatRagResult(result);
    },
  };
}

function createSearchBooksTool(): AnyAgentTool {
  return {
    name: "search_books",
    label: "Search Books",
    description:
      "搜索深度营养学知识库（营养学全书、研究报告、健身博客）。适合复杂的营养学问题。",
    parameters: Type.Object({
      query: Type.String({ description: "搜索关键词" }),
      topK: Type.Optional(Type.Number({ description: "返回结果数，默认5" })),
    }, { additionalProperties: false }),
    execute: async (_toolCallId, rawParams, _signal) => {
      const params = rawParams as { query: string; topK?: number };
      const result = await searchRAG({
        collection: "kb_l3_books",
        query: params.query,
        top_k: params.topK ?? 5,
      });
      return formatRagResult(result);
    },
  };
}

// ── Registration ──

export function registerKnowledgeTools(api: OpenClawPluginApi, config: RightNowPluginConfig): void {
  ragConfig = config;

  const tools = [createSearchFaqTool(), createSearchCoreTheoryTool(), createSearchBooksTool()];
  for (const tool of tools) {
    api.registerTool(tool, { name: tool.name });
  }
}
