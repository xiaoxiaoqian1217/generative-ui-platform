<!-- cspell:ignore telemetry traceparent -->

# ADR-0017: 固化 HTTP 可观测性和敏感数据策略

- **状态：** 已接受
- **日期：** 2026-07-29

## 背景

UI Compiler Service 通过 HTTP 接收不可信的 `PresentationRequest`，并在一次请求中执行输入校验、Markdown 清理、Catalog 加载、展示路由、可选模型分析、可选编译和结果映射。
Requirements 16.5 要求每次请求记录请求关联、Catalog 身份、上下文存在性、最终模式、阶段耗时、模型调用与重试、降级、错误代码和编译器版本。
ADR-0014 禁止记录原始 Markdown、清理后的 Markdown、被删除 HTML 和被拒绝 URL。
ADR-0015 要求模型供应商响应、错误正文、请求标识和 SDK 类型不得越过 Model Adapter 边界。
ADR-0016 已定义 HTTP 请求开始、客户端断开、总超时、阶段超时、响应完成和关闭的生命周期语义，并禁止 Fastify 自带 Logger 成为项目的默认日志决策。

如果日志字段、追踪边界和敏感数据处理留给具体供应商或各实现点自行决定，后续实现容易泄漏业务内容、无法关联一次降级请求的阶段结果，并把日志 SDK 类型带入 Service 用例或 UI Compiler Core。

本 ADR 只固化 Service 内部的可观测性数据模型、HTTP 生命周期记录边界、敏感数据分类、清理测试和可替换实现边界。
本 ADR 不实现 HTTP Service、日志供应商、追踪供应商、指标系统、AG-UI 或 SSE Endpoint、业务 Agent 或 Frontend Runtime。

## 决策驱动因素

- 一次请求必须可以通过安全的关联字段串联 HTTP、路由、模型和编译阶段。
- 结构化日志必须提供稳定字段，而不能依赖自然语言消息或供应商专有属性。
- 每个耗时必须使用单调时钟测量，并明确其起止点和不可用情形。
- 取消、客户端断开、超时、降级和错误必须可区分。
- 原始或清理后的业务内容、秘密和供应商原始载荷不得进入日志或追踪属性。
- 观测实现必须可替换，且不能改变 Core、公共契约或 HTTP 错误响应的职责。
- 清理行为必须可由自动化测试证明，而不是依赖代码审查或运行约定。

## 决策

UI Compiler Service 定义一个供应商无关的 Observability Port。
HTTP Adapter、Service 用例、Presentation Router 组合层、Model Adapter 组合层和 Core Adapter 只依赖该 Port 的安全输入类型。
具体日志、追踪或指标 SDK 只能位于 `apps/ui-compiler-service` 的基础设施实现和私有测试中。
`presentation-contract`、`compiler-contract`、`component-catalog-schema`、`ui-compiler-core` 和公共 Service 用例不得导入观测供应商类型。

可观测性失败不得改变已验证的 `PresentationResult`、HTTP 状态码、取消语义、重试决策或降级路径。
Sink 写入失败只能由 Port 在内部以计数或安全的进程级诊断处理，不能把原始异常、Payload 或 Stack 回传给调用方。

每条日志和每个追踪属性只允许使用本 ADR 的安全字段集合。
实现不得提供接受任意对象、任意 Error、任意 Header 或任意字符串字典的日志方法。

## 安全的内部边界

以下接口是实现必须保持的语义边界。
字段可以使用等价的 TypeScript 名称，但不得放宽值域或允许携带未审查的 `unknown` 数据。

