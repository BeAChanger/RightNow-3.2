# 技能注册表（Skill Registry）

所有跨 Agent 共享技能的唯一发现源。Claude Code、Codex、Antigravity 启动时读取此文件即可获得全部可用技能。

## 技能总览

| 技能名 | 触发命令 | 路径 | 说明 |
|--------|----------|------|------|
| fankui | `/fankui` | `skills/fankui/SKILL.md` | 问题反馈分析与最小改动修复 |
| project-orchestrator | `/orchestrator` | `skills/project-orchestrator/SKILL.md` | 项目梳理、阶段规划与报告驱动协作 |
| feature-co-creation-socratic-frontend | `/function-talk` | `skills/feature-co-creation-socratic-frontend/SKILL.md` | 苏格拉底式产品功能共创 |
| skill-co-learn | `/skill-co-learn` | `skills/skill-co-learn/SKILL.md` | 跨 Agent 高价值经验提炼与共享 |
| real-team-handover-docs-generator | `/handvoer`（兼容 `/handover`） | `skills/real-team-handover-docs-generator/SKILL.md` | 生成团队交接开发文档 `DEV_HANDOVER.md` 与运维文档 `OPS_RUNBOOK.md` |

## 使用方式

1. 在对话中输入触发命令（如 `/fankui`），Agent 会自动加载对应技能
2. 也可直接描述需求，Agent 根据上下文匹配合适技能

## 注册新技能

新技能必须满足以下条件才能注册：

1. 技能文件放在 `skills/<kebab-name>/SKILL.md`
2. 在上方表格中追加一行（技能名、触发命令、路径、说明）
3. 同步更新 `CLAUDE_PROJECT_MEMORY.md` 的"最近重要变更"
