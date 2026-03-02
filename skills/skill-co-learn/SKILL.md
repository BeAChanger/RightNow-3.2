---
name: skill-co-learn
description: 用于在检测到高价值开发经验、功能模式、设计最佳实践，或用户明确要求“记住这个”“提炼Skill”“让其他Agent也学会”时，提炼可直接落盘的共享 Skill 文件，并在全局/项目级 Scope 之间做智能判断与路径适配。适用于 /skill-co-learn、/skill-colearn，以及相关中文触发语境。
---

# Skill Co Learn

将高价值经验转化为可直接落盘的 Skill 文件，并在三体 Agent 间实现低成本同步。

## 使命

- 把高价值经验从一次性对话转成可落盘的 Skill 文件
- 让 `claude code`、`codex`、`antigravity` 共享同一套最佳实践
- 根据用户选择的 Scope 自动适配全局路径或项目路径
- 优先沉淀功能实现、代码模式、UI/UX 流程和产品方法论

## 触发条件

每轮对话都检查是否命中以下任一条件。

### 显式触发

- 用户输入 `/skill-co-learn`
- 用户输入 `/skill-colearn`
- 用户说出类似表达：
  - “刚刚这个经验你应该记住它”
  - “记住这个”
  - “提炼Skill”
  - “让其他Agent也学会”
  - “保存成skill”

### 自动触发

仅在高价值且高置信度时自动触发：

- 同一功能或设计迭代达到 3 次及以上
- 且用户明确表示满意，如“完美”“满意了”“太棒了”

### 接收外部 Skill

如果用户粘贴其他 Agent 生成的完整 `SKILL SHARE BLOCK`，进入“接收新 Skill”分支，而不是重新提炼。

## 执行流程

严格执行以下 7 步。

### 1. 进入共学模式

一旦命中触发条件，先输出：

`✅ 检测到高价值经验，正在用当前上下文润色并准备Scope判断...`

### 2. 上下文深度分析

回顾对话并提炼：

- 当前问题
- 迭代过程
- 最优方案
- 为什么有效
- 可复用的场景
- 可补充的衍生应用想法

### 3. 苏格拉底共创提问

只在必要时提问，最多 2 个精准问题，用于快速拉齐：

- 用途
- 预期效果
- 三体角色适配

### 4. Scope 判断（必须执行）

无论上下文是否充分，都必须问出这句：

`这个Skill是需要全局使用（永久学会，所有项目都可用）还是只需要当前单个项目使用（三个Agent同时学会，仅本项目生效）？`

在用户明确回答 Scope 之前，不进入最终路径落盘判断。

### 5. 主动润色增强

根据用户选择的 Scope：

- 优化 Skill 文案
- 优化三体角色适配
- 选择正确的安装路径模板
- 补充当前上下文中最值得保留的增强点

### 6. 输出标准化 Skill 草案

生成轻量版标准 Skill 草案，并动态插入 Scope 和路径。

## 标准输出模板

严格使用以下结构：

`**Skill: [kebab-case-英文名]（中文名称）**`

`**用途**：一句话价值描述`

`**触发条件**：`

`**核心流程**：3-5步`

`**三体角色适配**：`

`- claude code & codex：`

`- antigravity：`

`**增强点**（当前上下文补充）：`

`**Scope**：全局 / 项目级（根据用户回答填写）`

`**安装路径（已根据Scope自动适配）**：`

`- claude code：~/.claude/skills/[kebab-name]/SKILL.md （全局） 或 ./.claude/skills/[kebab-name]/SKILL.md （项目级）`

`- codex：~/.codex/skills/[kebab-name]/SKILL.md （全局） 或 ./.agents/skills/[kebab-name]/SKILL.md （项目级）`

`- antigravity：~/.gemini/antigravity/skills/[kebab-name]/SKILL.md （全局） 或 ./.agent/skills/[kebab-name]/SKILL.md （项目级）`

`**版本**：v1.0`

## 路径适配规则

### 全局 Scope

- `claude code`：`~/.claude/skills/[kebab-name]/SKILL.md`
- `codex`：`~/.codex/skills/[kebab-name]/SKILL.md`
- `antigravity`：`~/.gemini/antigravity/skills/[kebab-name]/SKILL.md`

### 项目级 Scope

- 统一放在 `skills/[kebab-name]/SKILL.md`
- 同时注册到项目根目录的 `SKILL_REGISTRY.md`

输出时必须根据用户选择，仅将 Scope 说明写成对应结论，但路径模板两组都要展示，方便同步。

## 三体角色适配

- `claude code`：偏架构、规则沉淀、代码审查、系统性方法抽象
- `codex`：偏代码实现、流程提炼、功能落地、模式归纳
- `antigravity`：偏 UI/UX、视觉模式、交互流程、体验优化方法

提炼 Skill 时，明确说明三者如何复用同一经验，而不是只写单一角色视角。

## 接收外部 Skill 时的响应

如果用户粘贴完整的 `SKILL SHARE BLOCK`：

- 立即回复：
  `确认！我已将 [Skill名称] 永久加入我的知识库。从现在起，无论哪个Agent触发对应条件，我都会自动应用这个最佳实践。`
- 之后在后续对话中遵守该 Skill 的步骤与适配规则

如果共享块不完整：

- 说明块不完整，要求用户补充完整的 `SKILL SHARE BLOCK`
- 不要在块不完整时宣称已经学会

## 自动触发边界

- 不要在普通闲聊或低价值小修中滥用
- 只有在“高价值经验已稳定成型”时才自动触发
- 如果当前任务仍在关键实现中，优先完成当前关键问题，再进入共学提炼

## 最佳实践

- 优先提炼服务于“高效做出好产品”的经验
- 优先从功能、架构、UI、协作流程里提炼
- 保持 Skill 简洁、可执行、可被其他 Agent 直接复用
- 如果发现更好版本，使用 `/skill-colearn 更新 [旧Skill名]` 迭代，而不是创建冲突 Skill
- 如果用户没有给出 Scope，不要跳过提问，必须先完成 Scope 判断

### 7. 落盘与注册

#### 如果是项目级 Scope

且项目中存在 `SKILL_REGISTRY.md`：

- 写入 `skills/[kebab-name]/SKILL.md`
- 将新技能追加到 `SKILL_REGISTRY.md` 的技能总览表格中
- 同步更新 `CLAUDE_PROJECT_MEMORY.md` 的"最近重要变更"

#### 如果是全局 Scope（一键三写）

必须依次写入以下三个路径，确保三体 Agent 同时学会：

1. **Claude Code**：写入 `~/.claude/commands/[kebab-name].md`（扁平 `.md` 文件，非目录）
2. **Codex**：创建 `~/.codex/skills/[kebab-name]/SKILL.md`（目录 + `SKILL.md`）
3. **Antigravity**：创建 `~/.gemini/antigravity/skills/[kebab-name]/SKILL.md`（目录 + `SKILL.md`）

三个路径全部写入后：

- 无需更新 `SKILL_REGISTRY.md`
- 建议更新 `CLAUDE_PROJECT_MEMORY.md` 记录新增的全局技能
