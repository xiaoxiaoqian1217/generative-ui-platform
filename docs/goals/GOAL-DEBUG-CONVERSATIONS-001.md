# GOAL-DEBUG-CONVERSATIONS-001：持久调试会话与历史回放

## 0. ADR-0024 取代说明

本 Goal 的历史交付事实继续保留。
自 ADR-0024 被接受并确认后，本 Goal 中原有的 pending Turn、Run 终局、`history-write-failed` Turn 状态以及 Diagnostic Event 作为恢复权威来源的语义均被取代。
后续实现与维护必须使用 Thread、Turn、Operation、Surface、Command Admission、Runtime Repository 和独立 History Persistence 状态解释运行事实。
兼容字段可以暂时存在，但不得继续扩展旧语义。

## 1. 目标

为 Generative UI Workbench 建立可切换、可恢复、可诊断和可删除的持久调试会话。
Runtime Host 保存用户可见会话、Operation、Surface 和可信 Presentation Snapshot 等交互事实。
Business Agent 保存业务工作流 checkpoint 和业务状态。
两者通过 Shared Thread Identity 关联，但不共享数据所有权。

## 2. 基线与前置依赖

本 Goal 必须从 `GOAL-WEB-COPILOTKIT-UI-001` 已合并后的最新 `origin/main` 开始。
该依赖未进入远端 `main` 时，本 Goal 的实现必须暂停。
本 Goal 必须使用独立分支和 worktree，不得与会话 UI Goal 共享分支或工作目录。

## 3. 架构决策

- Agent Runtime Host 是 Debug Conversation、Conversation Turn、Operation、Presentation Snapshot、Command Admission 和 Surface 生命周期的权威所有者。
- Business Agent 是工作流状态、工具状态、暂停点、恢复点和业务副作用语义的权威所有者。
- Runtime Repository 与 Business State Checkpoint Store 使用同一个 `threadId`，但不共享数据所有权。
- 开发环境分别提供 SQLite 或等价持久化实现。
- Workbench 通过平台 Runtime Contract 获取线程和历史，不依赖 CopilotKit 托管 `useThreads`。
- 历史 Presentation Snapshot 原样只读回放，不重新调用模型、Presentation Pipeline 或 UI Compiler Core。
- 不兼容快照只显示受限诊断，不自动迁移、重新编译或部分渲染。
- Diagnostic Event 和 Diagnostic Artifact 是观察与诊断投影，不是 Runtime 当前状态恢复的唯一权威来源。
- 调试历史默认保留三十天，并具有资源限制和双侧删除语义。

## 4. 范围

- 定义稳定、Schema 校验的 Runtime Thread、Turn、Operation、Surface 和 Command 相关 Contract。
- 建立 Runtime Host Runtime Repository 接口和 SQLite 实现。
- 为 Reference Business Agent 建立持久 Business State Checkpoint Store 和删除能力。
- 持久化线程元数据、用户消息、Operation Outcome、Surface Lifecycle、Presentation Snapshot 和安全关联元数据。
- 独立记录 History Persistence 状态，不把诊断写入失败混入业务执行结果。
- 提供线程列表、创建、加载、重命名、归档、删除和分页。
- 在 Workbench 中提供线程侧栏、切换、搜索或过滤入口和加载状态。
- 回放兼容的 Markdown 与 A2UI 历史。
- 建立保留期限、容量限制、清理和部分失败恢复。
- 建立跨 Runtime Host 与 Business Agent 的一致性状态和诊断。
- 为 Action / Resume 保留 commandId、Surface revision 和 Operation 关联信息，以支持安全幂等和恢复。

## 5. 非目标

- 正式生产会话服务。
- 用户账号、租户、权限、多人共享或协同编辑。
- CopilotKit Enterprise Intelligence Platform 或托管线程。
- Provider 原始响应、模型提示词、UI Plan、UI IR 或未清理业务数据存储。
- 历史结果重新生成或自动协议迁移。
- 分布式事务协调器。
- 分布式 Exactly Once。
- Interaction Gateway 或多 Business Agent 路由。

## 6. 数据所有权

Runtime Repository 保存 Runtime Thread、Conversation Turn、Operation、Command Admission、Surface Lifecycle、用户可见消息、Presentation Snapshot、稳定错误码和必要安全关联 ID。
Business State Checkpoint Store 保存 LangGraph 内部业务状态、工具状态、暂停点和恢复点。
Diagnostic Store 保存 Diagnostic Event、Diagnostic Artifact、耗时、阶段、错误和公开 Artifact 引用。
Workbench 不成为历史权威来源，也不把完整历史持久化到浏览器存储。
日志、Trace 和 Diagnostic Event 不得覆盖 Runtime Repository 的权威状态。

