<!-- cspell:ignore fastify keepalive slowloris -->

# ADR-0016: 使用 Fastify 5.10 固化 Service HTTP 请求生命周期

- **状态：** 已接受
- **日期：** 2026-07-29

## 背景

UI Compiler Service 必须作为可独立部署的 Node.js 应用，通过 HTTP 接收 `PresentationRequest` 并返回 `PresentationResult`。
Requirements 已经把 `POST /api/ui-compiler/present` 定义为 Compiler MVP 的规范网络入口。
HTTP Adapter 必须在反序列化前限制请求字节数，并负责 JSON 解析、请求校验、总超时、取消、错误状态码转换、健康检查和优雅关闭。

Service 只拥有当前 HTTP 请求的临时生命周期。
Service 不拥有 Business Agent Run 或 AG-UI Run，不执行 Agent 路由，也不提供 AG-UI、SSE 或 WebSocket Endpoint。
Copilot Runtime、Interaction Gateway、真实业务 Agent 和 Frontend Runtime 都不是 Service 独立启动的前置条件。

ADR-0012 已经把项目自有运行时 Schema 和稳定校验错误锁定为 TypeBox 加 Ajv。
ADR-0013 已经把 AG-UI Run 生命周期移出 UI Compiler Service。
ADR-0014 要求所有 Markdown 在进入 Router、Model Adapter、Core、缓存、日志或公共输出前完成清理。
ADR-0015 要求 HTTP 请求中止和 Service 请求级取消通过同一个 `AbortSignal` 向 Router 和 Model Adapter 传播。

如果只选择路由 API 而不同时固定请求字节边界、超时语义、断开处理、关闭顺序和测试方式，后续实现仍会产生不可替换的隐式框架行为。
本 ADR 因此同时锁定 Node HTTP 框架和 HTTP 请求生命周期。

本 ADR 不实现 Service，不选择或集成 AG-UI SDK，不实现 SSE 或 AG-UI Endpoint，也不决定日志供应商。

## 决策驱动因素

- 长期维护状态、治理和安全发布机制清晰。
- 支持仓库当前 Node.js 24、TypeScript strict mode 和 ESM。
- 请求体字节限制在 JSON 反序列化前执行，并同时覆盖 `Content-Length` 和分块传输。
- 能区分 HTTP 接收超时和应用总超时。
- 客户端断开可以转化为请求级 `AbortSignal`。
- 同一个请求级 Signal 可以传播到 Router、Model Adapter、Core Adapter 和其他异步依赖。
- 框架错误可以按稳定代码映射，不依赖自然语言错误文本。
- 优雅关闭可以停止接收新请求、排空活动请求并在截止时间后强制终止。
- 配置在监听端口前完成集中校验。
- 可以同时执行进程内 HTTP 测试和真实 Socket 端到端测试。
- HTTP 框架类型和生命周期 API 不得泄漏到应用用例、公共契约或 UI Compiler Core。

## 候选方案

### 候选 A: 直接使用 Node.js `node:http`

`node:http` 提供最低层的请求流、Socket、接收超时和连接关闭控制。
该方案没有第三方框架依赖，并能精确实现当前协议。

该方案要求项目长期维护路由、媒体类型处理、JSON Body Reader、流式字节计数、错误分派、请求上下文、注入测试和关闭编排。
这些工作是 HTTP 基础设施，不是 Generative UI Compiler 的领域能力。
一旦各功能分散到自有 Utility，替换和安全审查成本会持续增长。

该方案不采用。

### 候选 B: Express 5

Express 5 是 OpenJS Foundation 项目，并且 5.x 处于官方支持期。
`express.json` 可以限制 Body，并且 `app.listen` 返回标准 Node.js `http.Server`。
Express 的中间件生态和使用经验广泛。

Express 5 没有统一拥有应用总超时、请求级 `AbortSignal`、客户端断开传播、进程内注入测试和框架级排空生命周期。
实现仍需自行组合 Body Parser 错误、原始请求事件、计时器、`http.Server.close`、连接跟踪和测试 Helper。
这些自有组合正是本决策希望收敛的长期维护面。

该方案不采用。

### 候选 C: Fastify 5.10

Fastify 是 OpenJS Foundation At-Large 项目，具有公开的 LTS 和安全发布策略。
Fastify 5 支持 Node.js 20 及以上版本，满足仓库 Node.js 24 基线。
Fastify 5.10 提供内置 TypeScript 声明、请求体字节限制、接收超时、稳定框架错误代码、`inject` 测试和明确的关闭生命周期。

