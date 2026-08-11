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

当前 North Star：

> 将 Business Agent 或已有 Agent Runtime 产生的 Final AgentContent，转换为可靠、主题一致且受控的 Presentation，并通过真实 Agent Conversation 验证这条链路。

当前 Active Product Track 是 ADR-0025 定义的 **Presentation Integration**。

当前参考端到端链路：

```text
Natural Language
→ Business Agent
→ Final AgentContent
→ Presentation Router
→ Presentation Decision
   ├── markdown
   └── generative-ui + UI Plan Candidate
→ UI Compiler Core
→ trusted A2UI / Markdown
→ Workbench Renderer
```

ADR-0015 继续约束 Router：Markdown 与 structured data 都可以进入 Router；只有需要语义分析时才调用 Presentation Model；content type 不等于 presentation mode。

Generative UI Workbench 当前定位为 **真实 Agent 驱动的 Generative UI Lab**。
AgentContent 是可观察中间边界，不是 Workbench 当前主要人工输入。

## Deferred Runtime Platform

ADR-0024 和 ADR-0025 定义的 Agent Runtime Integration 设计继续保留。

当前 Deferred：

- Runtime Thread / Turn / Operation；
- Runtime Repository；
- Surface Lifecycle；
- Command Admission；
- long-term Runtime-owned Conversation History；
- Conversation Management；
- Runtime restart recovery；
- Recovery / Reconcile；
- Runtime Truth Diagnostics；
- 完整 Agent Runtime Platform。

真实 Agent Conversation 本身不是 Deferred。

已有 Runtime 路径继续存在期间仍必须遵守 ADR-0024 的安全规则。
Scope Reset 改变优先级，不降低既有安全边界。

## Framework 与协议定位

Generative UI Core 必须保持 Agent Framework 中立。

当前 Supporting Reference Path 可以使用：

```text
Workbench ↔ Runtime Host
Application protocol: AG-UI
Current transport: HTTP POST + SSE
```

ADR-0026 继续约束这条 Reference Path。
AG-UI 和 CopilotKit 不成为 Presentation Core 的强制协议或产品边界。

Presentation Pipeline 当前可以按照 ADR-0019 作为 Package 嵌入 Reference Integration Host。
ADR-0027 已部分取代 ADR-0019 中“Runtime Host 是长期统一平台后端”的产品结论。

## 关键决策入口

ADR 的“生命周期状态”和“当前阶段优先级”是两个维度，不混写为一个状态字符串。

| ADR | 生命周期状态 | 当前阶段 | 适用范围 | 说明 |
|---|---|---|---|---|
| [ADR-0001](./0001-monorepo-and-boundaries.md) | 已接受 | Active | 仓库与 Compiler | Monorepo 和模块依赖方向 |
| [ADR-0003](./0003-exclude-interaction-gateway-from-compiler-mvp.md) | 部分被 ADR-0018 取代 | Historical / still constraining Gateway | Compiler MVP 与 Gateway | Gateway 不属于当前阶段 |
| [ADR-0007](./0007-compile-data-and-catalog-injection.md) | 已接受 | Active | Compiler | 编译数据所有权和 Catalog 注入 |
| [ADR-0008](./0008-a2ui-0.9.1-profile.md) | 已接受 | Active | Compiler | 当前 A2UI Profile |
| [ADR-0012](./0012-typebox-and-ajv-schema-validation.md) | 已接受 | Active | 公共契约 | TypeBox / Ajv Schema 校验 |
| [ADR-0014](./0014-markdown-sanitizer.md) | 已接受 | Active | Presentation Pipeline | Markdown 清理边界 |
| [ADR-0015](./0015-presentation-router-and-model-adapter.md) | 已接受 | Active | Presentation Pipeline | Router / Model Adapter；content type 不等于 presentation mode |
| [ADR-0016](./0016-fastify-http-lifecycle.md) | 部分被 ADR-0019 取代 | Supporting / Historical | HTTP 生命周期 | 独立 Compiler HTTP 所有权被取消 |
| [ADR-0017](./0017-http-observability-and-sensitive-data.md) | 部分被 ADR-0019 取代 | Active constraints | 可观测性 | 安全字段和敏感数据策略继续有效 |
| [ADR-0018](./0018-expand-repository-scope-to-platform-validation-environment.md) | 部分被 ADR-0019、ADR-0027 取代 | Historical | 仓库级平台 | Runtime-first 阶段范围被 ADR-0027 收敛 |
| [ADR-0019](./0019-embed-presentation-pipeline-in-agent-runtime-host.md) | 部分被 ADR-0027 取代 | Supporting | Reference Integration / Presentation | Package 嵌入方式继续有效；Runtime Host 不再定义 Core 长期宿主 |
| [ADR-0020](./0020-workbench-runtime-read-contract-and-copilotkit-headless.md) | 部分被 ADR-0026 取代 | Deferred / Compatibility | Workbench 与 Runtime Host | Existing Runtime Integration 兼容规则 |
| [ADR-0021](./0021-retire-runnable-fixture-provider-mode.md) | 已接受 | Active | 模型联调与测试 | 日常联调真实模型，测试使用进程内 Stub |
| [ADR-0022](./0022-support-http-sse-and-websocket-business-agent-adapters.md) | 已接受 | Supporting | Runtime Host 与 Business Agent | Business Agent Adapter Transport |
| [ADR-0023](./0023-adopt-controlled-copilotkit-conversation-ui-and-platform-thread-history.md) | 部分被 ADR-0024 取代 | Partly Supporting / mostly Deferred | Workbench / Runtime | 真实 Conversation 可保留；长期 History 产品化 Deferred |
| [ADR-0024](./0024-adopt-runtime-truth-model-and-safe-command-admission.md) | 已接受 | Deferred | Agent Runtime Integration | 继续约束已有 Runtime Path 安全语义 |
| [ADR-0025](./0025-adopt-two-external-integration-modes-and-layered-platform-capabilities.md) | 已接受 | Active + Deferred split | 平台接入 | Presentation Integration Active；Agent Runtime Integration Deferred |
| [ADR-0026](./0026-adopt-ag-ui-as-workbench-runtime-application-protocol.md) | 已接受 | Supporting | Reference Runtime Integration | AG-UI 约束当前 Workbench ↔ Runtime Host Reference Path |
| [ADR-0027](./0027-refocus-current-phase-on-presentation-first-generative-ui.md) | 已接受 | Active | 当前仓库阶段范围 | Presentation-first；真实 Agent Conversation + Generative UI Lab；冻结 Runtime Platform 扩张 |

