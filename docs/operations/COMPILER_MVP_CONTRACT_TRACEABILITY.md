# Compiler MVP 契约覆盖和需求追溯矩阵

> **Status: Historical.**
> The referenced Compiler and contract packages have been removed.
> 本文只保留 Compiler MVP 当时的证据路径，不描述当前测试位置或门禁。

## 目的和范围

本文为 Issue #29 建立 Compiler MVP 的契约测试、Requirements 验收和 Definition of Done 证据索引。

矩阵只记录当前仓库可离线验证的 Compiler MVP 证据。

HTTP 功能 E2E、安全和并发 E2E 已分别由 #33 和 #35 完成并进入当前测试套件。

Docker 最终发布门禁由 #36 完成，实际执行记录位于 `docs/operations/COMPILER_MVP_RELEASE_GATE.md`。

可靠性 E2E 已由 #34 完成，并记录在本文的 Issue #34 HTTP 可靠性 E2E 证据章节。

`ag-ui-adapter` 是可选协议工具包，不是 Compiler MVP 发布阻断项。

## 契约覆盖矩阵

| 公共契约 | 正例证据 | 反例证据 | 结论 |
| --- | --- | --- | --- |
| `PresentationRequest` | `packages/presentation-contract/test/index.test.ts` 的 `PresentationRequest` 合法 Markdown 或结构化内容测试 | 同文件的额外字段稳定错误测试 | 已覆盖 |
| `AgentContent` | 同文件的两个判别联合分支测试 | 同文件的非法分支形状测试 | 已覆盖 |
| `PresentationDecision` | 同文件的 Markdown 和 generative UI 分支测试 | 同文件的非法字段组合测试 | 已覆盖 |
| `PresentationResult` | 同文件的 completed、degraded 和 failed 结果测试 | 同文件的非法字段组合测试 | 已覆盖 |
| `UIPlan` | 同文件的 summary 和 form Plan 测试 | 同文件的最终 UI、可执行表示、非法引用和布局约束测试 | 已覆盖 |
| `ActionIntent` | `UIPlan` form fixture 中的 Action Intent 以及合法 form Plan 测试 | 同文件的非法 Action payload、目标区域和不透明实现 payload 测试 | 已覆盖 |
| `UICompileRequest` | `packages/compiler-contract/test/index.test.ts` 的结构化数据和规范 Markdown SourceData 测试 | 同文件的原始 Markdown、错误 fallback、空 Catalog 和调用方 Surface ID 测试 | 已覆盖 |
| `UICompileResult` | 同文件的三态结果合法性测试 | 同文件的互斥字段和非空输出约束测试 | 已覆盖 |
| `CompileError` | 同文件的稳定代码、阶段和安全诊断测试 | 同文件的任意错误代码拒绝测试 | 已覆盖 |
| UI IR | 同文件的连通组件图和 Action source binding 测试 | 同文件的重复组件、缺失引用和非法图结构测试 | 已覆盖 |
| A2UI 0.9.1 Profile | 同文件的合法 operation 和 operation sequence 测试 | 同文件的非法 operation、非法序列和版本判别字段测试 | 已覆盖 |
| Component Catalog | `packages/component-catalog-schema/test/index.test.ts` 的默认和联合 `type` Catalog 测试 | 同文件的非法 Catalog、Schema 方言、深度和节点限制测试 | 已覆盖 |

Issue #46 的联合 `type` 回归由 `packages/component-catalog-schema/test/index.test.ts` 的联合 `type` Catalog 正例覆盖。

Issue #47 的 Schema 深度和节点上限回归由同文件的嵌入 Schema 限制测试覆盖。

## Requirements 第 17 节证据

