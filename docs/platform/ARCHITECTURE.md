# Generative UI Platform 平台级架构

本文描述整个仓库的当前跨子系统关系。
Compiler 内部架构继续以 `docs/ARCHITECTURE.md` 和 `docs/Generative_UI_Compiler_Design.md` 为准。
Runtime 状态所有权与安全 Action 语义以 ADR-0024 为准。

## 1. 架构原则

平台从事实所有权而不是框架出发组织：

1. **Business Agent 拥有业务事实。**
   业务推理、后端工具、业务状态、Checkpoint 和业务副作用语义由 Business Agent 决定。
2. **Agent Runtime Host 拥有交互事实。**
   Thread、Turn、Operation、Command Admission、Surface 生命周期和可信 Presentation Snapshot 由 Runtime Host 决定。
3. **界面和诊断是投影。**
   AG-UI、Markdown、A2UI、TurnDetailsResponse、DiagnosticEvent 和 DiagnosticArtifact 不得反向成为业务或 Runtime 交互事实的唯一来源。
4. **框架属于 Adapter。**
   CopilotKit、AG-UI、HTTP/SSE 和未来 WebSocket 不拥有 Runtime Domain 状态。

## 2. 平台链路

```text
Generative UI Workbench
        │
        │ AG-UI Projection
        ▼
Agent Runtime Host
├── Transport / Framework Adapters
│   └── Embedded CopilotKit Runtime
├── PlatformRunService
│   └── Runtime Kernel
│       ├── Runtime Truth Model
│       │   ├── Thread
│       │   ├── Turn
│       │   ├── Operation
│       │   ├── Command Admission
│       │   └── Surface Lifecycle
│       ├── Runtime Repository
│       ├── Business Agent Adapter ──> Business Agent
│       │                              ├── 业务 State / Checkpoint
│       │                              ├── 后端工具 / 业务副作用
│       │                              └── 最终 AgentContent
│       └── Embedded Presentation Pipeline
│           ├── Markdown AgentContent
│           │     └── Markdown PresentationResult
│           └── Structured AgentContent
│                 └── Presentation Router / Model Adapter
│                       └── UI Plan Candidate
│                             └── UI Compiler Core
│                                   └── UI IR / A2UI PresentationResult
├── Runtime Event Projection
│   ├── AG-UI Projection ──> Workbench
│   └── Diagnostic Projection ──> Diagnostic Recorder
└── Runtime Query API
    ├── Thread / Turn / Operation / Surface
    ├── Turn Details / Artifact
    └── Diagnostic Bundle
```

Runtime Kernel 是 Runtime Host 内部逻辑层，不是独立服务。
当前不自动新增 `packages/runtime-kernel`、端口或部署单元。

## 3. 核心事实模型

### 3.1 Thread

Thread 是 Runtime Host 管理的用户可见会话容器。
它与 Business Agent Checkpoint 通过共享 `threadId` 关联，但不共享数据所有权。

### 3.2 Turn

Turn 是用户可见会话中的稳定位置。
Turn 保存用户输入及其可见展示关系，但不再等价于一次执行。
一个 Turn 可以关联多个 Operation。

Turn 不应承担：

- 唯一 `runId`；
- 完整执行生命周期；
- 诊断持久化成功或失败；
- Surface 是否仍可操作。

### 3.3 Operation

Operation 是 Runtime Host 正式接受并执行一次工作的最小权威单位。

Operation 至少包含：

```text
operationId
threadId
turnId
kind: message | action | resume | reconcile
phase
outcome?
agentRunId?
resolvesOperationId?
createdAt
finishedAt?
```

`agentRunId` 只作为 Business Agent 或外部执行关联标识，不作为 Runtime Domain 主键。

### 3.4 Operation Phase

Phase 描述工作执行到哪里，例如：

```text
accepted
validating
running-agent
presenting
finished
```

Phase 与最终 Outcome 正交。

### 3.5 Operation Outcome

Outcome 描述 Runtime Host 最终知道了什么：

```text
completed
failed
cancelled
rejected
indeterminate
```