完整 ADR 集合以本目录中的全部编号文件为准。

## 编号规则

- 文件名格式：`NNNN-short-decision-title.md`。
- ADR 编号在仓库中必须唯一，已经使用的编号不得复用。
- 创建 ADR 前必须扫描本目录中的全部编号文件，使用当前最大编号加一。
- 被拒绝、废弃或被取代的 ADR 仍然保留原文件和编号。
- 当前最新编号为 `0027`。

## 状态规则

生命周期状态允许使用：

- `提议中`；
- `已接受`；
- `已拒绝`；
- `已废弃`；
- `部分被 ADR-NNNN 取代`；
- `已被 ADR-NNNN 取代`。

`Active / Supporting / Deferred / Historical` 属于当前阶段优先级，不是 ADR 生命周期状态。

新 ADR 改变旧决策时必须同时：

1. 在新 ADR 中说明取代范围；
2. 更新旧 ADR 的状态或关系说明；
3. 更新本索引；
4. 检查 Requirements、Architecture、Goal 和 AGENTS 是否需要同步。

## 架构冲突规则

任何新文档、Goal 或实现如果与当前有效 ADR 发生实质冲突，不得静默覆盖。
必须先标记冲突、说明影响并取得用户 / 架构决策者确认。

## 何时需要 ADR

通常需要 ADR：

- 仓库或阶段范围变化；
- 跨子系统职责和依赖方向变化；
- 公共契约、协议或信任边界变化；
- A2UI Profile、Catalog、Model Adapter 或 Router 语义变化；
- 数据和状态权威所有者变化；
- 安全、取消、重试、降级、缓存或可观测性策略变化；
- 引入难以替换的平台框架或基础设施。

通常不需要 ADR：

- 普通缺陷修复；
- 不改变边界的内部重构；
- 开发端口和本地命令；
- 单个模型名称或供应商配置；
- 已有架构内的常规实现任务。

## 后续预计决策

以下决策应在对应实现开始前分别评审：

- Presentation Integration 的稳定公共 API 形态；
- Theme / Presentation Context 的公共契约；
- Reliability Validation 的指标与测试模型；
- Business Agent Adapter SPI 的最小能力与版本策略；
- A2UI 版本 Encoder 和 v1 迁移策略；
- Frontend Runtime、Component Registry 和 A2UI Renderer 更细粒度信任边界；
- Markdown 自动增强为 Generative UI；
- Presentation Contract / Pipeline 中 Runtime / Surface metadata 的解耦；
- 恢复 Agent Runtime Integration 的明确业务触发条件；
- Interaction Gateway、多 Agent 路由与多实例部署。
