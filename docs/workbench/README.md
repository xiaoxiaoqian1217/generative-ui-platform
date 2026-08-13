# Web Workbench Documentation

## Current Role

`web-workbench` 是 Generative UI Platform 当前产品主体，用于验证和调试 Agent 与前端之间的真实交互与生成式 UI 能力。

当前关注点：

- Conversation；
- AG-UI；
- CopilotKit Frontend；
- Controlled UI / Frontend Tool；
- MapLibre GIS；
- Real Agent interoperability；
- A2UI Renderer（下一阶段）；
- Catalog / Theme（后续）。

Workbench 不是 Runtime Platform，也不承担 Business Agent orchestration。

## Implemented Baseline

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

## Current Integration Target

ADR-0029 已接受薄 CopilotKit Runtime 作为下一步 Agent Integration Boundary：

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

用于稳定验证 Workbench capability：

- Frontend Tool；
- Tool Call fixture；
- regression；
- failure / edge case。

### single-agent-chat-server

用于真实 Business Agent interoperability：

- streaming text；
- State；
- Activity；
- Artifact；
- Interrupt / Resume；
- bounded error；
- durable Run semantics。

当前 SACS 不支持 client-provided Frontend Tools；该差异作为 compatibility status 保留。

## A2UI Next Phase

完成薄 Runtime 与 Real Agent 联调后，Workbench 主线进入：

```text
Fixed A2UI Fixture
  ↓
A2UI Renderer MVP
  ↓
Basic Catalog
  ↓
Small Custom Catalog
  ↓
Theme Tokens
  ↓
Dynamic A2UI
```

第一阶段只证明 A2UI Renderer 能稳定工作，不先引入 Secondary LLM。

Controlled UI 与 A2UI 应尽量复用同一套真实 UI primitives、domain UI 和 Theme。

## Product Boundaries

Workbench 当前不建设：

- Runtime Thread / Turn / Operation Platform；
- Runtime Repository / Runtime Truth；
- Command Admission；
- Surface Lifecycle；
- Recovery / Reconcile；
- 自研 Presentation Pipeline；
- 自研 UI Compiler；
- 多 Agent orchestration platform。

CopilotKit Runtime 只作为 Supporting Integration Layer，不改变上述边界。

## Prototype Baselines

[PROTOTYPE_BASELINES.md](./PROTOTYPE_BASELINES.md) 继续保留。

它记录已经确认过的 Workbench UI / IA 设计输入，例如 Conversation shell、Inspect 等原型方向。

这些原型：

- 可以作为后续实现参考；
- 不自动代表当前 Release Gate；
- 不授权恢复已经移除的 Runtime / Compiler 架构。

## Current Roadmap

```text
Completed
#202 Controlled UI Vertical Slice

Current
#207 Thin CopilotKit Runtime
  ↓
#200 Real SACS Interoperability

Next
A2UI Renderer
  ↓
Catalog + Theme
  ↓
SACS AgentContent → Dynamic A2UI
```

## Related Documents

- [Current Architecture](../ARCHITECTURE.md)
- [ADR-0029](../adr/0029-adopt-thin-copilotkit-runtime-and-activate-a2ui-next-phase.md)
- [Prototype Baselines](./PROTOTYPE_BASELINES.md)
- [Repository Context](../../CONTEXT.md)
- [Coding Agent Rules](../../AGENTS.md)