`indeterminate` 是一等结果。
当超时、断线或协议中断使 Runtime Host 无法证明业务副作用是否发生时，不得记录成普通 `failed`。

### 3.6 正交状态

不同事实必须使用不同状态维度：

| 维度 | 回答的问题 | 示例 |
|---|---|---|
| Operation Outcome | 本次执行结果是否确定 | completed / failed / indeterminate |
| Presentation Outcome | 最终如何展示 | a2ui / markdown / fallback / failed |
| History Persistence | 诊断历史是否保存 | pending / saved / failed / skipped |
| Surface Interaction | 当前 Surface 是否可提交 Command | actionable / claimed / consumed / disabled |
| Presentation Role | 当前还是历史展示 | current / historical |

`history-write-failed` 不属于 Turn 执行状态。
Presentation fallback 不得把已成功的业务 Operation 改写为业务失败。

## 4. Surface 与 Command

### 4.1 Surface

Surface 是 Runtime Domain 的权威交互对象。
A2UI 或 Markdown 是其展示 Payload，而不是生命周期本身。

Runtime Host 至少保存：

```text
surfaceId
threadId
turnId
presentationId
revision
presentationRole: current | historical
interactionState: actionable | claimed | consumed | disabled
claimedByOperationId?
presentationSnapshot
```

`current/historical` 与 `actionable/claimed/consumed/disabled` 不写入模型生成内容，也不依赖 A2UI 自身表达。

### 4.2 Command

浏览器只提出 Command，不提供权威内部运行上下文。
Action 请求逐步收敛为：

```text
commandId
surfaceId
actionId
expectedRevision
input
```

Runtime Host 根据 `surfaceId` 自己解析 threadId、turnId、Presentation、原 Operation 和 Business Agent 恢复上下文。
浏览器提交的 `runId` 不得作为权威来源。

### 4.3 Safe Command Admission

受控 Action 的接纳顺序：

```text
Command
  │
  ├─> 检查 commandId 幂等
  ├─> 校验 Surface = current + actionable
  ├─> 校验 actionId / input / approval / revision
  ├─> 获取并发容量
  ├─> CAS actionable -> claimed
  ├─> Runtime Repository 本地事务
  │     ├─ 创建 Operation
  │     ├─ 保存 Command Idempotency Record
  │     └─ claimed -> consumed
  └─> 事务提交后调用 Business Agent
```

`consumed` 表示 Runtime Host 已正式接受 Command，不表示 Business Agent 已成功完成。
Business Agent 后续失败或返回 `indeterminate` 时，旧 Surface 不自动重新变为 actionable。

平台追求：

```text
at-least-once transport
+ idempotent persistence
+ exactly-one command admission
```

平台不承诺整个分布式链路 Exactly Once。
真实业务副作用仍需要 Business Agent 或下游系统使用 `operationId`、`commandId` 或业务幂等键保护。

## 5. 子系统职责

### 5.1 Generative UI Workbench

- 是 Frontend Runtime 参考实现，只连接 Agent Runtime Host；
- 使用 AG-UI 参与 Agent 交互；
- 渲染 Markdown 或受控 A2UI；
- 提交 Command，而不是指定内部 Run；
- 展示 Thread、Turn、Operation、Surface 和诊断视图；
- 不拥有 Business Agent 私有工作流状态；
- 不拥有 Runtime Operation 或 Surface 的权威生命周期；
- 不生成 UI Plan 或 A2UI。

### 5.2 Agent Runtime Host

- 是平台前端统一入口和 CopilotKit Runtime 宿主应用；
- 是 Runtime 交互事实权威；
- 在进程内组装 Runtime Kernel、Business Agent Adapter 和 Presentation Pipeline；
- 保存 Runtime Repository；
- 通过统一 Runtime Event 向实时和诊断观察者投影；
- 提供 Runtime Snapshot、诊断查询和导出能力；
- 不保存或复制 Business Agent 私有 Checkpoint 内容。

### 5.3 PlatformRunService

- 是 Transport Adapter 调用的统一应用级门面；
- 将 Run、Action、Resume、Reconcile 请求交给 Runtime Kernel；
- 不自行维护与 Runtime Kernel 并列的状态机；
- 不按 HTTP、WebSocket 或 AG-UI 分裂为多套业务编排。