```ts
type ObservationStage =
  | "http-receive"
  | "input-validation"
  | "content-serialization"
  | "catalog-resolution"
  | "presentation-routing"
  | "model-analysis"
  | "ui-plan-validation"
  | "ui-compilation";

type StableErrorCode =
  | "PRESENTATION_REQUEST_INVALID"
  | "PRESENTATION_DECISION_INVALID"
  | "PRESENTATION_RESULT_INVALID"
  | "MARKDOWN_SANITIZATION_FAILED"
  | "STRUCTURED_DATA_INVALID"
  | "DATA_DEPTH_EXCEEDED"
  | "DATA_ITEMS_EXCEEDED"
  | "DATA_SERIALIZED_BYTES_EXCEEDED"
  | "PRESENTATION_ROUTING_FAILED"
  | "MODEL_CANCELLED"
  | "MODEL_TIMEOUT"
  | "MODEL_RATE_LIMITED"
  | "MODEL_UNAVAILABLE"
  | "MODEL_AUTHENTICATION_FAILED"
  | "MODEL_PERMISSION_DENIED"
  | "MODEL_REQUEST_REJECTED"
  | "MODEL_CONTENT_FILTERED"
  | "MODEL_INVALID_RESPONSE"
  | "MODEL_PROVIDER_ERROR"
  | "MODEL_RETRY_EXHAUSTED"
  | "UI_COMPILE_REQUEST_INVALID"
  | "UI_PLAN_INVALID"
  | "COMPONENT_CATALOG_INVALID"
  | "CATALOG_REFERENCE_MISMATCH"
  | "CATALOG_CONTENT_HASH_MISMATCH"
  | "SCHEMA_DEFINITION_INVALID"
  | "SCHEMA_LIMIT_EXCEEDED"
  | "SCHEMA_COMPILATION_FAILED"
  | "NO_COMPATIBLE_COMPOSITION"
  | "COMPONENT_NOT_ALLOWED"
  | "NO_COMPATIBLE_COMPONENT"
  | "PROPS_RESOLUTION_FAILED"
  | "COMPONENT_PROPS_INVALID"
  | "ACTION_PAYLOAD_INVALID"
  | "ACTION_BINDING_UNRESOLVED"
  | "UI_IR_INVALID"
  | "A2UI_INVALID"
  | "COMPILE_TIMEOUT"
  | "REQUEST_CANCELLED"
  | "REQUEST_RECEIVE_TIMEOUT"
  | "REQUEST_BODY_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "UNSUPPORTED_CONTENT_ENCODING"
  | "REQUEST_TIMEOUT"
  | "SERVICE_SHUTTING_DOWN"
  | "INTERNAL_ERROR";

type StageResult =
  | "completed"
  | "failed"
  | "cancelled"
  | "timed-out"
  | "skipped";

type HttpRequestTerminalOutcome =
  | "completed"
  | "cancelled"
  | "timed-out"
  | "client-disconnected"
  | "rejected";

interface SafeRequestObservationStart {
  readonly observationVersion: "1.0";
  readonly transportRequestId: string;
  readonly compilerVersion: string;
  readonly receivedAtUnixMs: number;
}

interface SafeRequestObservationTerminal {
  readonly outcome: HttpRequestTerminalOutcome;
  readonly httpStatusCode?: number;
  readonly requestId?: string;
  readonly catalogId?: string;
  readonly catalogVersion?: string;
  readonly catalogContentHash?: `sha256:${string}`;
  readonly hasPresentationContext?: boolean;
  readonly hasUserMessage?: boolean;
  readonly finalMode?: "markdown" | "generative-ui";
  readonly degraded?: boolean;
  readonly degradationReasonCode?: StableErrorCode;
  readonly errorCode?: StableErrorCode;
  readonly errorStage?: ObservationStage;
  readonly totalDurationMs: number;
  readonly routeDurationMs?: number;
  readonly modelDurationMs?: number;
  readonly compileDurationMs?: number;
  readonly modelCalled: boolean;
  readonly modelAttemptCount: number;
  readonly modelRetried: boolean;
}

interface SafeStageObservation {
  readonly stage: ObservationStage;
  readonly result: StageResult;
  readonly durationMs: number;
  readonly errorCode?: StableErrorCode;
  readonly modelAttemptCount?: number;
  readonly modelCalled?: boolean;
  readonly modelRetried?: boolean;
}

interface RequestObservation {
  recordStageCompletion(input: SafeStageObservation): void;
  end(input: SafeRequestObservationTerminal): void;
}

interface ObservabilityPort {
  startHttpRequest(input: SafeRequestObservationStart): RequestObservation;
}
```

`RequestObservation` 是一次 HTTP 请求的私有句柄，且 `end` 必须至多成功一次。
实现必须在 Port 内部拒绝第二次终止写入，并把它作为安全的实现缺陷诊断，而不是第二条终止日志。
`durationMs` 必须是非负整数，且 `errorCode` 只在既非 `completed` 也非 `skipped` 的结果中出现。
模型字段只在 `model-analysis` 阶段出现，并且 `modelAttemptCount` 为非负整数。
`SafeStageObservation` 不得包含输入、输出、异常对象或任意业务字段。

