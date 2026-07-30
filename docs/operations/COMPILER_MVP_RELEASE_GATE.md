# Compiler MVP 最终发布门禁记录

本文记录 Issue #36 的实际发布门禁执行结果。
本文只记录已经执行的命令和已观察到的结果。

## 执行环境

- 执行日期: 2026-07-30。
- 执行分支: `codex/issue-36`。
- 基线提交: `origin/main` 的 `0d3a6cb2d61b9dd14b2f87b79aa1b5f29d5d9b96`。
- 运行时: Node.js `24.16.0` 和 pnpm `10.13.1`。

## 已完成的自动化门禁

| 门禁 | 实际命令 | 结果 |
| --- | --- | --- |
| 干净安装 | `pnpm install --frozen-lockfile` | 通过。 |
| 代码质量、边界、类型、测试、构建和文档 | `pnpm validate` | 通过。 |
| Docker 镜像和容器外 HTTP smoke | `pnpm test:docker` | 通过。 |

`pnpm validate` 已验证 lint、依赖边界、7 个工作区包的类型检查、全量测试、构建和文档检查。

## 范围和依赖边界审查

`apps/agent-runtime-host` 已从 workspace 和锁文件移除。

`tests/workspace/workspace.test.ts` 现在会拒绝 `apps/agent-runtime-host`、`apps/interaction-gateway`、`packages/component-registry` 和 `packages/frontend-runtime` 路径。

`packages/ag-ui-adapter` 仍是独立的可选协议工具包。

UI Compiler Service 和容器运行路径不依赖该可选包。

发布产物不包含 Agent Runtime Host、Interaction Gateway、Frontend Runtime、Component Registry 或真实业务 Agent。

UI Compiler Service 只提供 HTTP `POST /api/ui-compiler/present`、`GET /health` 和 `GET /version`。

UI Compiler Service 不提供 AG-UI、SSE 或 WebSocket Endpoint，也不拥有 AG-UI Run 生命周期。

`pnpm validate` 覆盖 HTTP 功能、超时、取消、重试、降级、安全清理和并发隔离的离线测试套件。

默认 JSON Line observability Sink 会输出版本化安全字段，并在请求终局事件中包含已验证的 `requestId`。

该 Sink 使用类型化请求句柄记录请求开始、阶段完成和唯一终局事件。

阶段证据覆盖 HTTP 接收、输入校验、内容序列化、Catalog 解析、展示路由、模型分析、Plan 校验和 UI 编译。

`apps/ui-compiler-service/test/observability.test.ts`、`http-server.test.ts`、`runtime.test.ts`、`generative-ui-presentation.test.ts` 和 `security-concurrency-e2e.test.ts` 验证精确字段白名单、非负耗时、模型尝试计数、运行时接线、终局幂等、真实客户端断开、Sink 故障隔离、未验证 `requestId` 隔离和敏感数据哨兵不泄漏。

真实 Socket 回归覆盖正常 Keep-Alive 复用、模型和编译期间断开，以及延迟响应序列化期间断开。

请求总时限回归验证活动阶段会同时进入终局日志和固定安全 HTTP Error Payload。

两阶段终止会在 outcome 决定时冻结终局语义，只允许当前活动阶段完成一次，并拒绝迟到的阶段跃迁。

响应完成时使用实际 HTTP 状态和单调时钟总耗时写出冻结事件，写出前断开仍具有更高终局优先级。

## Stage 5 自动化和黑盒证据

`apps/ui-compiler-service/test/generative-ui-presentation.test.ts` 覆盖 Markdown、结构化数据、A2UI、降级、失败、超时、取消和重试流程。

该文件的 `HTTP reliability E2E` 使用真实 TCP HTTP Server 和客户端连接验证请求体限制、总超时、模型超时、重试耗尽、编译超时和客户端断开。

`apps/ui-compiler-service/test/security-concurrency-e2e.test.ts` 通过 HTTP Adapter 验证安全清理、资源限制、并发隔离、Fallback、Operations 和 Surface ID。

`packages/ui-compiler-core/test/request-isolation.test.ts` 验证相同 Plan 与不同 `sourceData` 的并发编译不会串用业务数据、Fallback 或 Surface ID。

`pnpm test:docker` 使用宿主机 HTTP 客户端访问运行中的容器，并验证 health、version 和 Markdown 展示请求。

镜像检查确认 `Config.User` 为 `node`，环境变量只包含基础镜像变量、`NODE_ENV`、Host 和 Port 配置。

镜像文件路径和最终 `package.json` 依赖不包含 Agent Runtime Host、Interaction Gateway、Frontend Runtime、Component Registry、CopilotKit、`.env` 或可选 `ag-ui-adapter`。

## Requirements 第 18 节和 Definition of Done

| 项目 | 证据 | 状态 |
| --- | --- | --- |
| 18.1 工程验收 | 干净安装和 `pnpm validate` | 通过。 |
| 18.2 Core 验收 | Core、契约和依赖边界测试 | 通过。 |
| 18.3 Service 验收 | Service HTTP、可靠性、安全和并发测试 | 通过。 |
| Docker 镜像和容器外 HTTP smoke | `pnpm test:docker` | 通过。 |
| Definition of Done 6 | 默认安全 JSON Line Sink 和 observability 测试 | 通过。 |
| Definition of Done 1 至 15 | 架构、契约、边界和测试证据 | 待维护者确认。 |

## Docker 恢复记录

首次 `pnpm test:docker` 因 Docker Desktop Linux Engine 的 `_ping` 请求返回 HTTP 500 而失败。

Docker Desktop 当时处于异常的 `stopping` 状态。

使用 Docker Desktop 官方强制停止和启动流程恢复 Engine 后，再次执行 `pnpm test:docker` 已通过。

成功执行已验证 Docker 镜像构建、`GET /health`、`GET /version`、Markdown `POST /api/ui-compiler/present` 和容器用户 `node`。

## 剩余风险和阻塞项

Docker 构建仍报告依赖内部使用弃用 `url.parse()` 的 Node.js `DEP0169` 警告。

pnpm deploy 仍报告共享 workspace 使用 legacy deploy 实现的警告。

当前镜像还包含 UI Compiler Service 的 `src`、`test` 和 `.turbo` 文件，但不包含范围外系统、`.env` 或可选协议 Adapter。

后续镜像最小化任务应只保留运行所需的 `dist`、生产依赖和 manifest，并重新执行完整容器门禁。

Issue #36 要求维护者逐项签署 Requirements 第 18 节和 Definition of Done。

该人工签署尚未完成，不能由自动化或本记录替代。

## 维护者签署清单

- [ ] 已核对干净安装、完整验证和 Docker 命令输出。
- [ ] 已使用 HTTP 黑盒客户端验证 Markdown、结构化数据、A2UI、降级、失败、超时和取消流程。
- [ ] 已验证相同 Plan 的并发请求不串用业务数据、Fallback、Operations 或 Surface ID。
- [ ] 已审查发布产物和依赖边界不存在范围外系统。
- [ ] 已审查日志、错误 Payload、测试快照和镜像不包含秘密或原始敏感内容。
- [ ] 已确认 Requirements 第 18 节和 Definition of Done。