Fastify 仍然要求应用明确区分框架 JSON 解析与项目契约校验。
Fastify 的默认 Ajv 行为不能代替 ADR-0012 的契约 Validator。
Fastify 5.10 的 `handlerTimeout` 和 `request.signal` 存在一个尚未发布修复的 POST Request Body 生命周期缺陷。
Request Body 正常读取完成时，Node.js `IncomingMessage` 会发出 `close`，而 Fastify 5.10 会错误地把该事件识别为客户端断开并提前中止 `request.signal`，同时清除 Handler Timeout Timer。
因此本 ADR 不把 `handlerTimeout`、`request.signal` 或 `onRequestAbort` 作为正确性来源。
本 ADR 要求 HTTP Adapter 自有一个隔离的生命周期桥接层，并通过真实 Socket 回归测试锁定行为。

该方案采用。

## 候选比较

| 维度 | `node:http` | Express 5 | Fastify 5.10 |
|---|---|---|---|
| 治理和维护 | Node.js 核心维护 | OpenJS Foundation，5.x 支持中 | OpenJS Foundation，公开 LTS 和安全策略 |
| Node.js 24、ESM 和 TypeScript | 满足，类型和抽象需自建 | 满足，TypeScript 类型单独维护 | 满足，内置 TypeScript 声明 |
| 反序列化前字节限制 | 需要自建流式 Reader | `express.json` 支持 Limit | `bodyLimit` 和 Content Type Parser 原生支持 |
| HTTP 接收超时 | Node Server 原生支持 | 通过返回的 Node Server 配置 | Server Option 原生映射到 Node Server |
| 应用总超时 | 需要自建 | 需要自建中间件和 Signal | Adapter Deadline Controller 和 Handler Guard |
| 客户端断开 | 需要监听原始事件 | 需要监听原始事件 | Adapter Lifecycle Bridge 隔离原始事件 |
| 稳定错误映射 | 全部自建 | Body Parser 和应用错误分散 | 框架错误具有稳定 `code` |
| 优雅关闭 | 全部自建 | 主要依赖 Node Server 自建 | `close`、`preClose`、`onClose` 和连接排空 |
| 进程内 HTTP 测试 | 需要测试 Helper | 通常增加第三方测试工具 | 内置 `inject` |
| 自有基础设施维护面 | 最大 | 中等 | 最小且边界明确 |

## 维护快照

本决策的维护快照日期是 2026-07-29。

- 仓库运行时基线是 Node.js 24 或更高版本。
- Fastify 当前 npm `latest` 是 5.10.0，并提供内置 TypeScript 声明。
- Fastify 5 的官方支持矩阵覆盖 Node.js 20 及以上版本。
- Fastify PR #6725 正在修复 `handlerTimeout` 和 `request.signal` 对 POST Request Body 正常 `close` 事件的错误处理，但截至快照日期尚未合并和发布。
- Express 5.x 处于官方支持期，但其请求取消和关闭生命周期仍主要依赖应用自行组合 Node.js API。
- Node.js 24 提供稳定的 `AbortSignal.timeout`、`AbortSignal.any`、`server.close` 和 `server.closeAllConnections`。

首次实现必须使用精确版本 `fastify@5.10.0`。
Package Manifest 和 Lockfile 必须锁定实际验证版本，不得使用浮动 Tag。
使用 Fastify 5.10.0 时必须启用本 ADR 定义的 Adapter Lifecycle Bridge，并禁用 Route `handlerTimeout`。
后续补丁或次版本升级必须按本 ADR 的升级门禁执行。

## 决策

UI Compiler Service 的 Node HTTP 框架采用 Fastify 5.10。
MVP 使用 Fastify 默认的 Node.js HTTP/1.1 Server。
Fastify 只能存在于 `apps/ui-compiler-service` 的 HTTP Adapter、进程入口和对应测试中。
公共契约、应用用例、Presentation Router、Model Adapter 接口和 UI Compiler Core 不得导入 Fastify 类型。

Service 的 HTTP Adapter 必须把应用能力作为依赖注入。
实现应保持以下等价的内部边界。

```ts
interface PresentUseCase {
  execute(
    request: PresentationRequest,
    options: {
      signal: AbortSignal;
    },
  ): Promise<PresentationResult>;
}

interface HttpServer {
  start(): Promise<void>;
  close(): Promise<void>;
}
```

`PresentUseCase` 不得接收 `FastifyRequest`、`FastifyReply`、Node.js `IncomingMessage` 或 Socket。
HTTP Header、Status Code、Framework Error 和连接状态只能在 HTTP Adapter 内转换。

## 规范网络入口

Compiler MVP 的规范网络入口是：

```text
POST /api/ui-compiler/present
```

