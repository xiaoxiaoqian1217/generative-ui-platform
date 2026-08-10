# 架构决策记录

该目录保存 Generative UI Platform 的架构决策记录。

ADR 记录已经接受、被取代或明确拒绝的重要架构决策，以及决策背景、约束和后果。
需求文档描述系统必须实现什么。
架构文档描述系统如何组织。
ADR 解释为什么选择某个长期方案。

## 适用范围

ADR 可以属于以下范围：

- 仓库级平台范围；
- Generative UI Compiler 子系统；
- Presentation Pipeline；
- Generative UI Workbench；
- Agent Runtime Host 与 Framework Integration；
- 跨子系统契约、安全、可靠性和可观测性。

Compiler MVP 形成时期的 ADR 继续约束 Compiler 子系统。
平台级 ADR 不得无意放宽 Compiler 已接受的输入信任、Catalog、Model Adapter、UI Plan Candidate 和 A2UI 编译边界。

## 当前产品主线

ADR-0027 将当前阶段重新收敛为 **Presentation-first Generative UI**。

当前 North Star 是：

> 将 Business Agent 或已有 Agent Runtime 产生的 Markdown / structured AgentContent，转换为美观、可靠、主题一致且受控的 Presentation。

当前 Active Product Track 是 ADR-0025 定义的 **Presentation Integration**。

核心链路为：

```text
AgentContent
    ↓
Presentation Router
    ├── Markdown → safe Markdown PresentationResult
    └── Structured Business Data
              ↓
      Presentation Model
              ↓
      untrusted UI Plan Candidate
              ↓
      UI Compiler Core
              ↓
      trusted A2UI PresentationResult
```

UI Compiler Core、Presentation Pipeline、Component Catalog、Theme / Presentation Context、受控 Renderer 和 Generative UI reliability evaluation 属于当前 Core。

Generative UI Workbench 当前定位为 **Generative UI Lab / 可视化开发调试工作台**。
CopilotKit、AG-UI、Reference Business Agent、Business Agent Adapter 和 Agent Runtime Host 属于 Supporting Integration。

## Deferred Runtime Platform

ADR-0024 和 ADR-0025 定义的 Agent Runtime Integration 设计继续保留。

以下能力当前统一视为 Deferred：

- Runtime Thread / Turn / Operation；
- Runtime Repository；
- Surface Lifecycle；
- Command Admission；
- Runtime-owned Conversation History；
- Recovery / Reconcile；
- Runtime Truth Diagnostics；
- 完整 Agent Runtime Platform。

这些设计不是错误，也不要求立即删除。
已有 Runtime 路径继续存在期间仍必须遵守 ADR-0024 的安全规则。
但它们不再是当前 Presentation-first MVP 的 Release Gate，也不得在没有新的明确范围确认时继续扩展。

## Framework 与协议定位

Generative UI Core 必须保持 Agent Framework 中立。

当前参考 Agent Runtime Integration 仍可使用：

```text
Workbench ↔ Runtime Host
Application protocol: AG-UI
Current transport: HTTP POST + SSE
```

ADR-0026 继续约束这条参考路径。
但 AG-UI 和 CopilotKit 不成为 Presentation Core 的强制外部协议或产品边界。

Presentation Pipeline 当前可以按照 ADR-0019 继续作为 Package 嵌入 Agent Runtime Host。
这一部署方式是当前参考组合方式，不意味着 Runtime Host 是 Generative UI Core 的长期唯一宿主。
Presentation Integration 的稳定公共 API 形态仍需要后续独立决策。

## 关键决策入口

