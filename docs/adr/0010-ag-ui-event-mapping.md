# ADR-0010: 定义 AG-UI 事件映射

- **状态：** 已接受
- **日期：** 2026-07-27

## 背景

`PresentationRequest.threadId` 和 `runId` 是可选字段，而标准 AG-UI Run 生命周期事件要求使用非空标识符。
项目还需要在不发明非标准生命周期事件的情况下传递 `PresentationResult`。

## 决策

AG-UI Adapter 使用标准的 `RUN_STARTED`、`STEP_STARTED`、`STEP_FINISHED`、`RUN_FINISHED`、`RUN_ERROR` 和 `CUSTOM` 事件。
项目结果和错误在已记录的 `CUSTOM` 事件名称中使用带版本的 Payload。

如果调用方省略 `threadId` 或 `runId`，Adapter 会在输出 `RUN_STARTED` 前生成请求级标识符。
相同的标识符用于请求上下文和所有适用的生命周期事件。
Core 可以通过诊断信息透传关联字段，但不管理 AG-UI Run 状态。

降级 Markdown 结果是可消费的，并以 `RUN_FINISHED` 结束。
不包含可消费内容的失败会输出安全错误事件，并以 `RUN_ERROR` 结束。

## 后果

- 每个 AG-UI Run 都有有效且内部一致的标识。
- 公共 `PresentationRequest` 可以保留可选关联字段。
- 消费方可以独立于 AG-UI 协议对自定义 Payload 进行版本控制。
- 契约测试必须校验标识符生成、事件顺序、终止事件互斥性和 Payload 版本。