该 Endpoint 只接受 HTTP JSON `PresentationRequest`，并返回经过运行时校验的 `PresentationResult`。
一个已经通过边界校验的请求产生 completed、degraded 或 failed `PresentationResult` 时，HTTP Status 使用 200。
failed 表示没有可消费展示内容的应用结果，不表示 HTTP Adapter 可以泄露内部异常。

Service 同时保留 Requirements 已要求的 `GET /health` 和 `GET /version`。
`POST /api/ui-compiler/compile` 不作为当前规范公网 Endpoint 实现。
内部或 SDK 级编译入口不得承担展示模式路由。

Service 不提供 AG-UI、SSE、WebSocket 或 Business Agent Endpoint。
Agent Runtime Host 可以在 Service 外部把 `PresentationResult` 映射为 AG-UI、SSE、WebSocket 或其他协议。

## HTTP Adapter 生命周期

`POST /api/ui-compiler/present` 必须按以下顺序处理。

1. Fastify 接收请求并生成不可由调用方覆盖的 Transport Request ID。
2. `onRequest` 阶段拒绝不支持的媒体类型、字符集和 Content Encoding，并启动请求总时限。
3. Fastify 在 JSON 反序列化前执行请求字节限制和 HTTP 接收超时。
4. Fastify 只把完整且符合 JSON 语法的 Body 解析为 `unknown`。
5. HTTP Adapter 调用 `presentation-contract` 的 `validatePresentationRequest`。
6. Service 根据 ADR-0014 和 ADR-0015 准备安全内容、Catalog Snapshot 和 Router 输入。
7. HTTP Adapter 把组合后的非可选请求级 `AbortSignal` 传给 `PresentUseCase`。
8. Service 返回 `PresentationResult` 前调用 `validatePresentationResult`。
9. HTTP Adapter 通过集中 Error Mapper 选择安全 Body 和 HTTP Status。
10. `onResponse` 或 `onError` 只记录元数据，不记录原始 Body、Markdown、结构化数据或内部 Stack。

HTTP Adapter 不得绕过公共 Validator，也不得让 Fastify 的默认 Ajv 成为 `PresentationRequest` 或 `PresentationResult` 的事实来源。
Fastify Route Schema 可以描述不含业务契约的简单 Transport 元数据，但不得复制或修改共享契约 Schema。

## 请求字节和反序列化边界

`maxRequestBytes` 的 MVP 默认值是 1,048,576 bytes。
允许的部署配置范围是 1,024 到 8,388,608 bytes。
部署需要超过 8 MiB 时必须先完成独立资源评估和 ADR 修订。

`POST /api/ui-compiler/present` 必须显式设置 Route `bodyLimit = maxRequestBytes`。
实现可以根据合法 `Content-Length` 提前拒绝明显超限请求，但不得只信任该 Header。
分块传输和缺少 `Content-Length` 的请求必须由 Fastify Body Reader 在读取过程中累计字节并执行同一限制。
超限 Body 不得进入 JSON Parser、Contract Validator、Markdown Sanitizer、Router、Model Adapter 或 Core。

请求只接受 `Content-Type: application/json` 和可选的 UTF-8 Charset。
缺少或不支持的媒体类型使用 415。
除缺省和 `identity` 外的 `Content-Encoding` 全部使用 415 拒绝。
MVP 不接受 gzip、deflate 或 Brotli 请求 Body，避免压缩炸弹和 Wire Bytes 与解压 Bytes 的限制歧义。

Fastify 的 Prototype Poisoning 和 Constructor Poisoning 策略必须显式设置为 `error`。
HTTP Adapter 不得保存原始 Body 副本，也不得把原始 Body 加入错误、重试状态或日志。
任何 `preParsing` Hook 都不得替换或解压 Body Stream。
未来如果必须支持压缩 Body，必须先修订本 ADR，并分别定义压缩字节、解压字节和放大倍率限制。

`maxRequestBytes` 是完整 HTTP JSON Body 的上限。
Markdown Sanitizer 的 `maxInputBytes` 和 Structured Data 的资源限制必须小于或等于该外层限制，并继续独立执行。

## 超时模型

HTTP 生命周期使用三类不同的超时。
三类超时不得共用含义相同但起点不同的计时器。

| 配置 | 默认值 | 语义 |
|---|---:|---|
| `httpHeadersTimeoutMs` | 5,000 | 接收完整 HTTP Header 的目标上限 |
| `httpRequestBodyTimeoutMs` | 10,000 | 接收完整 HTTP Request 的目标上限 |
| `httpConnectionsCheckingIntervalMs` | 1,000 | Node.js 检查 Header 和 Request Timeout 的最大间隔 |
| `requestDeadlineMs` | 30,000 | 从 `onRequest` 开始到 `PresentationResult` 序列化完成的应用总墙钟时限 |