Trace Provider 可以由该 Port 创建请求 Span 和阶段 Span。
Provider 返回的 Trace Handle 必须对应用层保持不透明。
应用层不得读取或传播供应商 Context、Span、Baggage、Header 或 SDK Error。

## 结构化日志事件和字段

所有请求事件使用 `observationVersion = "1.0"`。
事件名称、字段名和值域是版本化的 Service 内部可观测性契约。
增加字段只能是兼容性变更。
移除字段、改变字段含义或把安全枚举改成自由文本必须修订本 ADR、更新测试并执行日志消费者迁移评估。

| 事件名称 | 发出次数 | 含义 |
|---|---:|---|
| `ui_compiler.http.request_started` | 1 | HTTP Adapter 已接收请求，并已生成不可由调用方覆盖的 `transportRequestId`。 |
| `ui_compiler.http.stage_completed` | 0 至多次 | 一个已开始的安全阶段结束。 |
| `ui_compiler.http.request_completed` | 0 或 1 | Service 已得到可写出的 HTTP 响应，或已安全拒绝请求。 |
| `ui_compiler.http.request_cancelled` | 0 或 1 | 非客户端断开的请求级取消已成为终局。 |
| `ui_compiler.http.request_timed_out` | 0 或 1 | HTTP 接收或请求总时限已成为终局。 |
| `ui_compiler.http.client_disconnected` | 0 或 1 | ADR-0016 Lifecycle Bridge 已确认客户端在请求或响应未完成时断开。 |

每个请求只允许一个终局事件。
`request_completed` 可表示 HTTP 200 的 completed、degraded 或 failed `PresentationResult`，也可表示已安全写出 400、413、415、500 或 503 的 Transport 错误响应。
`request_cancelled`、`request_timed_out` 和 `client_disconnected` 不能同时出现。

| 字段 | 事件 | 值和记录规则 |
|---|---|---|
| `observationVersion` | 全部 | 固定为 `1.0`。 |
| `eventName` | 全部 | 仅使用本 ADR 的六个事件名称。 |
| `timestampUnixMs` | 全部 | 记录事件发出时的 UTC Unix 毫秒。 |
| `transportRequestId` | 全部 | HTTP Adapter 生成的安全传输关联 ID。 |
| `requestId` | 终局和阶段 | 仅在 `PresentationRequest` 已通过 Schema 校验后记录调用方提供的值。 |
| `catalogId` | 终局和阶段 | 仅在 Catalog 引用和授权 Catalog 已通过验证后记录。 |
| `catalogVersion` | 终局和阶段 | 仅在 Catalog 引用和授权 Catalog 已通过验证后记录。 |
| `catalogContentHash` | 终局和阶段 | 仅在从已验证完整 Catalog 使用共享哈希函数计算后记录。 |
| `compilerVersion` | 开始和终局 | 当前 Compiler Service 发布版本，不记录构建环境变量的完整内容。 |
| `hasPresentationContext` | 终局 | `context` 是否存在，不记录其中任何字段。 |
| `hasUserMessage` | 终局 | `context.userMessage` 是否为非空字符串，不记录消息本身。 |
| `finalMode` | completed 终局 | 生成可消费结果时为 `markdown` 或 `generative-ui`; 否则省略。 |
| `degraded` | completed 终局 | 是否返回 `status = "degraded"`。 |
| `degradationReasonCode` | completed 终局 | 仅记录触发降级的第一个稳定错误代码。 |
| `errorCode` | 失败、取消、超时或拒绝终局 | 项目稳定错误代码或 ADR-0016 的稳定 Transport 错误代码。 |
| `errorStage` | 失败、取消、超时或拒绝终局 | 本 ADR 的阶段枚举。 |
| `httpStatusCode` | 可写响应的终局 | 实际写出的 HTTP 状态码。 |
| `totalDurationMs` | 终局 | 从 HTTP Adapter `onRequest` 单调时钟起点到终局记录点的非负整数毫秒。 |
| `routeDurationMs` | 终局 | 仅在进入 Router 时记录其开始到结束的非负整数毫秒。 |
| `modelDurationMs` | 终局 | 仅在调用模型时记录其逻辑调用的非负整数总时长。 |
| `compileDurationMs` | 终局 | 仅在进入 Core 编译时记录其开始到结束的非负整数毫秒。 |
| `modelCalled` | 终局 | 是否调用过一次逻辑 Model Adapter。 |
| `modelAttemptCount` | 终局 | 已启动的模型物理尝试数量，未调用模型时为 0。 |
| `modelRetried` | 终局 | `modelAttemptCount > 1`。 |
| `outcome` | 终局 | `completed`、`cancelled`、`timed-out`、`client-disconnected` 或 `rejected`。 |
| `traceId`、`spanId` | 可选全部事件 | 仅当可替换 Trace Provider 生成了不透明关联 ID 时记录。 |

