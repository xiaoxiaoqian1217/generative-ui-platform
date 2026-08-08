# 架构决策记录

该目录保存 Generative UI Platform 的架构决策记录。

ADR 记录已经接受、被取代或明确拒绝的重要架构决策，以及决策背景、约束和后果。
需求文档描述系统必须实现什么；架构文档描述系统如何组织；ADR 解释为什么选择某个长期方案。

## 适用范围

ADR 可以属于以下范围：

- 仓库级平台范围；
- Generative UI Compiler 子系统；
- Agent Runtime Host；
- Frontend Runtime 和 A2UI Renderer；
- 跨子系统契约、安全、可靠性和可观测性。

Compiler MVP 形成时期的 ADR 继续约束 Compiler 子系统。
平台级 ADR 不得无意放宽 Compiler 已接受的输入信任、Catalog、Model Adapter、UI Plan Candidate 和 A2UI 编译边界。

## 当前平台后端决策

当前目标架构不再把 UI Compiler 作为独立部署服务。
Agent Runtime Host 是完整 Agent Runtime Integration 的平台后端入口和应用组合根。
原 UI Compiler Service 的展示应用能力迁移为独立 `presentation-pipeline` Package，并嵌入 Agent Runtime Host 运行。
UI Compiler Core、Presentation Router、Model Adapter、Catalog 和公共契约继续保持独立 Package 边界。

Agent Runtime Host 同时是完整 Runtime 接入时的交互事实权威。
Runtime Thread、Turn、Operation、Command Admission、Surface Lifecycle 和可信 Presentation Snapshot 由 Runtime Host 管理。
Business Agent 继续拥有业务 State、Checkpoint 和业务副作用语义。
Diagnostic Event 和 Artifact 是诊断投影，不是 Runtime 当前状态恢复的唯一权威来源。

平台对外采用两种主要接入模式：

- **Presentation Integration**：已有 Agent Runtime 的系统只使用 Markdown / Generative UI Presentation 能力；平台保证展示安全，Action Admission、幂等和恢复由调用方 Runtime 负责；
- **Agent Runtime Integration**：已有 Business Agent 接入 Runtime Host，由平台同时提供 Presentation Safety 和 ADR-0024 定义的 Interaction Safety。

UI Compiler Core、Presentation Pipeline、PlatformRunService 和 Runtime Kernel 是内部能力层次，不再作为 Level 1–4 四种产品接入等级。

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
| [ADR-0016](./0016-fastify-http-lifecycle.md) | 部分被 ADR-0019 取代 | HTTP 生命周期 | 独立 Compiler HTTP 所有权被取消；取消、超时和关闭语义迁移到 Runtime Host |
| [ADR-0017](./0017-http-observability-and-sensitive-data.md) | 部分被 ADR-0019 取代 | 可观测性 | 独立 Compiler HTTP 终局被取消；安全字段和敏感数据策略继续有效 |
| [ADR-0018](./0018-expand-repository-scope-to-platform-validation-environment.md) | 部分被 ADR-0019 取代 | 仓库级平台 | 仓库范围扩展为平台全链路验证环境；独立 Compiler 部署结论被调整 |
| [ADR-0019](./0019-embed-presentation-pipeline-in-agent-runtime-host.md) | 已接受 | 平台后端与 Compiler | 取消独立 UI Compiler Service 应用，将 Presentation Pipeline 嵌入 Runtime Host |
| [ADR-0020](./0020-workbench-runtime-read-contract-and-copilotkit-headless.md) | 已接受 | Workbench 与 Runtime Host | Workbench 通过 CopilotKit Headless 和只读 Runtime Contract 集成 |
| [ADR-0021](./0021-retire-runnable-fixture-provider-mode.md) | 已接受 | 模型联调与测试 | 日常联调使用真实模型，测试使用进程内 Stub，退役可运行 Fixture Provider |
| [ADR-0022](./0022-support-http-sse-and-websocket-business-agent-adapters.md) | 已接受 | Runtime Host 与 Business Agent | 当前支持 HTTP + SSE 与 WebSocket Adapter |
| [ADR-0023](./0023-adopt-controlled-copilotkit-conversation-ui-and-platform-thread-history.md) | 部分被 ADR-0024 取代 | Workbench、Runtime Host 与 Business Agent | 受控 CopilotKit 会话 UI 和历史所有权继续有效；Run-centric 交互事实语义由 ADR-0024 取代 |
| [ADR-0024](./0024-adopt-runtime-truth-model-and-safe-command-admission.md) | 已接受 | Runtime Host、Workbench、Runtime Contract | Thread/Turn/Operation/Surface/Command 事实模型、安全 Command Admission、Runtime Repository 与 Diagnostics 解耦 |
| [ADR-0025](./0025-adopt-two-external-integration-modes-and-layered-platform-capabilities.md) | 已接受 | 平台接入、Presentation、Runtime Host | 对外采用 Presentation Integration 与 Agent Runtime Integration；内部能力继续分层，并区分 Presentation Safety 与 Interaction Safety |

以上表格突出当前跨模块和平台范围决策。
完整 ADR 集合以本目录中的全部编号文件为准。

## 编号规则

- 文件名格式：`NNNN-short-decision-title.md`。
- ADR 编号在仓库中必须唯一，已经使用的编号不得复用。
- 创建 ADR 前必须扫描本目录中的全部编号文件，使用当前最大编号加一。
- 被拒绝、废弃或被取代的 ADR 仍然保留原文件和编号。
- 当前最新编号为 `0025`。

## 状态规则

允许使用：

- `提议中`：正在评审，尚未成为规范；
- `已接受`：当前有效决策；
- `已拒绝`：方案经过评估但不采用；
- `已废弃`：不再适用于当前系统；
- `部分被 ADR-NNNN 取代`；
- `已被 ADR-NNNN 取代`。

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

- Presentation Integration 的公共 API 形态，以及是否保持 Package / 应用内调用还是未来引入独立部署；
- Business Agent Adapter SPI 的最小能力与版本策略；
- Runtime Kernel 是否需要提取为独立 workspace package；
- A2UI 版本 Encoder 和 v1 迁移策略；
- Frontend Runtime、Component Registry 和 A2UI Renderer 更细粒度的信任边界；
- Markdown 自动增强为 Generative UI；
- Interaction Gateway、多 Agent 路由与多实例部署。
