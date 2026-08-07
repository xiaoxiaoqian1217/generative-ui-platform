# 平台系统架构

本文描述 Generative UI Platform 的当前跨子系统关系。
Runtime 状态所有权与安全 Action 语义以 ADR-0024 为准。

## 主链路

```text
Workbench
   │ AG-UI
   ▼
Agent Runtime Host
   ├── Embedded CopilotKit Runtime
   ├── PlatformRunService
   │     ▼
   │   Runtime Kernel
   │   ├── Runtime Repository
   │   │   ├── Thread
   │   │   ├── Turn
   │   │   ├── Operation
   │   │   ├── Command Admission
   │   │   └── Surface Lifecycle / Presentation Snapshot
   │   ├── Business Agent Adapter
   │   │     ▼
   │   │   Business Agent
   │   │   ├── Business State / Checkpoint
   │   │   ├── Backend Tools / Side Effects
   │   │   └── AgentContent
   │   └── Embedded Presentation Pipeline
   │         ├── Markdown → PresentationResult
   │         └── Structured Data
   │               → Presentation Router / Model Adapter
   │               → untrusted UI Plan Candidate
   │               → UI Compiler Core
   │               → A2UI PresentationResult
   └── Runtime Event Projection
         ├── AG-UI → Workbench
         └── Diagnostics → Diagnostic Store
```

## 事实所有权

```text
Business Agent                  Agent Runtime Host
──────────────                  ──────────────────
Business State                  Runtime Thread
Checkpoint                      Turn
Backend Tool State              Operation
Business Side Effects           Command Admission
                                Surface Lifecycle
                                Presentation Snapshot

                 ↓ projection only ↓

               AG-UI / A2UI / Diagnostics
```

Business Agent 与 Runtime Host 通过 `threadId`、`operationId`、可选 `agentRunId` 等关联标识协作，但不合并各自的权威状态。

## 职责边界

- Workbench 只连接 Agent Runtime Host。
- CopilotKit 是嵌入 Runtime Host 的 Adapter / Infrastructure，不拥有 Runtime Truth。
- Runtime Kernel 是 Runtime Host 内逻辑层，不是独立服务。
- Runtime Repository 是 Thread、Turn、Operation、Command 和 Surface 的权威状态源。
- Business Agent 拥有业务状态、Checkpoint、后端工具和业务副作用语义。
- Business Agent 最终只输出 Markdown 或结构化数据，不输出 UI Plan Candidate 或 A2UI。
- Model Adapter 位于 Presentation Pipeline，输出不可信候选结果。
- UI Compiler Core 是唯一可信 A2UI 生产者。
- Diagnostic Store 是观察投影，可以不完整，不能覆盖 Runtime Repository 真相。

## Action / Command 回传

```text
Frontend Runtime
→ Command(commandId, surfaceId, actionId, expectedRevision, input)
→ Agent Runtime Host
→ Runtime Kernel
   ├── idempotency check
   ├── validate current + actionable Surface
   ├── CAS actionable → claimed
   ├── transaction: create Operation + save Command + consumed
   └── commit
→ Business Agent Adapter
→ Business Agent Resume / Execute
→ Operation Outcome
   ├── completed
   ├── failed
   ├── cancelled
   └── indeterminate
→ Presentation Pipeline
→ New trusted Presentation / Surface
```

已经 `consumed` 的旧 Surface 不因为下游失败自动恢复为 `actionable`。
如果业务结果无法确定，Runtime Host 使用 `indeterminate` 并通过 Reconcile 或新的受控交互关闭不确定状态。

## 恢复

```text
Workbench reconnect / Runtime Host restart
→ Runtime Repository Snapshot
→ rebuild Thread / Turn / Operation / Surface truth
→ optional Diagnostic Event replay for timeline
```

Diagnostic Event 缺失只影响诊断完整性，不改变 Runtime Truth。

## 当前范围

当前阶段使用单一 Reference Business Agent 验证完整链路。
Interaction Gateway、多 Agent 自动路由、多 Agent 协作、分布式 Exactly Once 和 Runtime Kernel 独立服务仍属于未来范围。
