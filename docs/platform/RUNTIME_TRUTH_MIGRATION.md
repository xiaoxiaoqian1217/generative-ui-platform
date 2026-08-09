# Runtime Truth Model 迁移与冲突处置

本文记录 ADR-0024 被确认后的迁移约束。
本文不是新的架构决策，所有目标语义均来自已接受的 [ADR-0024](../adr/0024-adopt-runtime-truth-model-and-safe-command-admission.md)。

## 1. 决策状态

2026-08-07，以下六项已识别冲突确认以 ADR-0024 的新语义为准。
它们不再属于待决策事项。
旧 Contract、Goal 或实现可以在迁移期继续存在，但只能作为兼容层或历史记录，禁止成为新增功能的设计依据。

## 2. 已确认的六项冲突

### 2.1 Turn 与执行状态模型

旧模型把 `requestId`、`runId`、执行状态和 Presentation Snapshot 直接压在 Conversation Turn 上，并包含 `history-write-failed` 等混合状态。
目标模型以 `Thread -> Turn -> Operation` 表达执行事实。
Turn 是稳定的用户可见会话位置，Operation 是 Runtime Host 正式接受并执行一次工作的最小权威单位。
`history-write-failed` 不再属于 Turn 或 Operation 的业务执行结果。

**决议：以 ADR-0024 为准。**

### 2.2 Action 请求中的客户端 `runId`

旧 Runtime Action Contract 要求浏览器提交 `threadId + runId + action`。
目标模型要求浏览器提交 Command，并由 Runtime Host 根据 `surfaceId` 解析 Thread、Turn、Operation 和 Business Agent 恢复上下文。
目标请求逐步收敛为 `commandId + surfaceId + actionId + expectedRevision + input`。

**决议：以 ADR-0024 为准。**

### 2.3 Surface 生命周期

旧 Surface Context Store 以 `threadId + runId + surfaceId` 为 Key，并通过内存删除表达 `consume`。
目标模型把 Surface 作为 Runtime Domain 权威对象，至少拥有 `revision`、`presentationRole` 和 `interactionState`。
交互状态采用 `actionable -> claimed -> consumed`，并由可事务更新的 Runtime Repository 保存。

**决议：以 ADR-0024 为准。**

### 2.4 超时、断线与不确定结果

旧 Business Agent / Runtime Result 主要使用 `completed | failed`，无法表达副作用可能已经发生但 Runtime Host 无法确认结果的情况。
目标 Operation Outcome 必须支持 `indeterminate`。
发生网络超时、协议中断或连接丢失且无法证明业务副作用未发生时，不得把结果自动归类为普通 `failed` 并直接重试。

**决议：以 ADR-0024 为准。**

### 2.5 Workbench 历史恢复与 Diagnostic Event

旧 Workbench SRS 中存在“Diagnostic Event 是过程事实、Diagnostic Artifact 是完整内容事实”以及通过 `lastSequence` 补齐历史的表述。
诊断事件仍然是诊断子系统中的规范记录，但不再是 Runtime 当前交互状态的唯一权威来源。
Workbench 恢复必须先从 Runtime Repository 重建 Thread、Turn、Operation、Surface 和可信 Presentation Snapshot。
Diagnostic Event Replay 只用于补齐时间线体验，事件缺口只能导致“诊断不完整”，不得改变 Runtime Truth。

**决议：以 ADR-0024 为准。**

在 `docs/WEB_WORKBENCH_SRS.md` 完成物理文本迁移前，其中与本节冲突的 DR-007、AR-011 及同义条款均视为被 ADR-0024 取代。

### 2.6 GOAL-DEBUG-CONVERSATIONS-001 的旧 Turn / Run 语义

旧 Goal 使用 pending Turn、Run 终局以及 `completed | failed | cancelled | history-write-failed` 描述持久会话状态。
目标模型改为 Runtime Repository 保存 Thread、Turn、Operation、Surface、Command Admission 和 Presentation Snapshot。
执行终局由 Operation Outcome 表达，历史写入状态独立表达。

**决议：以 ADR-0024 为准。**

该 Goal 的历史交付事实继续保留，但其中与 ADR-0024 冲突的状态语义仅作为旧实现背景，不再约束后续实现。

## 3. 迁移原则

目标语义立即生效，但公共 API 和持久化 Schema 不要求一次性破坏性切换。
迁移期间允许保留旧字段，但必须满足以下约束：

- 旧 `runId` 只作为兼容关联 ID，不再作为 Runtime Domain 主键；
- 旧 Turn `status` 只作为兼容投影，不得继续新增状态语义；
- `history-write-failed` 必须迁移到独立 History Persistence 状态；
- 新代码不得根据 Diagnostic Event 反推并覆盖 Runtime Repository 的权威状态；
- 新 Action 路径必须向 Command Admission 和幂等语义收敛；
- 已消费 Surface 不得因为 Business Agent 失败、超时或结果未知而自动恢复 actionable；
- `indeterminate` 必须通过 Reconcile、业务幂等键或 Business Agent 明确恢复语义关闭；
- Compatibility Adapter 可以接受旧请求，但进入 Runtime Kernel 后必须转换为新领域语义。

## 4. 推荐实施顺序

1. 在 `packages/runtime-contract` 新增 Operation、正交 Outcome、Surface 和 Command 契约，同时保留 V1 compatibility 字段。
2. 在 Agent Runtime Host 内建立 Runtime Repository 与 Runtime Kernel 接口。
3. 将 Surface Context Store 迁移为持久 Surface Lifecycle，并实现 revision 与 CAS claim。
4. 将 Action Admission 迁移为 commandId 幂等和 effectively-once admission。
5. 将 Run / Action 的超时与未知副作用迁移为 `indeterminate` 和 Reconcile 流程。
6. 迁移 Thread Repository，不再把 Run 和 History Persistence 状态压在 Turn 上。
7. 将 Workbench 恢复改为 Runtime Repository Snapshot 优先，Diagnostic Replay 只作为时间线优化。
8. 所有调用方迁移完成后删除旧字段和旧状态。

## 5. 不受本次冲突处置影响的既有决策

以下既有架构继续有效：

- Workbench 只连接 Agent Runtime Host；
- Business Agent 拥有业务 State、Checkpoint 和业务副作用语义；
- Runtime Host 拥有平台交互事实；
- CopilotKit Runtime 嵌入 Runtime Host，且不成为第二套 Runtime Truth；
- Presentation Pipeline 嵌入 Runtime Host；
- Business Agent 不输出 UI Plan Candidate 或 A2UI；
- UI Compiler Core 是唯一可信 A2UI 生产者；
- 历史 Presentation Snapshot 按兼容性规则只读回放；
- Historical Surface 不可重新执行 Action。

## 6. 后续冲突处理

如果迁移过程中发现新的文档或实现与 ADR-0024 或其他当前有效 ADR 冲突，必须使用 `ARCHITECTURE CONFLICT` 明确标记。
在架构决策者确认前，不得通过实现细节静默改变当前架构。
确认后应同步更新 ADR 关系、平台规范、Goal 或迁移说明。