### 5.4 Runtime Kernel

- 管理 Thread / Turn / Operation / Command / Surface 的状态机；
- 定义 Runtime Repository 事务边界；
- 实施并发控制、CAS 和幂等；
- 调用 Business Agent Adapter；
- 将最终 AgentContent 送入 Presentation Pipeline；
- 在权威状态提交后生成 Runtime Event。

### 5.5 CopilotKit Runtime

- 嵌入 Agent Runtime Host，不是并列部署的第二个 Runtime；
- 提供 AG-UI 入口和标准运行时能力；
- 通过 Adapter 调用 PlatformRunService；
- 不拥有 Thread、Operation、Surface、Command 幂等或 Presentation 决策。

### 5.6 Business Agent Adapter

- 隔离 Runtime Host 与具体 Business Agent 协议；
- 校验公共事件契约；
- 映射 Agent 私有协议和平台公共事件；
- 传递 operationId / commandId 等可用幂等关联标识；
- 不总结、改写或重新解释业务内容；
- 不负责 Runtime Repository 或 Diagnostic Store 持久化。

### 5.7 Business Agent

- 负责业务推理、后端工具、业务状态、Checkpoint、恢复和业务副作用语义；
- 可以主动发布公开消息、活动、进度、状态、工具调用、Interrupt 和最终 AgentContent；
- 对公开内容和可见范围负责；
- 不输出 UI Plan Candidate、A2UI 或前端组件选择结果；
- 私有 State、Checkpoint、系统提示词和未公开内部事件不进入平台诊断。

### 5.8 Presentation Pipeline

- 只处理最终 AgentContent；
- Markdown AgentContent 直接形成 Markdown PresentationResult；
- Structured AgentContent 进入 Presentation Router；
- 仅 Generative UI 分支调用 Presentation Model 和 UI Compiler Core；
- Presentation 失败或 fallback 只影响 Presentation Outcome，不覆盖 Operation Outcome。

### 5.9 UI Compiler Core

- 校验 UI Plan Candidate 和 Component Catalog；
- 构建可信 UI IR；
- 编译 A2UI；
- 是唯一可信 A2UI 生产者；
- 保持框架、传输、Agent 框架和模型供应商中立。

## 6. Runtime Repository

Runtime Repository 保存可恢复的交互权威事实：

- Runtime Thread；
- Turn；
- Operation；
- Command Admission / Idempotency Record；
- Surface Lifecycle；
- 已验证 Presentation Snapshot；
- 恢复所需但不泄漏 Business Agent 私有状态的安全关联元数据。

Runtime Repository 必须支持同一 Runtime Host 数据库范围内的事务或等价原子更新能力。
Command Admission 不能依赖仅 best-effort 的 Diagnostic Store 完成。

Runtime Repository 与 Business Agent Checkpoint Store 使用共享 `threadId` 关联，但保持独立权威所有权。
当前不要求跨两个 Store 的分布式事务。
跨 Store 部分失败必须显式表达并具备恢复或 Reconcile 路径。

## 7. Runtime Event 与 Diagnostics

### 7.1 Runtime Event

`PlatformRuntimeEvent` 是 Runtime Truth 的投影，不是唯一事实数据库。
事件至少关联：

```text
eventId
sequence
threadId
turnId
operationId
agentRunId?
surfaceId?
actionId?
source / type / status
summary / metadata
artifactRef?
```

同一次业务或展示事实只产生一套平台事件表达，再投影到 AG-UI 和 Diagnostics。

### 7.2 Diagnostic Store

Diagnostic Recorder 保存观察和诊断数据：

- DiagnosticEvent；
- DiagnosticArtifact；
- 阶段、耗时、错误、公开 Tool Result 和 Artifact 引用。

Diagnostic Store 可以因为容量保护、暂时故障或异步持久化而不完整。
因此它不是 Thread / Operation / Surface 当前状态恢复的唯一来源。

### 7.3 恢复顺序

Workbench 重连或 Runtime Host 重启时：

