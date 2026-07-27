# ADR-0002: 将模型编译结果表示为显式状态

- **状态：** 已接受
- **日期：** 2026-07-24

## 背景

最初的 `UICompileResult` 接口使用可选字段和布尔值 `success`。
它允许成功结果同时包含 Operations 和 Fallback 内容等相互矛盾的值。
需求文档描述了一个判别联合，但遗漏了共享的关联字段和元数据字段。

## 决策

将 `UICompileResult` 表示为三种互斥状态：

- 完全成功包含一个 Surface ID 和至少一个 A2UI Operation。
- 降级成功包含一个 Fallback 和至少一个结构化编译错误。
- 完全失败包含结构化编译错误，且不包含可消费的输出。

每种状态都包含 Request ID 和编译元数据。
`degraded` 判别字段位于顶层。
运行时校验使用 `uiCompileResultSchema`，TypeScript 类型从该 Schema 推导。

## 后果

- 消费方无需猜测可选字段即可收窄结果类型。
- 无效的字段组合会在运行时被拒绝。
- 降级内容仍然是成功且可消费的结果。
- 对旧版宽松接口的消费方而言，此变更属于破坏性变更。
- AG-UI Adapter 必须区分 A2UI 结果、Fallback 结果和终止错误。