| ADR | 状态 | 适用范围 | 说明 |
|---|---|---|---|
| [ADR-0001](./0001-monorepo-and-boundaries.md) | 已接受 | 仓库与 Compiler | Monorepo 和模块依赖方向 |
| [ADR-0003](./0003-exclude-interaction-gateway-from-compiler-mvp.md) | 部分被 ADR-0018 取代 | Compiler MVP 与 Gateway | Gateway 不属于当前阶段；原“仓库范围仅为 Compiler MVP”结论被扩展 |
| [ADR-0007](./0007-compile-data-and-catalog-injection.md) | 已接受 | Compiler | 编译数据所有权和 Catalog 注入 |
| [ADR-0008](./0008-a2ui-0.9.1-profile.md) | 已接受 | Compiler | 锁定当前 A2UI Profile |
| [ADR-0012](./0012-typebox-and-ajv-schema-validation.md) | 已接受 | 公共契约 | TypeBox 和 Ajv Schema 校验 |
| [ADR-0014](./0014-markdown-sanitizer.md) | 已接受 | Presentation Pipeline | Markdown 清理边界继续有效，运行宿主由 ADR-0019 调整 |
| [ADR-0015](./0015-presentation-router-and-model-adapter.md) | 已接受 | Presentation Pipeline | Presentation Router 和 Model Adapter 边界继续有效 |
| [ADR-0016](./0016-fastify-http-lifecycle.md) | 部分被 ADR-0019 取代 | HTTP 生命周期 | 独立 Compiler HTTP 所有权被取消；取消、超时和关闭语义迁移到参考 Runtime Host |
| [ADR-0017](./0017-http-observability-and-sensitive-data.md) | 部分被 ADR-0019 取代 | 可观测性 | 独立 Compiler HTTP 终局被取消；安全字段和敏感数据策略继续有效 |
| [ADR-0018](./0018-expand-repository-scope-to-platform-validation-environment.md) | 部分被 ADR-0019、ADR-0027 取代 | 仓库级平台 | 全链路 Runtime-first 当前阶段范围被 ADR-0027 收敛为 Presentation-first |
| [ADR-0019](./0019-embed-presentation-pipeline-in-agent-runtime-host.md) | 已接受 | 参考平台后端与 Compiler | Presentation Pipeline 当前作为 Package 嵌入 Runtime Host；不定义 Core 必须绑定 Runtime Host |
| [ADR-0020](./0020-workbench-runtime-read-contract-and-copilotkit-headless.md) | 部分被 ADR-0026 取代 | Workbench 与 Runtime Host | 现有 Runtime Integration 兼容规则；并列 HTTP/WebSocket Run 入口语义由 ADR-0026 取代 |
| [ADR-0021](./0021-retire-runnable-fixture-provider-mode.md) | 已接受 | 模型联调与测试 | 日常联调使用真实模型，测试使用进程内 Stub，退役可运行 Fixture Provider |
| [ADR-0022](./0022-support-http-sse-and-websocket-business-agent-adapters.md) | 已接受 | Runtime Host 与 Business Agent | Supporting Business Agent Adapter Transport；不定义 Presentation Core 协议 |
| [ADR-0023](./0023-adopt-controlled-copilotkit-conversation-ui-and-platform-thread-history.md) | 部分被 ADR-0024 取代 | Deferred Runtime Integration | Conversation UI 可作为参考集成保留，但不再是当前 MVP Release Gate |
| [ADR-0024](./0024-adopt-runtime-truth-model-and-safe-command-admission.md) | 已接受，当前阶段 Deferred | Agent Runtime Integration | Runtime Truth 与安全 Command Admission；继续约束已有路径，不驱动当前 Presentation MVP |
| [ADR-0025](./0025-adopt-two-external-integration-modes-and-layered-platform-capabilities.md) | 已接受，由 ADR-0027 细化当前优先级 | 平台接入 | Presentation Integration 当前 Active；Agent Runtime Integration 当前 Deferred |
| [ADR-0026](./0026-adopt-ag-ui-as-workbench-runtime-application-protocol.md) | 已接受 | Supporting Runtime Integration | AG-UI 约束当前 Workbench ↔ Runtime Host 参考路径，不约束 Presentation Core |
| [ADR-0027](./0027-refocus-current-phase-on-presentation-first-generative-ui.md) | 已接受 | 当前仓库阶段范围 | 回归 Presentation-first 主线，Workbench 定位为 Generative UI Lab，冻结 Runtime Platform 扩张 |

以上表格突出当前跨模块和平台范围决策。
完整 ADR 集合以本目录中的全部编号文件为准。

## 编号规则

- 文件名格式：`NNNN-short-decision-title.md`。
- ADR 编号在仓库中必须唯一，已经使用的编号不得复用。
- 创建 ADR 前必须扫描本目录中的全部编号文件，使用当前最大编号加一。
- 被拒绝、废弃或被取代的 ADR 仍然保留原文件和编号。
- 当前最新编号为 `0027`。

## 状态规则

允许使用：

- `提议中`：正在评审，尚未成为规范；
- `已接受`：当前有效决策；
- `已拒绝`：方案经过评估但不采用；
- `已废弃`：不再适用于当前系统；
- `部分被 ADR-NNNN 取代`；
- `已被 ADR-NNNN 取代`。

当一个仍然有效的 ADR 只是不再属于当前阶段 Active Scope 时，可以保留“已接受”，并通过后续 ADR 和索引明确标记为 Deferred。

新 ADR 改变旧决策时，必须同时：

1. 在新 ADR 中说明取代范围；
2. 更新旧 ADR 的状态或关系说明；
3. 更新本索引中的状态和说明；
4. 检查需求、架构、Goal 和编码 Agent 规则是否需要同步。

如果新 ADR 只是细化旧 ADR 且不否定其核心决策，可以保持旧 ADR 为“已接受”，但新 ADR 必须明确关系和新增约束。

## 架构冲突规则

任何新文档、Goal 或实现如果与当前有效 ADR 发生实质冲突，不得静默覆盖。
必须先标记冲突、说明影响并取得用户/架构决策者确认。
只有确认修改当前架构后，才创建或接受新的 ADR，并同步更新受影响的规范和实现计划。

## 何时需要 ADR

以下变化通常需要 ADR：

- 仓库或阶段范围变化；
- 跨子系统职责和依赖方向变化；
- 公共契约、协议或信任边界变化；
- A2UI Profile、Catalog、Model Adapter 或 Router 语义变化；
- 数据和状态权威所有者变化；
- 安全、取消、重试、降级、缓存或可观测性策略变化；
- 引入难以替换的平台框架或基础设施。

以下事项通常不需要 ADR：

- 普通缺陷修复；
- 不改变边界的内部重构；
- 开发端口和本地命令；
- 单个模型名称或供应商配置；
- 已有架构内的常规实现任务。

## 后续预计决策

以下决策应在对应实现开始前分别评审：

- Presentation Integration 的稳定公共 API 形态；
- Theme / Presentation Context 的公共契约；
- Generative UI reliability evaluation 的指标与测试模型；
- Business Agent Adapter SPI 的最小能力与版本策略；
- A2UI 版本 Encoder 和 v1 迁移策略；
- Frontend Runtime、Component Registry 和 A2UI Renderer 更细粒度的信任边界；
- Markdown 自动增强为 Generative UI；
- 恢复 Agent Runtime Integration 的明确业务触发条件；
- Interaction Gateway、多 Agent 路由与多实例部署。