## 7. 一致性与失败

Runtime Host 接受用户消息或 Action 时必须创建对应 Operation，而不是让 Turn 直接承担完整执行生命周期。
Operation Phase 与 Outcome 必须分离。
Operation Outcome 至少支持 `completed`、`failed`、`cancelled`、`rejected` 和 `indeterminate`。
当 Runtime Host 因超时、断线或协议中断无法证明 Business Agent 的副作用是否已经发生时，必须记录 `indeterminate`，不得自动归类为普通失败并重试。
History Persistence 使用独立状态，例如 `pending`、`saved`、`failed` 或 `skipped`。
历史写入失败不得被报告为 Business Agent 失败。
Business Agent 已经执行成功但 Runtime Snapshot 或诊断写入失败时，当前页面应保留有效结果，并明确显示相应持久化状态。
系统不得自动重复执行可能具有副作用的 Action。
已经被 Runtime Host 正式接受的 Surface Action 不得因为后续 Business Agent 失败或结果未知而重新激活旧 Surface。
线程删除必须协调 Runtime Repository 与 Business State Checkpoint Store，并显式报告部分删除。

## 8. 安全与保留

调试历史默认保留三十天。
线程、消息、Operation、Surface、快照、分页和总数据库大小必须具有资源限制。
删除和清理必须可验证且具有稳定结果代码。
SQLite 文件不得进入构建产物、容器镜像或源代码提交。
该能力只面向开发验证数据，不授权存储真实生产敏感数据。

## 9. 恢复要求

Runtime Host 重启或 Workbench 重连后，必须先从 Runtime Repository 恢复 Thread、Turn、Operation、Surface 和可信 Presentation Snapshot。
Diagnostic Event Replay 只用于恢复可观察时间线和 Inspect 体验。
如果 Diagnostic Event 存在 sequence 缺口，Workbench 必须显示诊断不完整提示，但不得因此修改或否定 Runtime Repository 中的当前状态。

## 10. 验证要求

- Runtime Contract Schema 和兼容性测试。
- Runtime Repository、迁移、事务、并发和资源限制测试。
- Operation Phase / Outcome 和 `indeterminate` 测试。
- Command Admission 幂等、Surface revision、claim/consume 并发测试。
- Business Agent checkpoint 重启恢复和删除测试。
- Workbench 线程切换、历史回放和不兼容快照 E2E。
- Run compatibility、Action、Resume、Reconcile 和部分失败平台 E2E。
- Diagnostic Event 缺口不改变 Runtime Truth 的恢复测试。
- SQLite 文件泄漏、日志泄漏和清理测试。
- `pnpm docs:check`。

## 11. 任务与依赖

历史任务包位于 [`./GOAL-DEBUG-CONVERSATIONS-001/`](./GOAL-DEBUG-CONVERSATIONS-001/README.md)。
历史任务包中的 Run-centric 或 Turn-status 语义按 ADR-0024 解释为兼容实现背景，不再作为新增实现规范。
后续迁移应遵循 `docs/platform/RUNTIME_TRUTH_MIGRATION.md`。

```text
TASK-001 调试会话契约与安全边界
  → TASK-002 持久化调试会话的运行闭环
      → TASK-004 Workbench 调试会话管理
          → TASK-005 只读回放历史 Presentation Snapshot
              → TASK-006 保留策略、双侧删除与部分失败恢复
                  → TASK-007 调试会话自动化验收与运维文档收口
  → TASK-003 跨重启恢复 Business Agent 工作流
      → TASK-006 保留策略、双侧删除与部分失败恢复
```

## 12. 完成条件

- Runtime Host 提供稳定 Runtime Contract，并成为可见调试交互事实的权威来源。
- Runtime Repository 可以恢复 Thread、Turn、Operation、Surface 和 Presentation Snapshot。
- Reference Business Agent 在进程重启后能够按 `threadId` 恢复业务状态。
- Workbench 可以创建、切换、重命名、归档和删除调试会话。
- 兼容的 Markdown 和 A2UI 历史按原会话轮次只读回放。
- 不兼容快照明确降级为受限诊断。
- `indeterminate` 不会被伪装为普通失败。
- Diagnostic Event 缺失或持久化失败不会覆盖 Runtime Truth。
- 三十天保留、资源限制和双侧删除具有自动化证据。
- 任一存储部分失败均不会被伪装为业务成功或业务失败。
- 自动化和文档验证全部通过。
