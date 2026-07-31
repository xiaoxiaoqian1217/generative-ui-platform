# TASK-001：平台集成契约

## 目标

建立 Business Agent、Agent Runtime Host、Presentation Pipeline、UI Compiler Core 与 Web 之间的公共契约，并明确跨进程协议和进程内 Package 契约的不同职责。

## 实施前审计

- 盘点现有 `presentation-contract`、`compiler-contract`、Runtime 消息和 Demo 消息类型。
- 标记可复用、需扩展、需废弃和存在语义冲突的类型。
- 区分跨进程消息、Runtime 应用层对象和 Presentation Pipeline 进程内请求。
- 不得在未迁移引用前直接删除旧类型。

## 工作项

- 定义 Business Agent Run Request / Result。
- 定义 Business Agent Resume Action Request / Result。
- 定义 Runtime HTTP / WebSocket Run 与 Action 消息。
- 复用现有 AgentContent、PresentationRequest 和 PresentationResult。
- 明确 PresentationRequest / PresentationResult 是 Runtime 与 Pipeline 的进程内稳定契约，不建立 UI Compiler 网络协议。
- 定义统一、稳定的错误码和关联 ID。
- 为所有跨进程消息增加运行时 Schema 校验。
- 为进程内公共契约增加运行时边界校验和独立测试。
- 为重复类型制定迁移和废弃计划，完成引用迁移后再删除。

## 架构限制

- Business Agent Contract 不包含 PresentationDecision、UI Plan Candidate 或 A2UI。
- 应用不得各自定义语义相同但结构不同的公共消息。
- 公共契约放入匹配的 contract package，package 不依赖 app。
- 不定义独立 UI Compiler HTTP Contract、UI Compiler Client Contract 或 Remote Mode Contract。
- Runtime Host 不得通过契约层绕过 Presentation Pipeline 直接构造 UI Plan Candidate、UI IR 或 A2UI。

## 验收

- 契约可以独立构建和测试。
- 非法消息在对应边界稳定拒绝。
- Runtime Result 可以携带 PresentationResult 和必要诊断摘要。
- 文档和类型能够明确区分跨进程协议与进程内 Package 契约。
- 仓库中不存在以当前目标架构为名义新增的 UI Compiler 网络调用契约。
- 旧消息迁移不破坏现有 HTTP / WebSocket Demo 测试。
- 受影响范围 lint、typecheck、test 和 build 通过。
