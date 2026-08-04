# GOAL-DEBUG-CONVERSATIONS-001：持久调试会话与历史回放

## 1. 目标

为 Generative UI Workbench 建立可切换、可恢复、可诊断和可删除的持久调试会话。
Runtime Host 保存用户可见的会话与展示历史，Business Agent 保存业务工作流 checkpoint，两者通过 Shared Thread Identity 关联。

## 2. 基线与前置依赖

本 Goal 必须从 `GOAL-WEB-COPILOTKIT-UI-001` 已合并后的最新 `origin/main` 开始。
该依赖未进入远端 `main` 时，本 Goal 的实现必须暂停。
本 Goal 必须使用独立分支和 worktree，不得与会话 UI Goal 共享分支或工作目录。

## 3. 架构决策

- Agent Runtime Host 是 Debug Conversation、Conversation Turn、Presentation Snapshot 和 Surface 生命周期的权威所有者。
- Business Agent 是工作流状态、工具状态、暂停点和恢复点的权威所有者。
- Runtime Host Thread Repository 与 Business State Checkpoint Store 使用同一个 `threadId`，但不共享数据所有权。
- 开发环境分别提供 SQLite 实现。
- Workbench 通过平台 Runtime Thread Contract 获取线程和历史，不依赖 CopilotKit 托管 `useThreads`。
- 历史 Presentation Snapshot 原样只读回放，不重新调用模型、Presentation Pipeline 或 UI Compiler Core。
- 不兼容快照只显示受限诊断，不自动迁移、重新编译或部分渲染。
- 调试历史默认保留三十天，并具有资源限制和双侧删除语义。

## 4. 范围

- 定义稳定、Schema 校验的 Runtime Thread Contract。
- 建立 Runtime Host Thread Repository 接口和 SQLite 实现。
- 为 Reference Business Agent 建立持久 Business State Checkpoint Store 和删除能力。
- 持久化线程元数据、用户消息、Run 终局、Presentation Snapshot 和安全关联元数据。
- 提供线程列表、创建、加载、重命名、归档、删除和分页。
- 在 Workbench 中提供线程侧栏、切换、搜索或过滤入口和加载状态。
- 回放兼容的 Markdown 与 A2UI 历史。
- 建立保留期限、容量限制、清理和部分失败恢复。
- 建立跨 Runtime Host 与 Business Agent 的一致性状态和诊断。

## 5. 非目标

- 正式生产会话服务。
- 用户账号、租户、权限、多人共享或协同编辑。
- CopilotKit Enterprise Intelligence Platform 或托管线程。
- Provider 原始响应、模型提示词、UI Plan、UI IR 或未清理业务数据存储。
- 历史结果重新生成或自动协议迁移。
- 分布式事务协调器。
- Interaction Gateway 或多 Business Agent 路由。

## 6. 数据所有权

Runtime Host Thread Repository 保存线程元数据、Conversation Turn、用户可见消息、Presentation Snapshot、稳定错误码和安全关联 ID。
Business State Checkpoint Store 保存 LangGraph 内部业务状态、工具状态、暂停点和恢复点。
Workbench 不成为历史权威来源，也不把完整历史持久化到浏览器存储。
日志和 Trace 不得成为历史恢复来源。

## 7. 一致性与失败

Runtime Host 在调用 Business Agent 前创建 pending Turn。
终局状态包括 completed、failed、cancelled 和 history-write-failed。
历史写入失败不得被报告为 Business Agent 失败。
Business Agent 已经执行成功但 Runtime 快照写入失败时，当前页面保留有效结果并明确显示历史未保存。
系统不得自动重复执行可能具有副作用的 Action。
线程删除必须协调两个存储，并显式报告部分删除。

## 8. 安全与保留

调试历史默认保留三十天。
线程、消息、快照、分页和总数据库大小必须具有资源限制。
删除和清理必须可验证且具有稳定结果代码。
SQLite 文件不得进入构建产物、容器镜像或源代码提交。
该能力只面向开发验证数据，不授权存储真实生产敏感数据。

## 9. 验证要求

- Runtime Contract Schema 和兼容性测试。
- Runtime Host Repository、迁移、并发和资源限制测试。
- Business Agent checkpoint 重启恢复和删除测试。
- Workbench 线程切换、历史回放和不兼容快照 E2E。
- Run、Action、Resume 和部分失败平台 E2E。
- SQLite 文件泄漏、日志泄漏和清理测试。
- `pnpm docs:check`。

## 10. 任务与依赖

任务包位于 [`./GOAL-DEBUG-CONVERSATIONS-001/`](./GOAL-DEBUG-CONVERSATIONS-001/README.md)。

```text
TASK-001 Thread Contract 与数据安全模型
├── TASK-002 Runtime Thread Repository
└── TASK-003 Business Agent Checkpoint Store

TASK-002 + TASK-003 → TASK-004 Thread 编排与一致性
TASK-001 + TASK-004 → TASK-005 Workbench 线程管理
TASK-002 + TASK-005 → TASK-006 Presentation Snapshot 回放
TASK-004 + TASK-005 + TASK-006 → TASK-007 保留、删除与部分失败恢复
TASK-007 → TASK-008 自动化验证与文档收口
```

## 11. 完成条件

- Runtime Host 提供稳定 Thread Contract，并成为可见调试历史的权威来源。
- Reference Business Agent 在进程重启后能够按 `threadId` 恢复业务状态。
- Workbench 可以创建、切换、重命名、归档和删除调试会话。
- 兼容的 Markdown 和 A2UI 历史按原会话轮次只读回放。
- 不兼容快照明确降级为受限诊断。
- 三十天保留、资源限制和双侧删除具有自动化证据。
- 任一存储部分失败均不会被伪装为业务成功或业务失败。
- 自动化和文档验证全部通过。