`httpHeadersTimeoutMs` 映射到 Node.js `server.headersTimeout`。
`httpRequestBodyTimeoutMs` 映射到 Fastify `requestTimeout` 和 Node.js `server.requestTimeout`。
`httpConnectionsCheckingIntervalMs` 必须通过 `fastify({ http: { connectionsCheckingInterval } })` 传给 Node.js `http.createServer`。
实现不得读取或写入不存在的 `server.connectionsCheckingInterval` 运行时属性。
Node.js 按该检查间隔发现已经到期的不完整请求，因此实际 408 最迟允许在对应目标上限加 `httpConnectionsCheckingIntervalMs` 内发生。
这三个 Transport 配置共同保护慢速 Header 和慢速 Body，并可能在应用 Handler 运行前由 Node.js 直接返回 408 后关闭连接。

`requestDeadlineMs` 是整个展示请求的外层总时限。
该时限包括 Body 读取、JSON 解析、契约校验、Markdown 清理、结构化数据校验和序列化、Catalog 加载、路由、模型尝试和 Backoff、Core 编译、结果校验及响应序列化。
任何内部阶段不得通过创建新的局部计时器重置该外层 Deadline。

HTTP Adapter 必须记录 `onRequest` 的单调时钟起点，并创建应用总时限 Controller。
应用总时限到期后，Controller 必须以项目自有的稳定 Reason 中止。
Route Handler 必须以起点计算剩余预算，并使用项目自有 Handler Guard 将硬停止点固定为 `requestDeadlineMs + 1,000`。
额外的 1,000 ms 是固定的超时收敛宽限期，不是业务处理预算。
应用总时限到期时，请求级 Signal 先被中止，使 Service 有机会停止下游工作并在存在安全内容时返回 degraded Markdown。
Service 未能在宽限期内结束时，Handler Guard 丢弃迟到结果并通过集中 Error Mapper 返回 504。
Fastify 5.10 的 Route `handlerTimeout` 必须保持为零，避免上游 POST 生命周期缺陷提前中止 Signal 或取消 Timer。

Model Adapter 的 `modelTimeoutMs` 和 Core 的 `compileTimeoutMs` 继续是内部阶段上限。
两者必须与请求级 Signal 组合，并且不得超过剩余 `requestDeadlineMs`。
模型或编译阶段自己的 Deadline 先到期时，分别保留 `MODEL_TIMEOUT` 或 `COMPILE_TIMEOUT`。
外层总时限先到期时使用 `REQUEST_TIMEOUT`。

应用总时限是协作式取消。
所有异步依赖必须接收请求级 Signal，或者在无法取消时保证迟到结果被丢弃。
任何超时后到达的候选结果、Catalog、编译结果或序列化结果都不得写入响应或缓存。

## AbortSignal 和客户端断开

HTTP Adapter 必须在 `onRequest` 创建仅属于当前请求的 `AbortController` 和 Deadline Controller。
HTTP Adapter 必须把生命周期桥接实现集中在一个模块中，不得把 Node.js Socket 事件传播到应用用例。
Request Body 读取期间，桥接层监听 `request.raw` 的 `close` 事件，并且只在 `request.raw.complete` 为 `false` 时把事件分类为客户端断开。
Request Body 正常读取完成后的响应阶段，桥接层监听 `reply.raw` 的 `close` 事件，并且只在 `reply.raw.writableFinished` 为 `false` 时把事件分类为客户端断开。
正常完成、正常 Keep-Alive、Payload 被完整消费和响应成功结束都不得中止请求 Signal。
桥接层必须在请求完成时清除 Timer 和事件 Listener，避免跨请求保留状态。
应用总时限通过项目自有 Deadline Controller 在 `requestDeadlineMs` 到期时中止。
传给 `PresentUseCase` 的 Signal 使用 `AbortSignal.any` 组合以下来源。

- Adapter Lifecycle Bridge 的客户端断开 Signal。
- 应用总时限 Signal。
- 优雅关闭达到强制终止阶段时的 Shutdown Signal。

Signal 必须在进入业务用例前创建一次，并在请求全生命周期复用。
Router、Model Adapter、Catalog Repository 的可取消操作和 Core Adapter 必须接收同一个组合 Signal。
内部阶段可以增加更短的局部 Signal，但必须继续与请求级 Signal 组合。

客户端在请求完成前断开时，Signal 原因归一化为 `REQUEST_CANCELLED`。
同一请求不得重试，不得继续调用后续阶段，也不得返回迟到结果。
如果 Socket 已经关闭，Service 只记录元数据，不尝试写入错误 Body。
Fastify 5.10 的 `request.signal` 和 `onRequestAbort` 只用于诊断性断言，不得驱动取消传播或业务错误映射。

