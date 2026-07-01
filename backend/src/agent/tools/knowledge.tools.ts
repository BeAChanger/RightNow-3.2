import { ToolHandler } from './tool-registry';
import { ConfigService } from '@nestjs/config';

export function knowledgeTools(config: ConfigService): ToolHandler[] {
  return [
    {
      name: 'knowledge.search',
      write: false,
      async run(ctx) {
        const ragUrl = config.get<string>('RAG_SERVICE_URL', 'http://rag:8000');
        const query = (ctx.args.query as string) ?? '';
        const topK = (ctx.args.topK as number) ?? 5;
        const domain = (ctx.args.domain as string) ?? undefined;

        if (!query.trim()) {
          return { results: [], message: 'Empty query' };
        }

        try {
          const res = await fetch(`${ragUrl}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query,
              top_k: Math.min(Number(topK), 10),
              ...(domain ? { domain } : {}),
            }),
          });

          if (!res.ok) {
            return { results: [], error: `RAG returned HTTP ${res.status}` };
          }

          const payload: any = await res.json();
          return payload;
        } catch (e: any) {
          return { results: [], error: e?.message ?? 'RAG unreachable' };
        }
      },
    },
  ];
}
