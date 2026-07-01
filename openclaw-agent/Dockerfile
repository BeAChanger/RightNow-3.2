# 小爪 IM Gateway — Feishu bot bridge with StepFun LLM + RightNow RPC
FROM node:20-bookworm-slim

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl tini \
    && rm -rf /var/lib/apt/lists/*

# node user already exists in base image — just create dirs & set ownership
RUN mkdir -p /app /data/openclaw && \
    chown -R node:node /app /data/openclaw

WORKDIR /app

# Install dependencies first (cache layer)
COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy source code
COPY --chown=node:node src/ ./src/

USER node

ENV NODE_ENV=production
ENV PORT=18789

EXPOSE 18789

ENTRYPOINT ["tini", "--"]
CMD ["node", "src/server.js"]