当客户端断开、请求总时限和阶段时限竞争时，映射顺序如下。

1. 已经发生的客户端断开映射为 `REQUEST_CANCELLED`。
2. 已经发生的 Service Shutdown 强制中止映射为 `SERVICE_SHUTTING_DOWN`。
3. 外层总时限映射为 `REQUEST_TIMEOUT`。
4. 否则保留最先发生的模型或编译阶段稳定超时代码。

## 错误响应和状态码

所有框架和 Node.js 错误必须经过 HTTP Adapter 的集中 Error Mapper。
Mapper 只能根据稳定的 Framework Error `code`、项目错误类型和已验证的请求状态分类。
Mapper 不得根据自然语言 `message`、Stack、供应商正文或 Parser 文本分类。

`POST /api/ui-compiler/present` 的 Transport 和边界错误映射如下。

| 条件 | HTTP Status | 稳定错误代码 |
|---|---:|---|
| JSON Body 为空、语法错误或 Content Length 不一致 | 400 | `PRESENTATION_REQUEST_INVALID` |
| `PresentationRequest` Schema 或资源校验失败 | 400 | `PRESENTATION_REQUEST_INVALID` |
| HTTP Request 接收超时 | 408 | `REQUEST_RECEIVE_TIMEOUT` |
| 请求 Body 超过 `maxRequestBytes` | 413 | `REQUEST_BODY_TOO_LARGE` |
| 不支持的 Media Type 或 Charset | 415 | `UNSUPPORTED_MEDIA_TYPE` |
| 不支持的 Content Encoding | 415 | `UNSUPPORTED_CONTENT_ENCODING` |
| 外层总时限或 Handler 硬超时 | 504 | `REQUEST_TIMEOUT` |
| Service 正在关闭且无法接收新请求 | 503 | `SERVICE_SHUTTING_DOWN` |
| 未分类的 HTTP Adapter 内部错误 | 500 | `INTERNAL_ERROR` |

Fastify Error 至少按以下稳定代码映射。

- `FST_ERR_CTP_BODY_TOO_LARGE` 映射为 `REQUEST_BODY_TOO_LARGE`。
- `FST_ERR_CTP_INVALID_MEDIA_TYPE` 映射为 `UNSUPPORTED_MEDIA_TYPE`。
- `FST_ERR_CTP_INVALID_CONTENT_LENGTH` 映射为 `PRESENTATION_REQUEST_INVALID`。
- `FST_ERR_CTP_EMPTY_JSON_BODY` 和 `FST_ERR_CTP_INVALID_JSON_BODY` 映射为 `PRESENTATION_REQUEST_INVALID`。
- `FST_ERR_HANDLER_TIMEOUT` 映射为 `REQUEST_TIMEOUT`。

Transport 错误响应使用 `PresentationResult` 的 failed 形状。
请求已通过契约校验时，响应 `requestId` 使用 `PresentationRequest.requestId`。
请求尚未产生合法 `requestId` 时，响应使用 Server 生成的 Transport Request ID，并在 `x-request-id` Header 中返回同一值。
错误的 `stage` 必须根据当前安全可知阶段映射为 `input-validation`、`content-serialization`、`presentation-routing`、`model-analysis`、`ui-plan-validation` 或 `ui-compilation`。

错误 `message` 必须来自项目固定模板。
公共 `details` 只能包含经过允许列表筛选的安全路径、限制名称和数值，不得包含 Body、Markdown、结构化业务数据、Catalog 内容、供应商对象或 Stack。
如果 Node.js 在进入 Fastify Handler 前已经发送 408，或者客户端已经关闭 Socket，Service 不保证还能返回 JSON Error Envelope。

只要合法源内容已经产生安全 Markdown，Router、Model Adapter、UI Plan Candidate 或 Core 失败仍应优先返回 HTTP 200 的 degraded `PresentationResult`。
HTTP Adapter 不得把可安全降级的应用错误提升为 5xx。

## 配置和启动校验

Service 配置必须在构造 Fastify Instance 和监听端口前一次性加载并校验。
配置 Schema 使用 TypeBox 定义，类型从 Schema 推导，并通过遵守 ADR-0012 选项的私有 Ajv Adapter 校验。
不得使用 Fastify 默认 Ajv 校验环境变量。
不得在 Route Handler 中直接读取 `process.env`。

MVP HTTP 配置如下。