1. 从 Runtime Repository 重建当前 Thread / Turn / Operation / Surface 真相；
2. Diagnostic Event 连续可用时，用 Event Replay 优化时间线；
3. Event 缺口时明确标记“诊断不完整”；
4. 不得因为 Diagnostic Event 缺失而改变 Runtime Truth。

`TurnDetailsResponse` 仍是查询聚合结果，不是第二份权威实体。

## 8. 协议与传输边界

### 8.1 Agent 交互

Workbench 与 Runtime Host 之间以 AG-UI 作为唯一 Agent 交互应用协议。
当前参考实现采用 CopilotKit Runtime 的 HTTP POST + SSE 路径。

HTTP、SSE 和 WebSocket 是传输机制：

- HTTP POST + SSE：当前参考实现；
- AG-UI over WebSocket：未来应用可以自定义；
- 业务设备实时 WebSocket：可以独立存在；
- 不得按传输方式复制 Runtime Kernel 或业务状态机。

### 8.2 普通查询接口

以下能力使用普通 REST，不构成第二套 Agent 交互协议：

- Catalog / Scenarios / Settings / Health；
- Thread / Turn / Operation / Surface Snapshot；
- TurnDetailsResponse；
- Diagnostic Artifact；
- Diagnostic Bundle Export。

### 8.3 Business Agent 协议

Business Agent 不要求原生实现 AG-UI。
Business Agent Adapter 可以适配 HTTP + SSE、WebSocket、进程内调用或其他私有协议，但这些协议不得暴露给 Workbench。

## 9. 数据披露边界

可以进入平台公开诊断的典型对象：

- Business Agent 主动公开的 Tool Call 和 Tool Result；
- AgentContent；
- Presentation Request 和 Presentation Decision；
- UI Plan Candidate；
- Validation Result；
- UI IR；
- A2UI；
- PresentationResult；
- Runtime Operation / Surface 的公开状态；
- Renderer 和 Action 结果；
- 阶段错误、耗时和关联信息。

永不进入浏览器或平台诊断历史：

- 密钥、Token、密码、Cookie、设备控制凭据；
- 环境变量、数据库连接信息；
- 系统提示词；
- Provider 原始请求和响应；
- Business Agent 私有 State 和 Checkpoint；
- 未主动公开的内部工具调用；
- 模块局部变量、运行时实例和内存转储。

## 10. 安全与可靠性原则

- 模型输出和 UI Plan Candidate 均不可信；
- 不执行模型生成代码；
- Component Registry 只暴露允许组件；
- Action Payload 视为不可信输入；
- 高风险 Action 必须由 Runtime Host 校验确认；
- Surface Action 必须经过 revision、状态、幂等和并发校验；
- 诊断持久化失败不得改变 Operation Outcome；
- Presentation fallback 不得改变已经确定的业务执行结果；
- 对可能已经产生副作用但结果未知的执行必须使用 `indeterminate`；
- 已 consumed Surface 不因下游失败自动重新激活。

## 11. 默认开发拓扑

```text
Workbench              5173
Agent Runtime Host     8200
Reference Agent        8300
```

CopilotKit Runtime、Runtime Kernel 和 Diagnostic Recorder 默认位于 Agent Runtime Host 进程内，不新增独立端口。

## 12. 当前范围与未来演进

当前优先级：

1. Runtime Truth Model 与 Runtime Contract；
2. Safe Command Admission；
3. Runtime Repository 与 Diagnostic Store 解耦；
4. Workbench 恢复逻辑迁移；
5. 之后再扩展协议和 Generative UI 能力。

以下仍属于未来范围，未获得独立决策前不得提前建设：

- Interaction Gateway；
- 多 Business Agent 自动路由；
- 多 Agent 协作；
- Runtime Kernel 独立服务或自动拆包；
- 独立 Diagnostic Service；
- PostgreSQL、MQ、分布式锁和多实例生产拓扑；
- A2UI v1 版本迁移；
- Markdown 自动增强为 Generative UI；
- 完整 Case Definition 和回归测试管理平台；
- 多租户诊断权限和审计。
