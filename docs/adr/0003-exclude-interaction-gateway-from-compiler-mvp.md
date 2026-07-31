# ADR-0003: 将 Interaction Gateway 排除在 Compiler MVP 之外

- **状态：** 部分被 ADR-0018 取代
- **日期：** 2026-07-24

ADR-0018 取代了“仓库当前交付范围只包含 UI Compiler Core 和 UI Compiler Service”的阶段性结论。
本 ADR 关于 Interaction Gateway 不属于当前阶段、不得默认恢复旧脚手架，以及未来启动 Gateway 必须先完成业务触发条件、范围变更 Issue 和新 ADR 的决策继续有效。

## 背景

早期仓库脚手架和 ADR-0001 将 Interaction Gateway 纳入了 MVP。
后续需求将当前产品收敛为 Generative UI Compiler MVP，并把 Interaction Gateway 定义为满足明确触发条件后才启动的未来平台能力。
继续把 Gateway 视为 MVP 的一部分，会混淆当前交付范围、依赖边界和验收标准。

## 决策

Interaction Gateway 不属于 Generative UI Compiler MVP，不纳入当前阶段的创建、实现或验收范围。
在本 ADR 接受时，Compiler MVP 的产品边界仅包含 UI Compiler Core 和 UI Compiler Service。
ADR-0018 后续将仓库级范围扩展为平台全链路开发验证环境，但没有将 Interaction Gateway 或多 Agent 动态路由纳入当前阶段。
未来只有在需求定义的多 Agent 连接、路由或交互闭环条件出现后，才重新启动 Interaction Gateway 的设计。
现有 `apps/interaction-gateway` 和仅为其服务的 `packages/gateway-contract` 必须从活跃 workspace 移除。
Git 历史负责保留旧脚手架，不在当前源码树中维护休眠实现。
当前 MVP 的公共契约不得保留 Gateway 专属类型或枚举值。
未来 Gateway 启动时，通过届时的契约版本引入所需类型。
需求文档可以保留未来 Gateway 的触发条件，架构文档可以保留其概念架构。
这些内容属于非规范性 roadmap，不得成为当前阶段的设计、契约、测试或验收依据。
未来启动 Gateway 必须先满足业务触发条件，再通过显式的范围变更 Issue 和新 ADR。
触发条件只允许启动设计，不自动授权恢复或实现旧脚手架。
新 ADR 必须重新确认职责、依赖方向、契约归属、部署和协议边界，以及对产品范围和验收标准的影响。

本 ADR 取代 ADR-0001 中将 Gateway 纳入 MVP 的表述。
ADR-0001 的 Monorepo 和其余模块边界决策继续有效。

## 后果

- 当前设计和交付计划不得依赖 Interaction Gateway。
- 仓库中的现有 Gateway app、专属 contract package 和相关活跃配置需要通过独立实现 ticket 清理。
- UI Compiler Service 必须能够独立对外提供当前 MVP 的展示和编译能力。
- 平台全链路开发验证环境可以包含 Runtime Host、Reference Business Agent、Workbench 和 Renderer，但不能将这些能力误称为 Interaction Gateway。
- 未来重新启动 Gateway 时，必须基于届时需求重新设计，不能默认恢复旧脚手架。
- 清理 ticket 必须移除 `sourceType: "interaction-gateway"` 等 Gateway 专属契约。
- 清理 ticket 必须同步移除 Gateway 的容器、构建、发布、依赖维护、标签和 Issue 入口配置。
- 当前架构视图必须将未来 Gateway 与当前规范性架构明确分开。
- 未完成新的范围变更 Issue 和 ADR 前，不得重新创建 Gateway app 或专属 contract package。