| 要求 | 自动化或人工证据 | 状态 |
| --- | --- | --- |
| 17.1 Input Validator、UI Plan Candidate Validator、Catalog Validator、Component Selector、UI IR Builder、A2UI Compiler、Schema Validator、Fallback Generator | `packages/ui-compiler-core/test/input-validation.test.ts`、`negative-compilation.test.ts`、`catalog-validation.test.ts`、`component-selection.test.ts`、`ui-ir-builder.test.ts`、`a2ui-compiler.test.ts` | 已映射 |
| 17.1 Markdown Sanitizer、Structured Data Validator、Structured Data Serializer | `apps/ui-compiler-service/test/markdown-sanitizer.test.ts`、`structured-data-validator.test.ts`、`structured-data-direct.test.ts` | 已映射 |
| 17.1 Presentation Router、Model Adapter、Catalog Repository、Error Mapper | `apps/ui-compiler-service/test/generative-ui-presentation.test.ts`、`markdown-direct.test.ts`、`http-server.test.ts` | 已映射 |
| 17.2 全部列举的契约 | 上述契约覆盖矩阵 | 已映射 |
| 17.3.1 Markdown 到 Sanitizer 再到 Result | `apps/ui-compiler-service/test/markdown-direct.test.ts` | 已映射 |
| 17.3.2 结构化数据到 Serializer 再到 Result | `apps/ui-compiler-service/test/structured-data-direct.test.ts` | 已映射 |
| 17.3.3 至 17.3.4 Markdown 或结构化数据经 Router、Plan、Core 到 A2UI | `apps/ui-compiler-service/test/generative-ui-presentation.test.ts` | 已映射 |
| 17.3.5 至 17.3.6 路由失败或非法 Plan 的安全 Markdown 降级 | `apps/ui-compiler-service/test/generative-ui-presentation.test.ts` | 已映射 |
| 17.3.7 HTTP 到 PresentationResult | `apps/ui-compiler-service/test/http-server.test.ts` | 已映射 |
| 17.3.8 至 17.3.9 Catalog、组件、Props、Action 和 nesting 降级 | `packages/ui-compiler-core/test/negative-compilation.test.ts`、`interaction-components.test.ts`、`apps/ui-compiler-service/test/security-concurrency-e2e.test.ts` | 已映射 |
| 17.3.10 模型超时、编译超时和请求取消 | `apps/ui-compiler-service/test/generative-ui-presentation.test.ts` | 已映射 |
| 17.3.11 至 17.3.12 合法和未声明领域组件 | `packages/ui-compiler-core/test/interaction-components.test.ts` | 已映射 |
| 17.3.13 结构化输入资源限制和零模型调用 | `apps/ui-compiler-service/test/structured-data-validator.test.ts`、`apps/ui-compiler-service/test/security-concurrency-e2e.test.ts` | 已映射 |
| 17.3.14 原始 Markdown 不进入下游边界 | `apps/ui-compiler-service/test/markdown-direct-boundaries.test.ts`、`apps/ui-compiler-service/test/security-concurrency-e2e.test.ts` | 已映射 |
| 17.3.15 并发请求隔离 | `packages/ui-compiler-core/test/request-isolation.test.ts`、`apps/ui-compiler-service/test/security-concurrency-e2e.test.ts` | 已映射 |
| 17.3.16 A2UI 使用 `version = "v0.9"` | `packages/compiler-contract/test/index.test.ts`、`packages/ui-compiler-core/test/a2ui-compiler.test.ts` | 已映射 |
| 17.4 基础和领域 Catalog、Plan、非法输入与资源限制 Fixture | `packages/ui-compiler-core/test/fixtures.ts`、`packages/presentation-contract/test/fixtures`、`packages/compiler-contract/test/fixtures`、`apps/ui-compiler-service/test/fixtures` | 已映射 |

## Requirements 第 18 节证据

| 验收项 | 证据位置 | 状态 |
| --- | --- | --- |
| 18.1 安装、构建、类型检查、测试、独立包和依赖边界 | `pnpm validate`、`tests/workspace`、`scripts/check-dependency-boundaries.mjs` | 本 Issue 运行 |
| 18.1 Service 独立构建和启动 | `apps/ui-compiler-service/test/runtime.test.ts`、`docs/operations/UI_COMPILER_SERVICE_RUNTIME.md` | 已映射 |
| 18.1 Docker 镜像 | `docs/operations/COMPILER_MVP_RELEASE_GATE.md` 的 `pnpm test:docker` 记录 | #36 已执行 |
| 18.2 Plan lowering、七场景、A2UI、非法 Catalog 或组件及降级 | `packages/ui-compiler-core/test/display-scenes.test.ts`、`interaction-components.test.ts`、`negative-compilation.test.ts` | 已映射 |
| 18.2 Core 依赖边界 | `tests/workspace/dependency-boundaries.test.ts`、`pnpm check:boundaries` | 已映射 |
| 18.3 Markdown、结构化数据、generative UI、HTTP、health 和 version | `apps/ui-compiler-service/test/markdown-direct.test.ts`、`structured-data-direct.test.ts`、`generative-ui-presentation.test.ts`、`http-server.test.ts`、`runtime.test.ts` | 已映射 |
| 18.3 HTTP 功能 E2E、安全和并发 | `apps/ui-compiler-service/test/generative-ui-presentation.test.ts`、`security-concurrency-e2e.test.ts` | #33 和 #35 已映射 |
| 18.3 Docker 发布门禁 | `docs/operations/COMPILER_MVP_RELEASE_GATE.md` | #36 已执行 |
| 18.3 HTTP 可靠性、取消、超时、重试和降级 | `apps/ui-compiler-service/test/generative-ui-presentation.test.ts` 的 `HTTP reliability E2E` | #34 已映射 |