客户端断开时省略 `httpStatusCode`，因为 HTTP Adapter 未写出响应。
不得记录或接受入站追踪 Header。
日志不得记录 `threadId`、`runId`、客户端 IP、完整 URL Query、请求 Header、Cookie、认证信息或 User Agent。
这些值不是 Requirements 16.5 所需字段，且会扩大关联或指纹识别风险。

## 阶段和耗时语义

阶段耗时使用单调时钟测量，不能由系统墙钟回拨、供应商时间戳或客户端时间戳计算。
`totalDurationMs` 覆盖 ADR-0016 中从 `onRequest` 到响应序列化或已确认断开的完整请求生命周期。
`routeDurationMs` 包含 Router 的确定性决策和等待 Model Adapter 的时间。
`modelDurationMs` 是 `routeDurationMs` 的可选子区间，不得与其相加后再计入总耗时。
`compileDurationMs` 是独立的 Core Adapter 区间。

阶段事件最多记录以下阶段。

| 阶段 | 开始边界 | 结束边界 | 不适用情形 |
|---|---|---|---|
| `http-receive` | HTTP Adapter `onRequest` | 完整 JSON Body 已读取，或接收错误、超限、超时或 Body 阶段断开已确定 | 从不省略。 |
| `input-validation` | HTTP JSON 已解析 | 公共请求 Validator 和资源限制已成功或失败 | JSON 未能解析时省略。 |
| `content-serialization` | 输入有效 | Markdown 清理、结构化数据校验和确定性序列化已完成或失败 | 输入校验失败时省略。 |
| `catalog-resolution` | 内容已安全准备 | 授权 Catalog 已加载、校验和哈希，或失败 | 内容准备失败时省略。 |
| `presentation-routing` | Catalog Snapshot 已就绪 | Router 返回、失败、取消或超时 | Catalog 失败时省略。 |
| `model-analysis` | Router 调用 Adapter | Adapter 返回、失败、取消或超时 | Router 使用确定性分支时省略。 |
| `ui-plan-validation` | Router 得到 generative UI 候选 | 候选联合和 UI Plan 已通过或未通过运行时校验 | Markdown 分支时省略。 |
| `ui-compilation` | 已验证 generative UI 决策可交给 Core | Core 返回、失败、取消或超时 | Markdown 分支或 UI Plan 校验失败时省略。 |

阶段日志不记录 `reason`、模型提示词、模型候选、UI Plan、Fallback Markdown、源数据、Catalog 内容或 `PresentationResult`。
阶段结果只允许 `completed`、`failed`、`cancelled`、`timed-out` 或 `skipped` 枚举。

## HTTP 生命周期记录边界

HTTP Adapter 在 `onRequest` 生成 `transportRequestId` 后立即记录 `request_started`。
该事件在请求通过 Schema 前不包含调用方 `requestId`、Catalog 身份、上下文存在性或任何请求内容。

当请求已完成响应序列化并且 Socket 仍可写时，Adapter 记录唯一的 `request_completed`。
合法请求因 Router、模型、候选或编译问题降级为 Markdown 时，仍记录 `outcome = "completed"`、`httpStatusCode = 200`、`degraded = true` 和稳定的 `degradationReasonCode`。
Transport 拒绝记录 `outcome = "rejected"` 和 ADR-0016 定义的稳定错误代码。

