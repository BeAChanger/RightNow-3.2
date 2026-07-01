# P0 Solution: Load RightNow OpenClaw Plugin and Enable Tools

Date: 2026-07-02

Server: `root@<your-server-host>`

Project: `/root/rightnow`

Goal: make the OpenClaw web bot actually use RightNow data tools, memory context, diet/training tools, and knowledge search.

This document is for the second current blocker: OpenClaw is replying, but the RightNow plugin/tool layer is not fully active.

## 1. Problem

The current web bot path already goes through OpenClaw, but OpenClaw logs show that the RightNow plugin is not being loaded cleanly.

Observed log pattern:

```text
plugins.allow: plugin not found: rightnow
stale config entry ignored; remove it from plugins config
ignored plugins.load.paths entry that points at OpenClaw's legacy bundled plugin directory
source=/app/extensions/rightnow
```

Impact:

- Web chat may still get a model reply.
- But the model may not reliably call RightNow tools.
- Long-term memory, user context, diet logging, training data, and RAG knowledge tools may not be available inside the OpenClaw agent loop.

## 2. Relevant Files

RightNow plugin source:

```text
/root/rightnow/openclaw/extensions/rightnow/openclaw.plugin.json
/root/rightnow/openclaw/extensions/rightnow/package.json
/root/rightnow/openclaw/extensions/rightnow/index.js
/root/rightnow/openclaw/extensions/rightnow/src/rightnow-tools.js
/root/rightnow/openclaw/extensions/rightnow/src/rightnow-knowledge.js
```

OpenClaw gateway deployment:

```text
/root/rightnow/docker-compose.prod.yml
```

Live OpenClaw config:

```text
/root/.openclaw/openclaw.json
```

Backend RPC endpoint used by tools:

```text
/root/rightnow/backend/src/agent/agent.controller.ts
/root/rightnow/backend/src/agent/agent-rpc.service.ts
```

Backend tool implementations:

```text
/root/rightnow/backend/src/agent/tools/memory.tools.ts
/root/rightnow/backend/src/agent/tools/diet.tools.ts
/root/rightnow/backend/src/agent/tools/knowledge.tools.ts
```

## 3. Target Architecture

Expected tool flow:

```text
OpenClaw agent
  -> RightNow plugin tool, for example rightnow_get_context
  -> POST http://rn-backend:5000/api/agent/rpc
  -> backend validates AGENT_SERVICE_TOKEN
  -> backend resolves user/channel identity
  -> backend reads or writes RightNow database
  -> result returns to OpenClaw agent
  -> model uses result in final reply
```

For knowledge search:

```text
OpenClaw agent
  -> search_faq / search_core_theory / search_books
  -> RightNow plugin
  -> RAG service or backend knowledge path
  -> search result returns to model
```

## 4. Product Boundary

The plugin should give the bot better context, but it must not break identity isolation.

Required behavior:

- Web channel uses the logged-in JWT user id from `/api/chat`.
- WeChat P0 single-user mode may map official WeChat messages to `test7@qq.com` only later.
- RightNow tools must not blindly operate on a global user.
- If a tool cannot resolve a user, it should fail clearly instead of writing to the wrong account.

## 5. Likely Root Cause

The compose file builds OpenClaw with:

```yaml
args:
  OPENCLAW_EXTENSIONS: "stepfun,deepseek,memory-core,feishu,rightnow"
  OPENCLAW_BUNDLED_PLUGIN_DIR: extensions
```

and mounts:

```yaml
./openclaw/extensions/rightnow:/app/extensions/rightnow:ro
```

But current OpenClaw runtime warns that `/app/extensions/rightnow` is treated like a legacy bundled plugin path and ignored.

So the source code exists, but the runtime plugin discovery path or config style does not match the current OpenClaw loader.

## 6. Recommended Fix Path

Use the official current OpenClaw plugin loading mechanism, not the legacy extension path.

Because the OpenClaw loader version matters, the follow-up agent should verify against the checked-out OpenClaw source in:

```text
/root/rightnow/openclaw
```

Search for these concepts:

```text
plugins.load.paths
plugins.allow
OPENCLAW_EXTENSIONS
OPENCLAW_BUNDLED_PLUGIN_DIR
openclaw.plugin.json
definePluginEntry
```

Then adjust the RightNow plugin placement/config to the loader's current expected format.

The fix should be made in deployment/config first. Avoid rewriting all tool logic unless plugin registration itself is proven incompatible.

## 7. Implementation Checklist

### Step 1: Confirm Which Plugins Are Loaded

Check gateway logs:

```bash
docker logs rn-openclaw-gateway --tail=200
```

Expected final state should include `rightnow` in the loaded plugin list.

Current bad state includes:

```text
plugin not found: rightnow
```

### Step 2: Confirm `/api/agent/rpc` Is Available

