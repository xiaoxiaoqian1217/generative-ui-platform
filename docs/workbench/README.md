# Web Workbench 文档

## 当前角色

`web-workbench` 是 Generative UI Platform 当前产品主体，用于验证和调试 Agent 与前端之间的真实交互与生成式 UI 能力。

当前关注点：

- Conversation；
- AG-UI；
- CopilotKit Frontend；
- Controlled UI / Frontend Tool；
- MapLibre GIS；
- 真实 Agent 互操作；
- A2UI Renderer（下一阶段）；
- Catalog / Theme（后续）。

Workbench 不是 Runtime Platform，也不承担业务 Agent 编排。

## 当前已实现基线

当前已经验证：

```text
AGUIMock
  ↓ AG-UI
CopilotKit Frontend
  ↓
Frontend Tools: setLayerVisibility / focusOn / highlight / previewPath
  ↓
MapLibre persistent surface
```

该纵向场景用于证明 Agent 可以通过 AG-UI 驱动真实浏览器能力。

## 当前 Agent 接入目标

ADR-0029 已接受薄 CopilotKit Runtime 作为下一步 Agent 接入边界：

```text
Web Workbench
      ↓
CopilotKit Runtime
      ↓
┌───────────────┬──────────────────────┐
│               │                      │
AGUIMock        single-agent-chat-server
```

在 #207 完成前，这仍是目标架构，不是已经完成的实现事实。

### AGUIMock

用于稳定验证 Workbench 自身能力：

- Frontend Tool；
- Tool Call fixture；
- regression；
- failure / edge case。

### single-agent-chat-server

用于验证真实业务 Agent 互操作：

- streaming text；
- State；
- Activity；
- Artifact；
- Interrupt / Resume；
- bounded error；
- durable Run semantics。

当前 SACS 不支持 client-provided Frontend Tools；该差异作为兼容性状态保留。

## Agent Source 与呈现请求

Workbench 只有一个自然语言入口，会话级开关只有 Agent Source。

- Agent Source 只有 AGUIMock 与 `single-agent-chat-server`；
- 日常输入恒为 auto：已是 A2UI 的内容（如 AGUIMock 固定 fixture）经 Native Passthrough 渲染，其余保留原文；
- `requestedMode: "dynamic"` 只由 quick scenario / 测试经 `forwardedProps` 显式注入，请求 Runtime 的薄 Presentation Policy 在同一 run 内触发 Secondary LLM 生成并缝合 a2ui-surface；
- 当前 Dynamic A2UI 仅允许用于 AGUIMock 受控内容，不接入真实 SACS AgentContent。

呈现路径由 Runtime 的确定性 policy 决定，不是用户可选的会话模式。

## A2UI 当前链路

完成薄 Runtime 与真实 Agent 联调后，Workbench 主线进入（ADR-0030 调整后的顺序）：

```text
固定 A2UI Fixture
  ↓
A2UI Renderer MVP
  ↓
Basic Catalog
  ↓
小规模 Custom Catalog
  ↓
Dynamic A2UI（受控内容，Issue #210，已完成）
  ↓
真实 SACS AgentContent → Dynamic A2UI
```

Theme Tokens 经 ADR-0030 后置，不再是 Dynamic A2UI 的前置条件。
当前受控链路已证明 A2UI Renderer、Platform Catalog 与 Secondary LLM 可以协同工作。

Controlled UI 与 A2UI 应尽量复用同一套真实 UI primitives、domain UI 和 Theme。

## 产品边界

Workbench 当前不建设：

- Runtime Thread / Turn / Operation Platform；
- Runtime Repository / Runtime Truth；
- Command Admission；
- Surface Lifecycle；
- Recovery / Reconcile；
- 自研 Presentation Pipeline；
- 自研 UI Compiler；
- 多 Agent 编排平台。

CopilotKit Runtime 只作为支撑性的集成层，不改变上述边界。

## 保留能力

以下 Workbench 能力继续保留，但不借机扩建为平台能力：

- Playground / Inspect / Cases / Catalog / Scenarios / Settings 路由；
- case library 与 inspection 支持。

与 A2UI Renderer / Catalog / Theme 直接相关的能力可以按当前阶段目标继续实现；其他方向不得借此恢复旧 Runtime Platform。

## 已接受原型基线

[PROTOTYPE_BASELINES.md](./PROTOTYPE_BASELINES.md) 继续保留。

它记录已经确认过的 Workbench UI / IA 设计输入，例如 Conversation shell、Inspect 等原型方向。

这些原型：

- 可以作为后续实现参考；
- 不自动代表当前 Release Gate；
- 不授权恢复已经移除的 Runtime / Compiler 架构。

## 当前路线图

```text
已完成
#202 Controlled UI 纵向场景
#207 Thin CopilotKit Runtime
#206 A2UI Renderer MVP
#209 Platform Catalog MVP
#210 Dynamic A2UI MVP（受控内容）

当前
#200 Real SACS Interoperability

下一阶段
SACS AgentContent → Dynamic A2UI

经 ADR-0030 后置
Theme Tokens
```

## 相关文档

- [当前架构](../ARCHITECTURE.md)
- [ADR-0029](../adr/0029-adopt-thin-copilotkit-runtime-and-activate-a2ui-next-phase.md)
- [原型基线](./PROTOTYPE_BASELINES.md)
- [仓库上下文](../../CONTEXT.md)
- [编码 Agent 规则](../../AGENTS.md)