| 配置 | 默认值 | 合法范围或约束 |
|---|---:|---|
| `host` | `0.0.0.0` | 非空 Host 字符串 |
| `port` | 3,000 | 1 到 65,535 的整数 |
| `maxRequestBytes` | 1,048,576 | 1,024 到 8,388,608 的整数 |
| `httpHeadersTimeoutMs` | 5,000 | 1,000 到 60,000 的整数 |
| `httpRequestBodyTimeoutMs` | 10,000 | 1,000 到 120,000 的整数 |
| `httpConnectionsCheckingIntervalMs` | 1,000 | 100 到 1,000 的整数 |
| `requestDeadlineMs` | 30,000 | 1,000 到 120,000 的整数 |
| `shutdownGraceMs` | 30,000 | 1,000 到 120,000 的整数 |
| `trustProxy` | `false` | 只能由受控部署配置显式启用 |

`httpHeadersTimeoutMs` 必须小于或等于 `httpRequestBodyTimeoutMs`。
`httpRequestBodyTimeoutMs` 必须小于或等于 `requestDeadlineMs`。
`httpConnectionsCheckingIntervalMs` 必须小于或等于 `httpHeadersTimeoutMs`。
`modelTimeoutMs` 和 `compileTimeoutMs` 必须小于 `requestDeadlineMs`。
所有数值必须是有限整数，禁止隐式单位转换、负数、零、`NaN` 和 `Infinity`。

配置失败时进程必须在监听任何端口前以非零状态结束。
错误输出只包含配置键、稳定错误代码和安全原因，不输出 Secret 值。
本 ADR 不选择 Secret Store、日志供应商或链路追踪供应商。

Fastify 的内置 Logger Integration 必须保持关闭，直到独立可观测性决策选择日志供应商。
HTTP Adapter 只能调用项目自有的供应商无关 Observability Interface。
该限制不阻止记录 `requestId`、阶段、耗时、取消原因、状态码和稳定错误代码等安全元数据。

## 优雅关闭

进程入口负责注册 `SIGTERM` 和 `SIGINT`。
Signal Handler 必须是幂等的，并且不得直接调用 `process.exit` 跳过异步清理。

关闭顺序如下。

1. 原子地把 Service 标记为 closing，并拒绝重复执行关闭流程。
2. 调用 `fastify.close()`，停止接收新连接。
3. 使用 `forceCloseConnections: "idle"` 关闭 Idle Keep-Alive 连接，同时允许活动请求继续。
4. 等待活动请求和 `preClose` 清理，最长等待 `shutdownGraceMs`。
5. 宽限期结束后中止所有活动请求的 Shutdown Signal。
6. 等待一个固定的 1,000 ms 取消收敛期。
7. 仍未结束时调用 `fastify.server.closeAllConnections()` 强制关闭活动 HTTP/1.1 连接。
8. 活动请求结束后执行 `onClose`，关闭 Catalog Repository、Model Adapter Client 和其他进程资源。
9. `fastify.close()` 成功后设置退出状态 0，关闭失败或被强制终止时设置非零退出状态。

MVP 不注册 WebSocket 或 HTTP Upgrade Handler。
未来加入 Upgrade Connection 时必须先定义独立跟踪和关闭策略，因为 Node.js `closeAllConnections` 不关闭升级后的连接。

`GET /health` 在正常运行时返回健康状态。
Fastify Instance 必须设置 `return503OnClosing: false`，禁止框架在 Route 之前写入默认 503 Body。
HTTP Adapter 必须在最早的 `onRequest` Hook 读取项目自有的 closing 状态。
关闭开始后到达的请求必须由该 Gate 设置 `Connection: close`，并通过集中 Error Mapper 返回 HTTP 503 和 `SERVICE_SHUTTING_DOWN` 的 failed `PresentationResult`。
已经通过 Gate 的活动请求继续执行，直到完成或被关闭 Deadline 中止。
如果后续部署需要独立 Readiness Probe，必须在 Service 实现 Issue 中增加明确契约和测试，不得把 Business Agent、Copilot Runtime 或 Frontend 状态加入健康判定。

## 可测试性策略

HTTP Server 必须通过工厂函数构造，并把 `listen` 与 Route Registration 分离。
单元和集成测试不得依赖全局端口或真实模型供应商。

### 配置测试

- 覆盖每个默认值、最小值、最大值和越界值。
- 覆盖 Header、Body 和总时限的关系约束。
- 覆盖 Connection 检查间隔的范围及其与 Header Timeout 的关系约束。
- 覆盖配置失败发生在监听端口前。
- 覆盖 `trustProxy` 默认关闭。

### Fastify `inject` 测试

