---
name: zero-crash-code-review
description: Zero-crash code review and proactive hardening workflow for /review requests with pasted code. Use when users ask for code review with strong runtime safety guarantees, especially to prevent login failures, blank screens, API disconnections, state corruption, and other crash-level issues. Force coverage of login, API, rendering, state management, and edge cases, and actively patch all Critical/High risks with concrete code before returning results.
---

# Zero-Crash Code Review

执行单 Agent 独立代码审查与修复，目标是用户测试零崩溃。优先保障可运行性和稳定性，再处理可维护性与体验问题。

## 触发条件

- 用户输入 `/review` 并粘贴代码
- 用户明确要求“代码审查”“风险分级”“先修 Critical/High 再给报告”
- 用户强调稳定性、零崩溃、线上安全、测试可通过

## 核心目标

- 把“用户测试零崩溃”作为唯一最高优先级
- 主动发现并修复会导致崩溃、白屏、登录失败、API 断连的风险
- 对 Critical 和 High 风险必须直接给出修复后的代码，不只给建议

## 强制覆盖范围

- 登录链路
- API 调用与网络异常
- 渲染稳定性
- 状态管理一致性
- 边缘输入和异常路径

## 风险分级标准

- Critical：高概率造成崩溃、白屏、核心流程完全不可用、数据严重损坏、安全绕过
- High：核心功能高频失败、严重状态错乱、明显影响多数用户任务完成
- Medium：局部功能不稳定、可恢复错误处理不足
- Low：可读性、结构、轻微体验问题

## 执行流程

1. 理解功能
2. 全面审查
3. 风险分级
4. 主动修复 Critical 和 High 风险
5. 输出审查文档与完整修复代码

## 审查检查清单

- 登录与鉴权
  - 校验空值、过期态、并发登录、token 刷新失败、权限回退
- API 与网络
  - 校验超时、重试、取消请求、错误码分支、离线与弱网处理
- 渲染与生命周期
  - 校验空数据渲染、异步竞态、组件卸载后 setState、关键节点空指针
- 状态管理
  - 校验初始化默认值、跨页面同步、回滚逻辑、异常状态收敛
- 边缘 case
  - 校验空列表、超长输入、非法参数、重复提交、快速切页、首屏慢加载

## 修复要求

- 必须直接修复 Critical 与 High，禁止仅给口头建议
- 采用最小必要改动，避免无关重构
- 保持原有业务行为，优先加防御分支、兜底渲染、错误回退
- 对每个修复点说明风险原因、触发条件、修复策略

## 输出顺序

严格按以下顺序输出：
1. 审查文档
2. 修复后完整代码

## 审查文档模板

# 【功能名称】代码审查报告
**审查日期**：YYYY-MM-DD
**审查目标**：用户测试零崩溃
**总体评估**：✅ 通过 / ⚠️ 需要修复 / ❌ 严重问题

### 1. 关键风险摘要
### 2. 详细问题列表（Critical/High必须附修复代码）
### 3. 其他建议
### 4. 功能文档更新
### 5. 最终推荐

## 完整代码输出规则

- 输出可直接替换的完整版本，不输出“仅片段”作为最终交付
- 多文件修复时，按文件逐个给出完整内容
- 明确标注文件路径，避免用户二次猜测落点
- 保留必要注释，避免冗长解释性注释

## 行为约束

- 坚持单 Agent 独立完成，不把关键修复留给后续角色
- 优先给出可执行结果，不空谈抽象原则
- 在信息不足时做保守假设并显式写明，不跳过 Critical/High 判定
