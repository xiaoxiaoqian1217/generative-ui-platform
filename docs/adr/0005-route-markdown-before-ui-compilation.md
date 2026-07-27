# ADR-0005: Route Markdown before UI compilation

- **Status:** Accepted
- **Date:** 2026-07-24

## Input scope update

ADR-0006 supersedes the Markdown-only input assumption in this ADR.
The presentation routing, Model Adapter, Core, validation, and fallback decisions remain accepted for both Markdown and JSON structured data.

## Context

真实业务 Agent 只保证返回 Markdown。
它们不会稳定提供 `presentationMode`、`presentationIntent`、结构化业务数据或 UI Plan。

原架构让所有 Markdown 进入 UI Compiler Core，并要求 Core 解析内容、推断展示意图和决定组件结构。
现有实现甚至把所有 Markdown 直接包装为 A2UI `Markdown` 组件。
这种包装统一了传输形式，但没有产生实际的生成式 UI 价值。

是否生成 UI 是展示策略决策。
如何把已经选定但仍不可信的 UI Plan Candidate 编译为受控 A2UI 是编译决策。
两个决策具有不同输入、失败策略和可信边界，不应由同一模块承担。

## Decision

UI Compiler Service 必须在调用 UI Compiler Core 之前执行展示路由。
业务 Agent 只需要提供 Markdown。
调用方可以额外提供原始用户消息和展示上下文，但不得要求业务 Agent 提供展示模式或 UI Plan。

Presentation Router 返回一个经过 Schema 校验的判别联合：

```ts
type PresentationDecision =
  | {
      mode: "markdown";
      reason: string;
    }
  | {
      mode: "generative-ui";
      reason: string;
      plan: UIPlan;
    };
```

`mode = "markdown"` 时，Service 必须对 Markdown 执行安全清理，并直接返回 Markdown 展示结果。
该路径不得调用 UI Compiler Core。

`mode = "generative-ui"` 时，Service 必须先校验模型输出和 UI Plan Candidate 的 Schema，再把编译请求交给 UI Compiler Core。
Schema 校验不会使 Candidate 成为可信或权威输入。
Core 必须根据 Component Catalog 对组件、Props、Actions、结构和数据执行权威校验，然后生成 UI IR 和 A2UI。

Presentation Router 可以使用确定性规则。
需要语义判断时，Router 必须通过可替换 Model Adapter 调用模型。
一次模型调用应该同时完成展示模式判断和 UI Plan Candidate 生成，不得默认使用两次独立模型调用。

具体 Model Adapter 由 UI Compiler Service 创建和注入。
UI Compiler Core 不得依赖模型 SDK、模型供应商、网络协议或 Service。

模型输出始终是不可信输入。
模型不得生成可执行代码，不得绕过 Catalog，也不得直接成为未经验证的 A2UI。

模型调用、路由或 UI Plan Candidate 校验失败时，默认降级为经过安全清理的原始 Markdown。
有效业务内容不得因为生成式 UI 失败而丢失。

公共服务契约必须区分：

- `PresentationRequest`，包含 Agent Markdown 和可选上下文。
- `PresentationDecision`，表示内部展示路由结果。
- `UICompileRequest`，包含已经选择且 Schema 合法但仍不可信的 UI Plan Candidate。
- `PresentationResult`，以判别联合区分 Markdown、generative UI、降级和失败结果。

`AgentPresentationResult` 不再作为业务 Agent 必须构造的外部输入契约。

模块名称统一使用 UI Compiler Service。
现有 `apps/ui-compiler-agent` 是待迁移的实现路径，不代表该模块是 Agent。

## Consequences

- 普通 Markdown 不再经过无价值的 A2UI `Markdown` 组件包装。
- UI Compiler Core 的接口变窄，只处理已经选择生成式 UI 的编译请求。
- Presentation Router 和 Model Adapter 成为 Service 应用层的明确模块。
- 模型提供商可以替换，而不修改 UI Compiler Core。
- 前端必须能够根据 `PresentationResult` 在 Markdown Renderer 和 A2UI Renderer 之间分派。
- 调用方提供原始用户消息时，路由可以结合用户意图判断展示方式。
- 只有 Markdown 时仍然允许路由，但系统必须接受判断置信度下降。
- 现有 `presentation-contract`、`compiler-contract`、Service 路由和 Core 输入需要通过后续实现变更迁移。
- 迁移完成前，README 必须明确当前实现与目标架构的差距。

## Supersession

本 ADR 取代 ADR-0001 中将 UI Compiler Agent 定义为纯网络适配器的部分。
ADR-0001 的 Monorepo、独立部署和框架无关 Core 决策继续有效。
本 ADR 不改变 ADR-0003 对 Interaction Gateway 的排除，也不改变 ADR-0004 的 Component Catalog 扩展模型。
