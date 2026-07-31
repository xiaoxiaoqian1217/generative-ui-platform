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

## 关键决策入口

| ADR | 状态 | 适用范围 | 说明 |
|---|---|---|---|
| [ADR-0001](./0001-monorepo-and-boundaries.md) | 已接受 | 仓库与 Compiler | Monorepo 和模块依赖方向 |
| [ADR-0003](./0003-exclude-interaction-gateway-from-compiler-mvp.md) | 部分被 ADR-0018 取代 | Compiler MVP 与 Gateway | Gateway 不属于当前阶段；原“仓库范围仅为 Compiler MVP”结论被扩展 |
| [ADR-0007](./0007-compile-data-and-catalog-injection.md) | 已接受 | Compiler | 编译数据所有权和 Catalog 注入 |
| [ADR-0008](./0008-a2ui-0.9.1-profile.md) | 已接受 | Compiler | 锁定当前 A2UI Profile |
| [ADR-0012](./0012-typebox-and-ajv-schema-validation.md) | 已接受 | 公共契约 | TypeBox 和 Ajv Schema 校验 |
| [ADR-0014](./0014-markdown-sanitizer.md) | 已接受 | UI Compiler Service | Markdown 清理边界 |
| [ADR-0015](./0015-presentation-router-and-model-adapter.md) | 已接受 | UI Compiler Service | Presentation Router 和 Model Adapter 边界 |
| [ADR-0016](./0016-fastify-http-lifecycle.md) | 已接受 | UI Compiler Service | HTTP 生命周期与取消语义 |
| [ADR-0017](./0017-http-observability-and-sensitive-data.md) | 已接受 | UI Compiler Service | HTTP 可观测性和敏感数据策略 |
| [ADR-0018](./0018-expand-repository-scope-to-platform-validation-environment.md) | 已接受 | 仓库级平台 | 将仓库范围扩展为平台全链路开发验证环境 |

以上表格突出当前跨模块和平台范围决策。
完整 ADR 集合以本目录中的全部编号文件为准。

## 编号规则

- 文件名格式：`NNNN-short-decision-title.md`。
- ADR 编号在仓库中必须唯一，已经使用的编号不得复用。
- 创建 ADR 前必须扫描本目录中的全部编号文件，使用当前最大编号加一。
- 被拒绝、废弃或被取代的 ADR 仍然保留原文件和编号。
- 当前最新编号为 `0018`。

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

以下决策应在对应实现开始前分别评审，而不是提前合并进 ADR-0018：

- Runtime Host 与 Business Agent Adapter 的稳定边界；
- Frontend Runtime、Component Registry 和 A2UI Renderer 的信任边界；
- Action、安全审批和跨服务状态所有权。