- 覆盖规范 `POST /api/ui-compiler/present` 的 completed、degraded 和 failed 结果。
- 覆盖空 Body、非法 JSON、非法 `PresentationRequest`、不支持媒体类型和不支持 Content Encoding。
- 覆盖刚好等于字节上限和超过一个 Byte 的请求。
- 覆盖 Fastify Error 到稳定项目代码的映射。
- 覆盖响应 `PresentationResult` 再校验和安全错误模板。
- 覆盖 `/health`、`/version`、404 和不允许的方法。

### 真实 Socket 端到端测试

- 使用随机可用端口验证分块 Body 在反序列化前被 413 拒绝。
- 使用慢速 Header 和慢速 Body 验证接收超时。
- 断言慢速 Header 和慢速 Body 的 408 不晚于对应目标上限加 Connection 检查间隔和固定测试调度容差。
- 在 Router、Model Adapter 和 Core Fake 运行期间断开客户端，验证同一个 Signal 被中止且后续调用次数为零。
- 验证断开后迟到 Promise 不会写响应或进入缓存。
- 验证应用总时限优先触发安全 Markdown 降级。
- 验证超过 Handler 宽限期时返回 504 或关闭连接，并停止下游工作。
- 使用 Keep-Alive 连接验证关闭开始后不接收新业务请求。
- 断言关闭期新请求通过集中 Error Mapper 返回 `SERVICE_SHUTTING_DOWN`，而不是 Fastify 默认 503 Body。
- 验证关闭会排空快速活动请求，并在 `shutdownGraceMs` 后中止和强制关闭挂起请求。

### 应用边界测试

- 使用 Fake Clock 和可观察 `AbortSignal` 测试 Deadline 和 Handler Guard，不依赖真实等待。
- 断言完整 POST Body 的正常 `close` 不会中止请求 Signal，也不会清除项目自有 Deadline Timer。
- 断言 Body 未完整接收时的 `request.raw.close` 和响应未完成时的 `reply.raw.close` 都会中止请求 Signal。
- 断言 `PresentUseCase` 不接收 Fastify 或 Node.js HTTP 类型。
- 断言 Router、Model Adapter 和 Core Adapter 收到同一个请求级 Signal。
- 断言原始 Body、原始 Markdown、结构化业务数据和内部 Stack 不进入日志。
- 断言 AG-UI、SSE、Copilot Runtime、Interaction Gateway、真实业务 Agent 和 Frontend Runtime 的调用次数始终为零。

`fastify.inject` 不模拟所有 Socket 行为。
客户端断开、慢速传输、Keep-Alive 和强制关闭必须使用真实 Node.js HTTP Client 或原始 Socket 测试，不能只用注入测试替代。

## 框架升级和替换边界

Fastify 的导入和类型必须集中在 HTTP Adapter。
应用用例只依赖 `PresentationRequest`、`PresentationResult`、`AbortSignal` 和项目自有接口。
这条边界使框架替换不要求修改 Presentation Contract、Router、Model Adapter 或 Core。

Fastify 补丁或次版本升级必须执行：

- 官方 Release Note 和 Security Advisory 审查。
- Body Limit、Content Type Parser、错误代码、Lifecycle Bridge、Handler Guard 和 Shutdown 生命周期回归测试。
- 完整 `pnpm validate`。
- 真实 Socket 取消和关闭测试。

Fastify LTS Policy 允许安全修复在极少数情况下通过次版本引入破坏性变化。
因此升级必须是显式依赖任务，不能依赖浮动安装自动进入生产。
Fastify PR #6725 或等价修复发布后，也不得直接删除 Lifecycle Bridge。
只有新版本通过完整 POST、分块 POST、正常 Keep-Alive、Body 阶段断开、Handler 阶段断开和总时限的真实 Socket 回归测试，后续 ADR 才能决定是否改用 Fastify 的 `request.signal` 或 `handlerTimeout`。

升级到 Fastify 6、改变 Node HTTP Major、启用 HTTP/2、允许压缩 Request Body 或改变本 ADR 的稳定错误语义，都需要新的 ADR 或明确修订本 ADR。

替换 Fastify 时，候选实现必须先通过同一组黑盒兼容测试。
兼容测试至少固定以下行为。

- Route、Method、Content Type 和 JSON 语义。
- 反序列化前字节限制。
- Header、Body 和总时限。
- 客户端断开到请求级 Signal 的传播。
- 稳定错误代码和 HTTP Status。
- completed、degraded 和 failed `PresentationResult`。
- 优雅关闭和强制截止。
- 配置拒绝和独立启动。

如果替换只改变 HTTP Adapter 且保持这些行为，不构成公共 Contract 变更。
如果替换改变 `PresentationRequest`、`PresentationResult`、稳定错误代码或规范 Endpoint，则必须按公共契约规则提供 ADR、测试和版本迁移。

## 安全和可观测性边界

