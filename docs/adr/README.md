# 架构决策记录（ADR）

本目录保存仓库的架构决策以及它们形成时的上下文。

ADR 的生命周期状态与“是否仍适用于当前阶段”是两个不同维度。
一个 ADR 即使曾经 Accepted，也可能因为后续阶段决策而成为 Historical。

## 当前阶段

[ADR-0029](./0029-adopt-thin-copilotkit-runtime-and-activate-a2ui-next-phase.md) 是当前阶段决策。

它接受两项近期工作：

```text
#207 Thin CopilotKit Runtime 接入边界
  ↓
#200 真实 single-agent-chat-server 互操作
  ↓
A2UI Renderer / Catalog / Theme
```

薄 CopilotKit Runtime 只属于**支撑性基础设施**，不得借此恢复已经移除的 Runtime Platform。

ADR-0029 同时明确：在第一个 Controlled UI 纵向场景已经证明 AG-UI + Frontend Tool + MapLibre 可行后，A2UI 可以重新进入聚焦实现阶段。

[ADR-0028](./0028-use-native-ag-ui-and-retire-compatibility-contracts.md) 被 ADR-0029 部分取代，但在以下范围继续有效：

- 使用原生 AG-UI contract，而不是已删除的 compatibility contracts；
- Active / Frozen / Removed / Historical 状态词；
- 已删除的 Runtime / Compiler / Presentation 实现；
- Monorepo 依赖方向；
- 不执行模型生成的任意 HTML / JavaScript。

## 状态词

仓库继续使用 ADR-0028 引入的四种适用状态：

- **Active**：当前 Release Gate 或已接受实现目标的一部分；
- **Frozen**：保留但当前不扩建；
- **Removed**：实现已删除，未经新决策不得恢复；
- **Historical**：保留历史决策价值，但不描述当前实现事实。

ADR-0001 中以下约束继续有效：

- apps 可以依赖 packages；
- packages 不得依赖 apps。

## Frozen / Historical 设计输入

部分旧 ADR 仍解释 Workbench 中保留的设计资产，但它们不能自动成为当前 Release Gate：

- [ADR-0023](./0023-adopt-controlled-copilotkit-conversation-ui-and-platform-thread-history.md)：Conversation-first shell 与 Inspect 背景；
- [ADR-0024](./0024-adopt-runtime-truth-model-and-safe-command-admission.md)：未来可能重新考虑的 Runtime safety 研究；
- [ADR-0027](./0027-refocus-current-phase-on-presentation-first-generative-ui.md)：上一阶段 Presentation-first Scope Reset；
- [ADR-0028](./0028-use-native-ag-ui-and-retire-compatibility-contracts.md)：原生 AG-UI Scope Reset 与 compatibility contract 删除决策。

这些 ADR 不授权恢复已经删除的 Runtime、Presentation、Compiler 或 compatibility-contract 包。

## 历史 ADR 索引

以下 ADR 用于保存决策历史；它们本身不能直接定义当前 Release Gate 或仓库拓扑：

| ADR | 历史主题 |
|---|---|
| [0001](./0001-monorepo-and-boundaries.md) | Monorepo 与依赖边界 |
| [0002](./0002-ui-compile-result-states.md) | UI compile result 状态 |
| [0003](./0003-exclude-interaction-gateway-from-compiler-mvp.md) | Compiler MVP 排除 Interaction Gateway |
| [0004](./0004-domain-components-through-catalog.md) | 通过 Catalog 扩展领域组件 |
| [0005](./0005-route-markdown-before-ui-compilation.md) | UI 编译前的 Markdown 路由 |
| [0006](./0006-support-structured-agent-content.md) | 结构化 AgentContent |
| [0007](./0007-compile-data-and-catalog-injection.md) | Compile data 与 Catalog 注入 |
| [0008](./0008-a2ui-0.9.1-profile.md) | A2UI 0.9.1 Profile |
| [0009](./0009-markdown-fallback-and-surface-lifecycle.md) | Markdown fallback 与 Surface lifecycle |
| [0010](./0010-ag-ui-event-mapping.md) | 旧 Presentation result 的 AG-UI 事件映射 |
| [0011](./0011-cache-compiled-templates-only.md) | 编译模板缓存 |
| [0012](./0012-typebox-and-ajv-schema-validation.md) | TypeBox / Ajv Schema 校验 |
| [0013](./0013-move-ag-ui-run-lifecycle-outside-compiler-service.md) | 将 AG-UI Run lifecycle 移出 Compiler Service |
| [0014](./0014-markdown-sanitizer.md) | Markdown Sanitizer |
| [0015](./0015-presentation-router-and-model-adapter.md) | Presentation Router 与 Model Adapter |
| [0016](./0016-fastify-http-lifecycle.md) | Fastify HTTP lifecycle |
| [0017](./0017-http-observability-and-sensitive-data.md) | HTTP 可观测性与敏感数据 |
| [0018](./0018-expand-repository-scope-to-platform-validation-environment.md) | Runtime Platform 验证环境 |
| [0019](./0019-embed-presentation-pipeline-in-agent-runtime-host.md) | Runtime Host 中的 Presentation Pipeline |
| [0020](./0020-workbench-runtime-read-contract-and-copilotkit-headless.md) | Workbench Runtime read contract |
| [0021](./0021-retire-runnable-fixture-provider-mode.md) | Runnable fixture provider 退役 |
| [0022](./0022-support-http-sse-and-websocket-business-agent-adapters.md) | Business Agent transport |
| [0023](./0023-adopt-controlled-copilotkit-conversation-ui-and-platform-thread-history.md) | Controlled CopilotKit conversation UI 与 history |
| [0024](./0024-adopt-runtime-truth-model-and-safe-command-admission.md) | Runtime Truth 与 Command Admission |
| [0025](./0025-adopt-two-external-integration-modes-and-layered-platform-capabilities.md) | 两种外部集成模式与分层平台能力 |
| [0026](./0026-adopt-ag-ui-as-workbench-runtime-application-protocol.md) | AG-UI 作为旧 Workbench → Runtime Host 应用协议 |
| [0027](./0027-refocus-current-phase-on-presentation-first-generative-ui.md) | Presentation-first Scope Reset |
| [0028](./0028-use-native-ag-ui-and-retire-compatibility-contracts.md) | 原生 AG-UI Scope Reset 与 compatibility contract 删除 |

## 当前决策

| ADR | 当前主题 |
|---|---|
| [0029](./0029-adopt-thin-copilotkit-runtime-and-activate-a2ui-next-phase.md) | 薄 CopilotKit Runtime 接入边界与 A2UI 下一阶段 |

## 编号与状态规则

ADR 文件名采用 `NNNN-short-decision-title.md`。
编号唯一且不复用。
下一个 ADR 编号为 `0030`。

允许的生命周期状态包括：

- Proposed；
- Accepted；
- Rejected；
- Deprecated；
- Superseded by ADR-NNNN；
- Partially superseded by ADR-NNNN。

Active、Frozen、Removed、Historical 描述的是“当前适用性”，不是 ADR 生命周期状态。

当新 ADR 修改旧决策时：

1. 在新 ADR 中明确被取代的范围；
2. 更新旧 ADR 或本索引中的关系说明；
3. 更新当前需求、架构与 Agent 规则；
4. 保留旧 ADR 作为历史决策证据。

## 冲突规则

不得使用旧 ADR 静默覆盖 ADR-0029 或当前仓库指令。
如果未来工作需要重新激活超出 ADR-0029 范围的 Historical / Frozen 能力，必须先记录新的明确阶段决策。
