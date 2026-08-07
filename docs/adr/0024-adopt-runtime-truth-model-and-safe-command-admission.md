# ADR-0024：采用 Runtime Truth Model 与安全 Command Admission

- **状态：** 已接受
- **日期：** 2026-08-07

## 背景

当前平台已经明确 Agent Runtime Host 是前端统一入口，Business Agent 拥有业务工作流状态，Presentation Pipeline 嵌入 Runtime Host，UI Compiler Core 是唯一可信 A2UI 生产者。
ADR-0023 进一步明确 Runtime Host 拥有用户可见会话轮次、Presentation Snapshot 和 Surface 生命周期。

但现有 Runtime Contract 和平台诊断设计仍把多个不同事实压在 Turn、Run 和 Diagnostic Event 上。
典型问题包括：

- Turn 同时保存 `requestId`、`runId`、执行 `status` 和 Presentation Snapshot；
- `history-write-failed` 被表达为 Turn 状态，导致诊断持久化状态污染业务执行事实；
- `completed`、`failed`、`degraded` 同时被用于描述业务执行、展示降级和诊断结果，状态维度不正交；
- Action 请求依赖浏览器回传 `runId`，使客户端可以携带本应由 Runtime Host 解析的执行上下文；
- Diagnostic Event 被用于历史恢复，但 Diagnostic Recorder 又被要求 best-effort 且不得阻塞主链路；
- 传输超时或断线时，Runtime Host 无法区分“业务确定失败”和“副作用可能已经发生但结果未知”。

这些问题在单轮展示中不明显，但在 Action、双击、重试、断线、重启、恢复和存在外部副作用时会造成事实冲突或重复执行风险。

## 第一性原理

平台只需要长期守住三类事实所有权：

1. **业务事实由 Business Agent 决定。**
   Business Agent 拥有业务推理、后端工具、业务状态、Checkpoint 和业务副作用语义。
2. **交互事实由 Agent Runtime Host 决定。**
   Runtime Host 决定 Thread、Turn、Operation、Surface、Command 是否被接受以及交互生命周期。
3. **界面和诊断都是事实的投影。**
   Markdown、A2UI、AG-UI 实时事件、TurnDetailsResponse 和 Diagnostic Event 都不得反向成为业务或交互事实的唯一来源。

## 决策

### 1. Runtime Host 内建立 Runtime Kernel

Agent Runtime Host 内建立逻辑上的 `Runtime Kernel`。
它不是独立服务，也不自动新增部署端口或 workspace package。

Runtime Kernel 负责：

- Runtime Truth Model；
- Operation 生命周期；
- Surface 生命周期；
- Command Admission 与幂等；
- 运行并发约束；
- Runtime Repository 的事务边界；
- 从权威状态产生 Runtime Event。

现有 `PlatformRunService` 保留为应用级入口和编排门面，但不得自行维护另一套状态机。
CopilotKit、AG-UI、HTTP/SSE 或未来 WebSocket 只作为 Adapter / Infrastructure，不拥有 Runtime Domain 状态。

### 2. Turn 与 Operation 分离

`Turn` 表示用户可见会话中的稳定位置，不再等价于一次运行。
一次 Turn 可以关联多个 Operation。

`Operation` 是 Runtime Host 实际接受并执行一次工作的最小权威单位。

Operation 至少包含：

- `operationId`；
- `threadId`；
- `turnId`；
- `kind`：`message | action | resume | reconcile`；
- `phase`：描述当前执行阶段；
- `outcome`：描述最终执行结果；
- 可选 `agentRunId`：只作为 Business Agent 或传输关联标识；
- 可选 `resolvesOperationId`：用于 Reconcile 关闭此前的不确定结果；
- 创建和完成时间。

Turn 不再直接承担唯一 `runId` 和完整执行状态的权威语义。

### 3. Operation Phase 与 Outcome 分离

Operation 的执行阶段与最终结果必须正交。

推荐 Phase：

- `accepted`；
- `validating`；
- `running-agent`；
- `presenting`；
- `finished`。

推荐 Outcome：

- `completed`；
- `failed`；
- `cancelled`；
- `rejected`；
- `indeterminate`。

`indeterminate` 是一等结果。
当 Runtime Host 因超时、断线或协议中断无法证明 Business Agent 的副作用是否已经发生时，不得错误记录为 `failed`。
后续只能通过明确的 Reconcile、业务幂等键或 Business Agent 提供的恢复能力关闭该不确定状态。

### 4. 使用正交状态描述不同事实

平台禁止使用一个 `status` 同时描述业务执行、展示降级、诊断持久化和 Surface 可操作性。