`trustProxy` 默认关闭。
只有部署明确给出可信代理拓扑和允许范围时才能启用。
Host、Forwarded Header、Client IP 和 Request ID Header 都是不可信 Transport 元数据，不能直接用于授权。

错误响应不得返回 Fastify 默认 Error Body、内部 Stack 或原始 Error Message。
HTTP Adapter 不得记录请求 Body、Sanitized Markdown、结构化业务数据、Catalog 内容或模型供应商响应。
日志允许记录 Transport Request ID、已验证的应用 Request ID、Catalog ID 和 Version、阶段、耗时、状态码、取消原因和稳定错误代码。
日志还必须按 Requirements 16.5 记录是否包含用户上下文、最终展示模式、模型是否调用、模型是否重试、是否降级、降级原因和编译器版本。
这些字段只能记录安全的枚举、布尔值、版本和标识符，不得包含原始或敏感 Payload。

本 ADR 不选择日志供应商。
Fastify 自带的 Logger 选项、Pino Plugin 或其他日志 Plugin 不得因为框架选择而自动成为项目决策。

## 范围外

- 不实现 UI Compiler Service HTTP Server。
- 不增加 Fastify 或其他运行依赖。
- 不实现 Presentation Router、Model Adapter、Core 编排或 Catalog Repository。
- 不选择或集成 AG-UI SDK。
- 不实现 AG-UI、SSE、WebSocket 或 Streaming Endpoint。
- 不管理 Business Agent Run 或 AG-UI Run。
- 不实现 Copilot Runtime、Interaction Gateway、真实业务 Agent 或 Frontend Runtime。
- 不决定日志、指标或链路追踪供应商。
- 不改变 `PresentationRequest` 或 `PresentationResult` 公共契约。

## 后果

- 阶段四 HTTP 实现具有明确的框架、版本和请求生命周期。
- `POST /api/ui-compiler/present` 保持 Compiler MVP 的唯一规范展示网络入口。
- Body Limit 在 JSON 反序列化前执行，并且压缩输入不会绕过字节语义。
- 客户端断开、应用总时限、模型超时、编译超时和关闭中止具有可区分的稳定语义。
- Adapter Lifecycle Bridge 隔离 Fastify 5.10 的 POST Signal 缺陷，使应用用例只接收稳定的项目自有 `AbortSignal`。
- 应用总时限仍要求所有下游异步依赖协作式遵守 Signal。
- Fastify 的默认 Ajv 不成为公共契约 Validator，避免与 ADR-0012 产生第二套校验语义。
- 优雅关闭先排空请求，再在固定 Deadline 后强制中止。
- 框架选择不会引入 AG-UI、SSE、Copilot Runtime、Interaction Gateway、真实业务 Agent 或 Frontend Runtime。
- Service HTTP 实现需要维护一组真实 Socket 测试，注入测试不能替代断开和关闭验证。

## 取代关系

本 ADR 固化 Requirements 第 23 节中待确认的 Node HTTP 框架。
本 ADR 细化 Requirements 的 SERVICE-001 至 SERVICE-010、可靠性、安全性、资源限制和测试要求。
本 ADR 不改变 ADR-0012 的 Schema 所有权和 Validator 约束。
本 ADR 不改变 ADR-0013 对 Business Agent Run 和 AG-UI Run 生命周期的外部归属。
本 ADR 不改变 ADR-0014 的 Markdown 信任边界。
本 ADR 不改变 ADR-0015 的 Router、Model Adapter、总模型时限和取消语义。

## 参考资料

- [Fastify 5.10 Server Reference](https://fastify.dev/docs/latest/Reference/Server/)
- [Fastify Request Reference](https://fastify.dev/docs/latest/Reference/Request/)
- [Fastify PR #6725: 修复 POST request.signal 的提前中止](https://github.com/fastify/fastify/pull/6725)
- [Fastify Lifecycle Reference](https://fastify.dev/docs/latest/Reference/Lifecycle/)
- [Fastify Content Type Parser Reference](https://fastify.dev/docs/latest/Reference/ContentTypeParser/)
- [Fastify Error Reference](https://fastify.dev/docs/latest/Reference/Errors/)
- [Fastify Testing Guide](https://fastify.dev/docs/latest/Guides/Testing/)
- [Fastify LTS Policy](https://fastify.dev/docs/latest/Reference/LTS/)
- [Express Version Support](https://expressjs.com/en/support/)
- [Node.js 24 HTTP API](https://nodejs.org/download/release/latest-v24.x/docs/api/http.html)
- [Node.js 24 AbortSignal API](https://nodejs.org/download/release/latest-v24.x/docs/api/globals.html)
- [Node.js Process Signal Events](https://nodejs.org/api/process.html#signal-events)
