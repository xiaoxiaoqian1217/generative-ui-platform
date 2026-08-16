# ADR-0030：将 Dynamic A2UI 验证提前到 Theme 之前，并扩展 CopilotKit Runtime 的 Presentation 职责

- **状态：** Accepted
- **日期：** 2026-08-17
- **范围：** A2UI 阶段顺序、CopilotKit Runtime 职责白名单、Dynamic A2UI MVP（Issue #210）

## 背景

ADR-0029 第 5 条接受的 A2UI 实现顺序为：

```text
A2UI Renderer MVP
  ↓
固定 A2UI fixtures
  ↓
Basic Catalog
  ↓
小规模 Custom Catalog
  ↓
Theme tokens
  ↓
真实 AgentContent → Dynamic A2UI
```

Issue #206（A2UI Renderer MVP）与 Issue #209（Platform Catalog MVP）已经完成：

- Workbench 已接入 CopilotKit A2UI Renderer；
- Merged Catalog（Basic 18 + Platform 3：Metric / StatusBadge / InfoRow）已稳定渲染固定 Fixture；
- 同一 Renderer、Catalog 与 A2UI operations 契约已被 e2e 覆盖。

按 ADR-0029 的书面顺序，下一阶段应进入 Theme Tokens。
Issue #209 的完成定义也写明下一阶段进入 Theme，而不是立即进入 Dynamic A2UI。

评审 Issue #210 时重新评估了这一顺序：

- 当前 Generative UI 最大的剩余不确定性是：Secondary LLM 能否在受控 Catalog 约束下生成合法、可渲染、可重复验证的 A2UI；
- Theme Tokens 同时服务 Fixed 与 Dynamic 两条展示链路，与“生成是否受控”这一问题解耦；
- 如果动态生成不成立，后续 Theme 与 SACS 集成的投入方向都需要重新评估；
- 先用受控内容验证动态生成，可以把最大风险前置，且不需要等待 Theme 完成。

同时，Issue #210 的目标架构要求 CopilotKit Runtime 承载薄 Presentation Policy 与 Secondary Presentation LLM。
这超出了 ADR-0029 第 1 条列举的支撑性职责（Agent 注册 / 路由、endpoint / credential、统一接入 endpoint、最小 middleware integration）。
该扩展需要显式决策，不能静默发生。

## 决策

### 1. 调整 A2UI 阶段顺序：Dynamic A2UI（受控内容）提前到 Theme Tokens 之前

新的阶段顺序为：

```text
A2UI Renderer MVP（已完成）
  ↓
Fixed Fixtures（已完成）
  ↓
Basic Catalog（已完成）
  ↓
Platform Catalog MVP（已完成）
  ↓
Dynamic A2UI MVP（受控内容，Issue #210）
  ↓
真实 SACS AgentContent → Dynamic A2UI
```

Theme Tokens 不再是 Dynamic A2UI 的前置条件。
Theme 按真实需要后置，在动态生成链路跑通后进入。

约束：

- Dynamic A2UI MVP 使用受控内容源（AGUIMock / 测试内容），不接 SACS；
- Fixed A2UI Fixture 继续保留为 deterministic baseline；
- Theme 缺口导致的已知观感差异（Basic Catalog 内联样式与 Platform 组件混排）继续作为已声明限制保留，到 Theme 阶段统一处理。

### 2. 扩展 CopilotKit Runtime 职责白名单

在 ADR-0029 第 1 条的职责清单上，允许 CopilotKit Runtime 为 Dynamic A2UI 额外承担：

- 薄、确定性的 Presentation Policy（presentation path 选择）；
- Secondary Presentation LLM 的调用接线（基于 `@ag-ui/a2ui-toolkit` 的 subagent 机制）；
- 生成结果向 AG-UI 事件流的缝合（`a2ui-surface` ACTIVITY_SNAPSHOT 的发射）。

边界保持不变：

- Runtime 不解释业务含义，不替 Business Agent 决定 Action；
- Runtime 不持有 Runtime Truth，不伪造 Agent 未发布的能力；
- Runtime 不得演变为自研 Runtime Platform 或 Presentation Platform；
- 如果未来这些职责生长出独立复杂性，需要独立决策再拆分。

### 3. Platform Catalog definitions 下沉为共享来源

Secondary LLM 位于 Runtime 侧，需要 Final Catalog 的 Schema 作为生成与校验边界。
Platform Catalog definitions 框架无关（仅依赖 zod 与 `@a2ui/web_core`），此时已存在第二个真实消费者（copilot-runtime）。

允许将 definitions 从 `apps/web-workbench` 下沉到独立最小 package（如 `packages/a2ui-catalog`），由 Workbench 与 Runtime 引用同一来源。

约束：

- 不放入 `packages/shared-types`，保持其最小定位与 TypeBox 单一技术栈；
- catalogId 常量继续由 `packages/shared-types` 提供；
- 不采用客户端经 `includeSchema` 上送 schema 的方案，catalog 是平台拥有的生成边界，生成校验不应依赖会话提供的 schema；
- 该 package 只承载 definitions，不承载 implementations / SFC，不演变为通用 Catalog Platform。

## 与 ADR-0029 的关系

本 ADR 部分修订 ADR-0029：

1. 第 5 条的实现顺序中，Theme Tokens 从 Dynamic A2UI 的前置条件调整为后置；
2. 第 1 条的 Runtime 职责清单按本 ADR 第 2 条扩展。

ADR-0029 的其余决策继续有效：

- 薄 Runtime 边界原则与 Supporting Infrastructure 定位；
- AGUIMock / SACS 双 Agent 来源与能力差异显式表达；
- Issue #200 的真实互操作验证目标；
- A2UI 不替代 Frontend Tool；
- UI Compiler 不是当前主链路的前置条件。

## 影响

- Issue #210 按调整后的顺序与职责边界执行；
- AGENTS.md 的 A2UI phase admission 与 Current roadmap 按新顺序更新；
- docs/ARCHITECTURE.md 与 docs/workbench/README.md 的阶段顺序表述同步更新；
- Theme Tokens 阶段不再阻塞 Issue #210，但仍需在动态生成链路跑通后补齐；
- CopilotKit Runtime 的 Presentation 职责以本 ADR 第 2 条白名单为限，不得继续扩张。