至少分离以下状态维度：

- `OperationOutcome`：`completed | failed | cancelled | rejected | indeterminate`；
- `PresentationOutcome`：`a2ui | markdown | fallback | failed`；
- `HistoryPersistenceStatus`：`pending | saved | failed | skipped`；
- `SurfaceInteractionState`：`actionable | claimed | consumed | disabled`；
- `PresentationRole`：`current | historical`。

`history-write-failed` 不再属于 Turn 执行状态。
Presentation fallback 不得把已经成功的业务 Operation 改写为失败或“业务 degraded”。

### 5. Surface 成为 Runtime Domain 的权威交互对象

A2UI 是 Surface 的展示 Payload，不是 Surface 生命周期本身。
Runtime Host 至少保存：

- `surfaceId`；
- `threadId`；
- `turnId`；
- `presentationId`；
- `revision`；
- `presentationRole`；
- `interactionState`；
- 可选 `claimedByOperationId`；
- 已验证的 Presentation Snapshot / A2UI 引用。

`current` 与 `historical` 属于 Runtime Domain，不写入或依赖模型生成的 A2UI 字段。
`actionable`、`claimed`、`consumed` 和 `disabled` 也属于 Runtime Domain。

### 6. 浏览器发送 Command，不发送权威 Run 上下文

Frontend Action 请求应逐步收敛为：

```text
commandId
surfaceId
actionId
expectedRevision
input
```

浏览器不得把 `runId`、Business Agent Checkpoint 或其他内部执行上下文作为权威来源提交给 Runtime Host。
Runtime Host 必须根据 `surfaceId` 从 Runtime Repository 解析：

- threadId；
- turnId；
- Presentation；
- 原 Operation；
- Business Agent 恢复关联信息。

客户端只能提出 Command，不能指定 Runtime 应在哪个内部 Run 上执行该 Command。

### 7. Action 使用安全 Command Admission

Action 的权威接纳流程为：

1. 校验 `commandId` 幂等记录；
2. 读取并校验 Surface 为 `current + actionable`；
3. 校验 `actionId`、输入 Schema、权限、确认要求和 `expectedRevision`；
4. 获取同 Thread / Surface 的并发执行容量；
5. 使用 CAS 将 Surface 从 `actionable` 变为 `claimed`；
6. 在同一个 Runtime Repository 本地事务中创建 Operation、保存 Command 幂等记录并将 Surface 变为 `consumed`；
7. 事务提交后才调用 Business Agent；
8. Business Agent 成功、失败或结果未知只更新 Operation Outcome，不把旧 Surface 自动恢复为 actionable。

`consumed` 的语义是“Runtime Host 已正式接受该 Command”，不是“Business Agent 已成功完成”。

如果用户需要重试，应生成新的受控 Surface、显式 Retry Command 或 Reconcile Operation，而不是重新激活已经消费的旧 Surface。

### 8. 追求 Effectively-once Command Admission，而非分布式 Exactly-once

平台不承诺整个分布式链路 Exactly Once。
平台要求：

```text
at-least-once transport
+ idempotent persistence
+ exactly-one command admission
```

同一个 `commandId` 或同一 Surface Revision 的同一受控 Action，即使因为双击、网络重发、重连或 Adapter 重放被多次送达，Runtime Host 最多只能正式接受一个 Operation。

Business Agent 和外部业务系统仍应使用 `operationId`、`commandId` 或业务幂等键保护真实业务副作用。

### 9. Runtime Repository 与 Diagnostic Store 分离

新增明确的 `Runtime Repository` 概念，保存可恢复的交互权威事实：

- Runtime Thread；
- Turn；
- Operation；
- Command Admission / Idempotency Record；
- Surface Lifecycle；
- 已验证 Presentation Snapshot 和必要的安全关联元数据。

Diagnostic Recorder / Diagnostic Store 只保存观察和诊断投影：

- DiagnosticEvent；
- DiagnosticArtifact；
- trace、耗时、阶段、错误和公开 Artifact 引用。

Diagnostic Store 可以 best-effort、不完整或按容量保护跳过数据，因此不得成为当前 Runtime 状态恢复的唯一来源。

Workbench 重连或 Runtime Host 重启后的恢复顺序为：

1. 从 Runtime Repository 重建当前权威状态；
2. 在 Diagnostic Event 连续且可用时使用事件 Replay 优化时间线体验；
3. Event 存在缺口时明确标记诊断不完整，但不得因此改变 Runtime Truth。

### 10. Runtime Event 是投影，不是唯一事实数据库

