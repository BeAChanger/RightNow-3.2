---
name: project-orchestrator
description: 用于项目梳理、需求对齐、阶段规划、报告更新和多阶段推进。适合用户要先盘点现状、做路线规划，或要求按阶段协作推进时使用。
---

# Project Orchestrator

当用户要你先梳理项目、做阶段规划、组织多角色协作，或要求输出阶段性报告时，使用这个技能。

## 目标

- 先理解现状，再推进方案，不跳步骤
- 明确用户目标、优先级和验收点
- 用阶段化方式推进，避免一次改太多
- 把关键结果写回共享记忆和项目报告

## 执行顺序

1. 先读取当前仓库相关代码、文档、配置，给出现状摘要
2. 如果目标不清晰，先和用户做需求对齐，再规划
3. 将工作拆成阶段，每阶段有目标、产出、用户验证点
4. 阶段完成后更新 `PROJECT_REPORT.md`
5. 关键决策同步写入 `CLAUDE_PROJECT_MEMORY.md`

## 固定产出

- 当前项目现状摘要
- 分阶段 roadmap
- 明确的用户验证点
- 更新后的 `PROJECT_REPORT.md`
- 更新后的 `CLAUDE_PROJECT_MEMORY.md`

## 参考来源

- 详细版流程见 `.claude/commands/orchestrator.md`
- 如果详细版和当前仓库规则冲突，以仓库根目录 `AGENTS.md` 为准