## Issue #34 HTTP 可靠性 E2E 证据

`apps/ui-compiler-service/test/generative-ui-presentation.test.ts` 的 `HTTP reliability E2E` 套件通过真实 TCP HTTP Server 和客户端连接验证可靠性边界。

该套件验证超出 `maxRequestBytes` 的 HTTP 请求在进入展示生命周期前返回稳定的 `REQUEST_BODY_TOO_LARGE`。

该套件验证请求总超时返回稳定的 `REQUEST_TIMEOUT`，并在异步操作迟到完成后不发送第二个响应。

该套件验证 `MODEL_TIMEOUT` 和 `MODEL_RETRY_EXHAUSTED` 的稳定错误代码，并精确断言可重试 `MODEL_UNAVAILABLE` 的三次调用上限。

该套件验证 `COMPILE_TIMEOUT` 会在安全 Markdown 可用时返回 degraded 结果，而无可消费内容时返回 failed 结果。

该套件使用真实客户端断开验证请求级 AbortSignal 经 Presentation Router 传播到 Model Adapter 和编译操作。

该套件不把 AG-UI 事件或 Run 生命周期纳入 Compiler HTTP E2E 条件。

## Definition of Done 证据

| DoD | 证据位置 |
| --- | --- |
| 1 至 3 模块职责、依赖和共享类型 | `docs/ARCHITECTURE.md`、`docs/CONTRACTS.md`、`tests/workspace/dependency-boundaries.test.ts` |
| 4 输入输出 Schema 校验 | `packages/*-contract/test/index.test.ts`、`packages/component-catalog-schema/test/index.test.ts` |
| 5 稳定错误代码 | 三个必需契约包的 validation 测试和 Core 负向测试 |
| 6 requestId 日志 | `apps/ui-compiler-service/test/observability.test.ts`、`runtime.test.ts` 和 `security-concurrency-e2e.test.ts` 验证默认安全 JSON Line Sink、运行时接线、`requestId` 与敏感数据隔离 |
| 7 至 8 单元、契约和集成测试 | 本文矩阵与 `packages/ui-compiler-core/test`、`apps/ui-compiler-service/test` |
| 9 文档同步 | 本文、`docs/CONTRACTS.md` 和运行手册 |
| 10 范围外系统隔离 | `docs/ARCHITECTURE.md`、ADR-0003、ADR-0013、依赖边界测试 |
| 11 构建、类型检查和测试 | `pnpm validate` |
| 12 Catalog 不等于 Registry | `docs/CONTRACTS.md`、`docs/ARCHITECTURE.md` |
| 13 至 14 Service 和 Core 职责分离 | ADR-0015、依赖边界测试、Service 与 Core 测试 |
| 15 无跨请求完整结果缓存 | `packages/ui-compiler-core/test/request-isolation.test.ts` |

## 可选协议 Adapter 分栏

`packages/ag-ui-adapter/test/index.test.ts` 和 `packages/ag-ui-adapter/test/type-contracts.ts` 是 Adapter 的独立契约证据。

这些测试验证可选 AG-UI 事件构造、关联标识和结果映射。

它们不证明，也不阻塞 Compiler MVP 的 HTTP、Core、可靠性、安全、并发或 Docker 验收。

## 未覆盖项和剩余风险

当前自动化证据没有未解释的契约或 Requirements 第 17 节至第 18 节覆盖缺口。

Issue #36 的维护者人工复核与签署状态以 `docs/operations/COMPILER_MVP_RELEASE_GATE.md` 为准。
