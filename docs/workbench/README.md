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
Frontend Tool: locateDevice
  ↓
MapLibre + DeviceCard
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

## A2UI 下一阶段

完成薄 Runtime 与真实 Agent 联调后，Workbench 主线进入：

```text
固定 A2UI Fixture
  ↓
A2UI Renderer MVP
  ↓
Basic Catalog
  ↓
小规模 Custom Catalog
  ↓
Theme Tokens
  ↓
Dynamic A2UI
```

第一阶段只证明 A2UI Renderer 能稳定工作，不先引入 Secondary LLM。

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

当前
#207 Thin CopilotKit Runtime
  ↓
#200 Real SACS Interoperability

下一阶段
A2UI Renderer
  ↓
Catalog + Theme
  ↓
SACS AgentContent → Dynamic A2UI
```

## 相关文档

- [当前架构](../ARCHITECTURE.md)
- [ADR-0029](../adr/0029-adopt-thin-copilotkit-runtime-and-activate-a2ui-next-phase.md)
- [原型基线](./PROTOTYPE_BASELINES.md)
- [仓库上下文](../../CONTEXT.md)
- [编码 Agent 规则](../../AGENTS.md)
