# Workbench 文档状态

## Current

当前 Workbench 的运行与接入方式以以下文档为准：

- [Web Workbench 手册](../../apps/web-workbench/README.md)；
- [ADR-0028](../adr/0028-use-native-ag-ui-and-retire-compatibility-contracts.md)；
- [根 README](../../README.md)；
- [AGENTS.md](../../AGENTS.md)。

当前 Release Gate 是 `locateDevice` 纵向链路：

```text
AGUIMock or Business Agent
-> AG-UI
-> CopilotKit
-> Workbench
-> Frontend Tool
-> MapLibre
```

## Frozen

[Workbench 原型基线](./PROTOTYPE_BASELINES.md)继续保留。

以下能力属于 Frozen：

- Conversation-first shell 与按需 Inspect 交互；
- Playground / Inspect / Cases / Catalog / Scenarios / Settings 路由；
- 本地 A2UI reducer、受控 renderer、raw viewer 与 component registry；
- case library 与 inspection 支持。

Frozen 表示保留但不扩建平台能力。
它们不是可直接删除的迁移债务，也不是当前 Release Gate。

## Historical

[Workbench SRS](../WEB_WORKBENCH_SRS.md)描述上一阶段的 Presentation-first Generative UI Lab。
其中的 Presentation Pipeline、UI Compiler、Runtime Host、Catalog 与 Theme 平台目标不再描述当前代码。

SRS 只作为历史产品与设计输入保留。
不得根据该文档恢复已移除模块或旧 contracts。
