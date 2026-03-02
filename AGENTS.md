## Shared Agent Memory

- Canonical shared memory file: `CLAUDE_PROJECT_MEMORY.md`.
- Treat that file as the repository memory source for Codex, Claude Code, and any other coding agent.
- Before making non-trivial changes, read `CLAUDE_PROJECT_MEMORY.md` for architecture, constraints, and recent decisions.
- After making meaningful changes, update `CLAUDE_PROJECT_MEMORY.md` instead of creating a separate agent-specific memory file.
- Preserve existing user notes and prior history. Append or edit only the sections that need freshness.

## Reusing Claude Assets

- Reuse `.claude/commands/*.md` as local workflow references when the user request matches them.
- If a Claude command file contains a reusable process, follow it as guidance instead of inventing a parallel workflow.
- Keep shared project conventions in repository files, not in model-only memory.

## 技能系统

- 所有共享技能统一注册在 `SKILL_REGISTRY.md`，Agent 启动时读取即可获得全部可用技能。
- 技能文件统一存放在 `skills/<name>/SKILL.md`（项目级）。
- 4 个核心技能已全局安装到各 Agent 默认路径，跨项目可用。
- 新增技能时必须同步更新 `SKILL_REGISTRY.md` 注册表。

## Memory Update Rules

- Keep entries short, factual, and dated.
- Record durable decisions: architecture, conventions, integration status, known constraints, and pending risks.
- Do not log transient noise such as every command run.
- If a change supersedes an older note, update the older note instead of duplicating contradictory guidance.
- Prefer the template in `CLAUDE_PROJECT_MEMORY.md` section `10. 通用记忆更新模板` when adding new records.