`PlatformRuntimeEvent` 继续作为统一运行事件表达，但新增 `operationId` 作为一等关联标识。
`runId` 降为可选外部执行或兼容关联标识，不再作为 Runtime Domain 的主键。

Runtime Kernel 在权威状态提交后产生事件，并投影到：

- AG-UI 实时流；
- Diagnostic Recorder；
- 其他未来只读观察者。

不得通过“重放 Diagnostic Event 并猜测”来修复与 Runtime Repository 冲突的权威状态。

### 11. CopilotKit 明确降为 Adapter / Infrastructure

CopilotKit Runtime 继续嵌入 Agent Runtime Host，并提供 AG-UI 入口和标准运行时能力。
但 CopilotKit 不拥有：

- Runtime Thread 权威状态；
- Operation 生命周期；
- Surface 生命周期；
- Command 幂等；
- Business Agent 私有状态；
- Presentation Pipeline 决策。

替换 CopilotKit 时，Runtime Kernel、Runtime Repository、Business Agent Adapter 和 Presentation Pipeline 的领域语义不得被迫改变。

## 权威状态关系

```text
Business Agent                         Agent Runtime Host
┌──────────────────────────┐           ┌──────────────────────────────┐
│ Business State           │           │ Runtime Repository           │
│ Checkpoint               │           │ Thread                       │
│ Tool State               │           │ Turn                         │
│ Business Side Effects    │           │ Operation                    │
└─────────────┬────────────┘           │ Command Admission            │
              │ shared threadId        │ Surface Lifecycle            │
              └───────────────────────>│ Presentation Snapshot        │
                                          └──────────────┬───────────────┘
                                                         │ projection
                                 ┌───────────────────────┴───────────────────────┐
                                 ▼                                               ▼
                           AG-UI Live View                                Diagnostic Store
```

## 与既有 ADR 的关系

本 ADR 扩展 ADR-0023 对 Runtime Host 历史所有权和 Surface 生命周期的决定，并将其细化为 Thread / Turn / Operation / Surface / Command 五类权威交互事实。
本 ADR 不改变 ADR-0019 的 Presentation Pipeline 嵌入式部署决策。
本 ADR 不改变 UI Compiler Core 作为唯一可信 A2UI 生产者的既有约束。
本 ADR 不改变 Business Agent 对业务 State 和 Checkpoint 的权威所有权。

本 ADR 明确取代平台文档中“DiagnosticEvent 和 DiagnosticArtifact 是 Runtime 历史恢复的唯一权威数据”这一表述。
DiagnosticEvent 和 DiagnosticArtifact 仍然是诊断子系统中的规范记录，但不是 Runtime 交互状态的权威数据库。

## 实施顺序

本 ADR 只确定目标架构，不要求一次性破坏性迁移。
推荐顺序：

1. 在 `runtime-contract` 引入 Operation、正交状态和 Command/Surface 契约；
2. 在 Runtime Host 内建立 Runtime Kernel 与 Runtime Repository 接口；
3. 迁移 Action Admission 与幂等语义；
4. 迁移 Thread / Turn 持久化，不再让 Turn 承担 Run 和 history-write 状态；
5. 调整 Diagnostic Recorder 为纯投影；
6. 调整 Workbench 恢复逻辑，以 Runtime Repository Snapshot 为权威、Event Replay 为优化；
7. 删除仅为旧状态模型服务的兼容字段。

迁移期间允许保留兼容字段，但必须标记为 compatibility-only，并禁止新增依赖。

## 后果

- Runtime 的事实模型与传输、CopilotKit 和 Diagnostics 解耦；
- Action 双击、重发、断线和重启可以用明确的幂等和状态机处理；
- 不确定副作用不再被错误归类为普通失败；
- Presentation fallback、历史写入失败和业务执行失败不再互相污染；
- Runtime Host 需要一个真正可事务更新的 Runtime Repository；
- Runtime Contract 会发生版本化迁移，现有 Turn / Run / Action 字段需要兼容期；
- Diagnostic Event 缺失不再阻止当前状态恢复，但完整时间线仍可能标记为不完整；
- 后续多 Agent、Interaction Gateway 或多实例部署可以建立在稳定 Runtime Truth Model 上，而不需要先复制当前错误状态语义。

## 明确不在本 ADR 中决定

以下内容需要独立 ADR 或实现决策：

- Runtime Kernel 是否提取为 workspace package；
- PostgreSQL、事件总线或分布式锁；
- 多 Agent 路由和 Interaction Gateway；
- A2UI v1 升级与版本 Encoder；
- Markdown 自动增强为 Generative UI；
- 生产级多租户权限和审计。
