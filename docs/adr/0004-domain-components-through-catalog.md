# ADR-0004: 通过 Component Catalog 声明领域组件

- **状态：** 已接受
- **日期：** 2026-07-24

Generative UI Compiler 必须支持领域专用 UI，同时不学习领域逻辑，也不实现前端组件。
因此，MVP 允许 Component Catalog 声明领域组件类型、语义、Props Schema、Action Schema 和结构约束。
UI Compiler Core 可以像选择通用组件一样选择这些声明，而外部 Component Registry 仍负责将组件类型映射到真实的前端实现。

此决策扩展了 MVP 契约夹具和测试，使其至少覆盖一个领域组件声明。
它不会向 MVP 添加 Frontend Runtime、Component Registry 实现、真实领域组件或领域业务逻辑。