当 Lifecycle Bridge 确认 `request.raw.complete = false` 的请求阶段断开，或确认 `reply.raw.writableFinished = false` 的响应阶段断开时，Adapter 记录唯一的 `client_disconnected`。
该事件不得尝试写入 HTTP Error Body，也不得记录原始 Socket Error、远端地址、Header 或请求内容。

当调用方或 Service 请求级 Signal 在非客户端断开情况下成为终局时，Adapter 记录 `request_cancelled` 和 `REQUEST_CANCELLED` 或适用的稳定取消代码。
当 HTTP 接收超时或外层 `requestDeadlineMs` 成为终局时，Adapter 记录 `request_timed_out`，分别使用 `REQUEST_RECEIVE_TIMEOUT` 或 `REQUEST_TIMEOUT`。
模型或编译阶段超时若能产生安全 Markdown 降级，则它们不是 HTTP 终局超时，而是 `request_completed` 的 `degradationReasonCode`。

竞争条件必须遵守 ADR-0016 的优先级。
已确认客户端断开优先于关闭、外层总时限和阶段时限。
关闭强制中止优先于外层总时限。
任何迟到 Promise、重复 Hook 或重复 Error Mapper 调用都不得产生第二条终局事件。

## 追踪边界

追踪是可选实现，不是 HTTP、Router、Model Adapter、Core 或公共契约的前置条件。
启用追踪时，Port 为一次请求创建一个 `ui_compiler.http.request` 根 Span，并只为实际执行的 `presentation-routing`、`model-analysis` 和 `ui-compilation` 创建子 Span。
Span 属性必须是本 ADR 的安全日志字段或阶段枚举。

Service 默认不提取或继续入站 `traceparent`、Baggage 或供应商 Context。
若未来需要跨服务追踪，必须先通过独立 ADR 定义受信任代理边界、Header 清理、采样、租户隔离和传播策略。
Trace ID 只能用于技术关联，不能用于授权、业务状态、Business Agent Run 或 AG-UI Run 生命周期。

## 敏感数据分类和禁止记录规则

| 分类 | 可记录内容 | 明确禁止记录内容 |
|---|---|---|
| 请求关联 | `transportRequestId` 和已验证 `requestId` | `threadId`、`runId`、客户端 IP、会话标识和入站追踪上下文。 |
| Catalog 身份 | `catalogId`、`catalogVersion` 和规范内容哈希 | 完整 Catalog、组件描述、Props Schema、Action Schema 和领域标签。 |
| 上下文 | `hasPresentationContext` 和 `hasUserMessage` 布尔值 | `userMessage`、locale、theme、viewport、domain 和任何上下文对象。 |
| 内容 | 无 | 原始 HTTP Body、原始 Markdown、Sanitized Markdown、`fallbackMarkdown`、结构化业务数据、确定性序列化结果、UI Plan、UI IR、A2UI Operations 和 `PresentationResult`。 |
| 安全清理 | Policy Version、变化类别计数和稳定失败代码 | 被删除 HTML、危险 URL、Image URL、Code 内容、Parser 位置和 AST。 |
| 模型 | 是否调用、尝试次数、耗时和稳定错误代码 | 提示词、候选、响应、Tool Call、Usage、Token 文本、供应商 Request ID、Header、Finish Reason、错误正文和 SDK Error。 |
| HTTP 与运行环境 | HTTP 状态码、阶段、耗时、稳定错误代码和编译器版本 | `Authorization`、Cookie、Set-Cookie、Secret、环境变量值、证书、完整 URL Query、Header、Stack 和 Socket Error。 |

Secret 包括 API Key、访问令牌、密码、私钥、签名、连接字符串以及任何 Secret Store 返回值。
实现不得依赖字段名黑名单来决定一个任意对象是否可记录。
可记录数据必须先由类型化的安全事件构造器投影为允许字段。

清理器、Router、Model Adapter、Core Adapter 和 Error Mapper 不得把 Error `message` 直接映射到日志字段。
错误日志只使用稳定代码、阶段、重试布尔值、实际尝试次数和上述安全关联字段。
公共 HTTP 错误消息继续由 ADR-0016 的固定模板生成，且不从日志事件反向构造。

## 日志、追踪和 HTTP 错误响应的职责边界