Check backend logs after startup:

```bash
docker logs rn-backend --tail=200
```

Expected route:

```text
Mapped {/api/agent/rpc, POST}
```

This route is already known to exist now, but validate before testing tools.

### Step 3: Confirm Token Wiring

Both services must agree on:

```text
AGENT_SERVICE_TOKEN
```

Gateway env:

```yaml
AGENT_SERVICE_TOKEN: ${AGENT_SERVICE_TOKEN}
RIGHTNOW_API_BASE: http://rn-backend:5000/api
```

Backend env:

```yaml
AGENT_SERVICE_TOKEN: ${AGENT_SERVICE_TOKEN:-}
```

Inside containers:

```bash
docker exec rn-openclaw-gateway printenv | grep -E 'RIGHTNOW|AGENT'
docker exec rn-backend printenv | grep AGENT_SERVICE_TOKEN
```

If the token is empty or different, tools will fail authentication.

### Step 4: Fix Plugin Discovery

Use whichever method the current OpenClaw source expects. Candidate solutions:

1. Move/copy the RightNow plugin into the non-legacy plugin directory expected by OpenClaw.
2. Change `plugins.load.paths` in `/root/.openclaw/openclaw.json` to the supported path format.
3. Change compose build args or env vars so `rightnow` is bundled at image build time.
4. If OpenClaw supports package-style plugins, install or link `@openclaw/rightnow` in the expected plugin workspace.

Do not keep a config entry that OpenClaw calls stale. A stale allow/load entry creates false confidence.

### Step 5: Restart Gateway

After discovery/config changes:

```bash
cd /root/rightnow
docker compose -f docker-compose.prod.yml up -d --build openclaw-gateway
```

Then check logs again:

```bash
docker logs rn-openclaw-gateway --tail=200
```

Expected:

- no `plugin not found: rightnow`
- no legacy path ignore warning for the active RightNow plugin path
- loaded plugin list includes `rightnow`

## 8. Tool Invocation Validation

After plugin loads, test from the product path first:

1. Log in as `test7@qq.com / 123456`.
2. Ask the bot a profile/context question:

```text
你还记得我的身高体重和今天的训练安排吗？
```

Expected:

- Gateway logs show a RightNow tool call, ideally `rightnow_get_context`.
- Backend logs show `/api/agent/rpc` being called.
- Reply references actual profile/plan data if available.

Then test knowledge:

```text
减脂平台期应该怎么处理？
```

Expected:

- Gateway logs show `search_faq` or `search_core_theory`.
- Reply uses configured knowledge base instead of only generic model knowledge.

Then test diet:

```text
我午饭吃了一碗米饭和一份鸡胸肉，帮我估算一下热量。
```

Expected:

- Tool call may use `rightnow_analyze_food_text`.
- Bot should ask for confirmation before writing a diet record, unless product design chooses automatic logging.

## 9. Important Implementation Risk

`rightnow-tools.js` currently sends:

```js
const body = {
  tool,
  channel: "web",
  channelUserId: "",
  args,
};
```

This may be insufficient for user identity unless the backend can infer the user from the OpenClaw session or arguments.

Before calling this done, verify how `agent-rpc.service.ts` resolves user identity.

The safest expected design:

- For web-originated OpenClaw sessions, backend should pass or expose the RightNow `userId` to tool calls.
- For WeChat P0, backend may map WeChat channel to the single demo user id.
- Tools should not write records when user identity is empty.

If the current OpenClaw plugin API exposes session/user metadata, use that instead of hardcoding `channelUserId: ""`.

## 10. Acceptance Criteria

This issue is resolved only when all are true:

- OpenClaw Gateway logs show `rightnow` plugin loaded.
- No stale `plugin not found: rightnow` warning remains.
- A web chat can trigger `rightnow_get_context`.
- Backend receives `/api/agent/rpc` calls with a resolvable RightNow user.
- A knowledge question triggers `search_faq`, `search_core_theory`, or equivalent RAG path.
- A diet text test can analyze calories without crashing.
- No tool writes data to the wrong user.

## 11. Rollback

If plugin loading breaks the gateway:

1. Remove the new plugin load config.
2. Restart `rn-openclaw-gateway`.
3. Confirm web chat still gets plain OpenClaw model replies.

This rollback keeps basic chat alive, but memory/tools/RAG remain incomplete.

## 12. Relationship to WeChat P0

Fixing this plugin is required before the WeChat P0 food-photo flow is meaningful.

The desired future WeChat flow:

```text
official WeChat ClawBot
  -> OpenClaw message
  -> same RightNow/OpenClaw bot kernel
  -> rightnow_analyze_food_image
  -> user confirms
  -> rightnow_log_diet
  -> web dashboard updates
```

Without the RightNow plugin, WeChat may chat but cannot reliably sync calories back to RightNow web.


