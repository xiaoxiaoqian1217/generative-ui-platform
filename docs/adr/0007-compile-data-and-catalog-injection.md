# ADR-0007: 定义编译数据所有权和 Catalog 注入

- **状态：** 已接受
- **日期：** 2026-07-27

## 背景

早期目标 `UICompileRequest` 包含 UI Plan Candidate 和 Fallback Markdown，但未携带解析绑定所需的源数据。
设计也曾在由 Core 加载 Catalog 和由 Service 注入 Catalog 两种方案之间反复变化。
Core 无法执行网络访问，否则会违反其框架、传输和供应商无关的边界。

## 决策

`UICompileRequest` 包含 `sourceData`、`sourceKind`、`fallbackMarkdown`、UI Plan Candidate 和 Catalog 引用。
结构化 Agent 输入成为完整且经过校验的 `sourceData`。
Markdown 输入在路由或模型分析前执行安全清理，并且精确转换为 `{ "markdown": sanitizedMarkdown }`。
未经安全清理的原始 Markdown 不得进入 Model Adapter、Core、UI IR、A2UI、缓存或日志。

UI Compiler Service 在展示路由前从授权来源加载并校验请求的 Catalog。
Service 从该确切 Catalog 派生 Router 能力摘要，并在摘要中包含 Catalog ID、版本和内容哈希。
Service 将完整 Catalog 和内容哈希传给 Core。
Core 执行权威 Schema 和引用校验，并拒绝请求中的 Catalog 引用与注入 Catalog 之间存在 Catalog ID 或版本不匹配的情况。
Core 重新计算注入 Catalog 的内容哈希，并与可信 Adapter 选项进行比较。

可信的直接 Core Adapter 可以在不使用 UI Compiler Service 的情况下注入 Catalog。
Core 本身永远不会解析网络或文件系统中的 Catalog 位置。

## 后果

- `presentation-contract`、`compiler-contract` 及其运行时 Schema 必须使用相同的源数据结构。
- Markdown 绑定使用相对于 `sourceData` 的 `/markdown`。
- Router 决策和 Core 编译使用同一份不可变的 Catalog 修订版本。
- Core 与 Catalog 存储和网络协议保持独立。
- 契约和集成测试必须覆盖 Catalog 引用不匹配和不安全 Markdown 排除。

## 取代关系

本 ADR 通过要求在路由或模型分析前清理 Markdown，并定义 Core 使用的源数据结构，进一步明确了 ADR-0005 和 ADR-0006。
这两份 ADR 的展示路由和结构化内容决策在其他方面继续有效。