| 责任 | 允许内容 | 禁止内容 |
|---|---|---|
| HTTP Error Mapper | 固定安全消息、稳定错误代码、允许列表 `details`、HTTP 状态和有效请求 ID | 日志或追踪查询结果、供应商 Error、Stack、请求内容和任意诊断文本。 |
| Observability Port | 本 ADR 的安全字段、阶段状态和不透明追踪关联 ID | 生成公共响应、决定 HTTP 状态、重试、取消、降级或业务恢复。 |
| 日志或追踪 Provider | 对安全事件进行存储、索引、采样和导出 | 访问 Service 内部 Payload、修改事件字段、要求 Core 依赖或把供应商对象返回应用层。 |

日志与追踪是诊断副作用，不是业务事实来源。
调用方不能通过日志字段获得超出 `PresentationResult` 和固定 HTTP 错误 Envelope 的信息。

## 自动化验证策略

实现 Issue 必须在首次接入任何 Sink 前建立以下自动化测试。

- 单元测试为每个事件构造器断言精确允许字段、枚举值、非负耗时和终局幂等性。
- 单元测试向原始 Markdown、Sanitized Markdown、结构化数据、`userMessage`、Fallback、UI Plan、Catalog、模型响应、Authorization Header 和 Error Message 注入唯一哨兵字符串，并断言任何日志事件和追踪属性都不包含这些字符串。
- 集成测试使用可记录的 Fake Port 执行 completed Markdown、completed generative UI、degraded Markdown、输入拒绝、模型重试耗尽、模型超时、编译失败、请求取消、请求总超时和客户端断开。
- 集成测试断言每个请求恰好有一个开始事件和一个终局事件，并断言终局事件、模式、降级原因、HTTP 状态、错误代码和阶段耗时符合本 ADR。
- 真实 Socket 测试复用 ADR-0016 的断开和超时 Fixture，验证已确认的客户端断开不写响应且只产生 `client_disconnected`，正常 Keep-Alive 不会误记断开。
- 属性测试对任意 JSON、Markdown、Header 和错误文本注入哨兵值，断言安全投影后的字段键和值不包含哨兵值，且输出不出现未允许字段。
- 依赖边界测试断言 `ui-compiler-core`、公共契约包和应用用例不导入观测供应商 SDK。
- Sink 失败测试断言记录器或追踪导出器抛出时，Service 仍保留原有的安全响应、取消、超时和降级语义。

测试不得通过对日志字符串进行通配删除后再断言的方式掩盖泄漏。
测试必须检查结构化事件对象、序列化输出和追踪属性的原始键和值。
安全 Fixture 必须保存在仓库并离线执行，不得把真实 Secret 或生产 Payload 提交到测试数据。

## 范围外

- 不实现 Fastify、HTTP Server、Logger、Trace Provider、指标后端或外部监控账号。
- 不选择日志、追踪或指标供应商。
- 不增加供应商 SDK、OpenTelemetry SDK 或任何公共观测契约包依赖。
- 不实现 AG-UI、SSE、WebSocket、Business Agent Run、Copilot Runtime、Interaction Gateway、真实业务 Agent 或 Frontend Runtime。
- 不改变 `PresentationRequest`、`PresentationResult`、Router、Model Adapter 或 UI Compiler Core 的公共契约。

## 后果

- 后续 HTTP 实现拥有可关联、可测量且不记录业务 Payload 的最小结构化可观测性契约。
- 取消、客户端断开、HTTP 总超时、阶段错误和安全降级可以在不读取自然语言日志的情况下区分。
- 任何日志或追踪供应商都可在 Service 基础设施层替换，不影响 Core 或共享契约。
- Service 需要维护安全事件构造器、单调计时器、终局幂等性和泄漏回归测试。
- 采样、保留期限、访问控制、告警路由和跨服务追踪传播仍需要部署或平台层的后续决策。

## 取代关系

本 ADR 固化 Requirements 16.5 和第 23 节中阶段五验收前必须决定的日志和链路追踪方案边界。
本 ADR 细化 ADR-0014 的 Markdown 和日志信任边界、ADR-0015 的模型供应商隔离，以及 ADR-0016 的 HTTP 生命周期、取消、超时和安全日志要求。
本 ADR 不改变 ADR-0013 对 Business Agent Run 和 AG-UI Run 生命周期的外部归属。
本 ADR 不选择日志或追踪供应商，也不改变 UI Compiler Core 的框架、传输和供应商无关边界。
