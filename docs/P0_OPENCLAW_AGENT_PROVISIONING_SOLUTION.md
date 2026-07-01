# P0 Solution: OpenClaw Agent Provisioning for Web Users

Date: 2026-07-02

Server: `root@<your-server-host>`

Project: `/root/rightnow`

Goal: make every normal RightNow web user able to chat with the web bot through OpenClaw, without mapping web users to the P0 demo account.

This document is intentionally operational. A follow-up agent should be able to use it directly.

## 1. Problem

The web bot already calls OpenClaw through the backend, but a newly registered web user may fail on first chat.

Observed error pattern:

```text
OpenClawProvisioningService
agent "<rightnow-user-id>" not declared in openclaw.json agents.list
OpenClaw agent not provisioned for user <rightnow-user-id>
```

Current web chat path:

```text
frontend AIChat
  -> POST /api/chat
  -> backend ChatService
  -> OpenClawProvisioningService.ensureAgent(userId)
  -> OpenClawClient.chat(model = openclaw/<userId>)
  -> OpenClaw Gateway /v1/chat/completions
```

The failure happens before the model reply, inside `ensureAgent(userId)`.

## 2. Root Cause

The backend currently defaults to:

```text
OPENCLAW_PROVISION_MODE=verify
```

In `verify` mode, the backend only checks whether the agent already exists in OpenClaw. It does not create a missing agent.

The live OpenClaw config file:

```text
/root/.openclaw/openclaw.json
```

currently does not contain an `agents.list` entry for each new RightNow user.

The code that controls this is:

```text
/root/rightnow/backend/src/openclaw/openclaw-provisioning.service.ts
```

Important deployment detail:

`docker-compose.prod.yml` already mounts `/root/.openclaw` into both `rn-backend` and `rn-openclaw-gateway`, so direct config-file provisioning is practical.

## 3. Product Boundary

Do not confuse this issue with the P0 WeChat single-user test mode.

Required behavior:

- Web users keep using their own JWT `userId`.
- New users can register, log in, and chat through web bot normally.
- The P0 demo account `test7@qq.com` is only for the first WeChat official ClawBot integration.
- Do not map all web users to `test7@qq.com`.
- Any single-user mapping must only apply to the WeChat channel.

## 4. Recommended Fix

Use `OPENCLAW_PROVISION_MODE=config-file` for the backend.

Reason:

- It matches the current implementation.
- It does not require building a new sidecar service.
- `/root/.openclaw` is already shared between backend and OpenClaw Gateway.
- It supports normal web multi-user chat without needing full WeChat multi-tenant isolation yet.

Expected behavior after the fix:

1. New user sends first web chat.
2. Backend sees `openclaw/<userId>` is missing.
3. Backend writes this agent into `/root/.openclaw/openclaw.json`.
4. OpenClaw Gateway hot-reloads or detects the new agent.
5. Backend retries/waits until `/v1/models` contains `openclaw/<userId>`.
6. Chat continues normally.

## 5. Implementation Steps

### Step 1: Pass Provision Mode Into Backend

Edit:

```text
/root/rightnow/docker-compose.prod.yml
```

In the `backend.environment` block, add:

```yaml
OPENCLAW_PROVISION_MODE: ${OPENCLAW_PROVISION_MODE:-config-file}
```

Keep:

```yaml
OPENCLAW_CONFIG_PATH: /root/.openclaw/openclaw.json
```

### Step 2: Clean `.env`

Edit:

```text
/root/rightnow/.env
```

Make sure there is only one final value:

```env
OPENCLAW_PROVISION_MODE=config-file
```

Remove or ignore duplicate older values such as:

```env
OPENCLAW_PROVISION_MODE=verify
```

Also keep the runtime gateway URL consistent with docker compose:

```env
OPENCLAW_GATEWAY_URL=http://rn-openclaw-gateway:18789
```

Note: compose currently hardcodes this gateway URL for backend, so `.env` mismatch is less urgent than passing the provision mode.

### Step 3: Ensure OpenClaw Config Has the Expected Shape

Inspect:

```text
/root/.openclaw/openclaw.json
```

Valid minimum shape:

```json
{
  "agents": {
    "defaults": {
      "model": "stepfun/step-3.7-flash"
    },
    "list": []
  }
}
```

The current backend code can create `agents.list` if it is missing, but having the explicit shape makes the config easier to review.

### Step 4: Rebuild or Restart Backend

After changing compose/env:

```bash
cd /root/rightnow
docker compose -f docker-compose.prod.yml up -d --build backend
```

If no source code changed and only compose/env changed:

```bash
cd /root/rightnow
docker compose -f docker-compose.prod.yml up -d backend
```

### Step 5: Validate Runtime Env

Check inside backend:

```bash
docker exec rn-backend printenv | grep OPENCLAW
```

Expected:

```text
OPENCLAW_PROVISION_MODE=config-file
OPENCLAW_CONFIG_PATH=/root/.openclaw/openclaw.json
OPENCLAW_GATEWAY_URL=http://rn-openclaw-gateway:18789
```

## 6. Required Code Hardening

The current error log string in `openclaw-provisioning.service.ts` contains a literal template expression:

```ts
'(mode=${this.mode()}). Pre-provision it via: openclaw agents add ${agentId}'
```

Fix this while working in the file so future logs show the real mode and agent id.

Recommended improvement:

```ts
`(mode=${this.mode()}). Pre-provision it via: openclaw agents add ${agentId}`
```

Also consider extending wait time in `waitForAgent` if OpenClaw hot reload is slower than 3.2 seconds:

```ts
private async waitForAgent(agentId: string, tries = 20, delayMs = 500)
```

This is not a product change, just deployment tolerance.

## 7. Validation Plan

### Existing Demo Account

Use:

```text
email: test7@qq.com
password: 123456
```

Expected:

- Login succeeds.
- Web bot chat succeeds.
- The user id remains the real RightNow user id for `test7@qq.com`.

### Newly Registered Account

Register a fresh email through the web app.

Expected:

- Login succeeds.
- First chat does not return HTTP 500.
- `/root/.openclaw/openclaw.json` gains an `agents.list` item for that new user id.
- `GET /v1/models` from inside the backend/gateway network eventually includes `openclaw/<newUserId>`.

### Regression Boundary

Confirm:

- Other users still register normally.
- Other users still use their own JWT identity.
- No web request maps to `test7@qq.com` unless the logged-in account is actually `test7@qq.com`.

## 8. Rollback

If config-file provisioning causes instability:

1. Set backend env back to:

```env
OPENCLAW_PROVISION_MODE=verify
```

2. Restart backend.
3. Manually pre-provision needed agents by adding them to `openclaw.json`.

This rollback restores the previous safer behavior but new users will again need manual provisioning.

## 9. Longer-Term Option

For production-grade multi-tenant operation, `admin-http` is cleaner than direct config-file writes:

- backend calls an internal provisioner service
- provisioner owns all OpenClaw config mutations
- writes can be locked/serialized
- audit logs can be added

This is not necessary for P0, but it is the better long-term path once WeChat multi-user binding starts.


