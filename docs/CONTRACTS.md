# Contracts

## Contract Boundaries

The platform uses separate contracts for cross-process Runtime traffic, Business Agent adapter traffic, in-process presentation routing, and UI compilation.
The Business Agent content contract accepts Markdown or JSON structured data.
Compiler-specific metadata is not part of Business Agent output.
`PresentationRequest` and `PresentationResult` are the stable in-process package contract between Agent Runtime Host and Embedded Presentation Pipeline.
They are not a UI Compiler network protocol in the current platform architecture.

```text
Web HTTP / WebSocket
    |
    v
RuntimeRunRequest / RuntimeActionRequest
    |
    v
BusinessAgentRunRequest / BusinessAgentResumeActionRequest
    |
    v
AgentContent
    |
    v
PresentationRequest
    |
    v
PresentationDecision Candidate
    |
    +---- markdown ------> PresentationResult
    |
    +---- generative-ui -> UICompileRequest
                              |
                              v
                        UICompileResult
                              |
                              v
                        PresentationResult
    |
    v
RuntimeRunResult / RuntimeActionResult
```

## Business Agent Contract

`@generative-ui/runtime-contract` owns the Business Agent Run and Resume Action contracts.
Runtime Host sends these requests through a `BusinessAgentAdapter`.
The contract is protocol-neutral and does not expose LangGraph, CopilotKit, AG-UI, Presentation Pipeline, UI Plan Candidate, UI IR, A2UI, HTML, Vue, React, or component selection details.

```ts
export interface BusinessAgentRunRequest {
  protocolVersion: "1.0";
  requestId: string;
  threadId: string;
  runId: string;
  agentId?: string;
  input: {
    message: string;
  };
  context?: {
    locale?: string;
    timezone?: string;
    domain?: string;
    metadata?: Record<string, JsonValue>;
  };
}

export interface BusinessAgentResumeActionRequest {
  protocolVersion: "1.0";
  requestId: string;
  threadId: string;
  runId: string;
  agentId?: string;
  action: {
    actionId: string;
    actionType: string;
    surfaceId: string;
    payload?: JsonValue;
    approved?: boolean;
  };
  context?: BusinessAgentContext;
}

export type BusinessAgentRunResult =
  | {
      protocolVersion: "1.0";
      requestId: string;
      threadId: string;
      runId: string;
      status: "completed";
      content: AgentContent;
      diagnostics?: RuntimeDiagnosticsSummary;
    }
  | {
      protocolVersion: "1.0";
      requestId: string;
      threadId: string;
      runId: string;
      status: "failed";
      error: PlatformError;
      diagnostics?: RuntimeDiagnosticsSummary;
    };

export type BusinessAgentResumeActionResult = BusinessAgentRunResult;
```

Business Agent results may contain only `AgentContent` or a stable error.
Business Agent output must not contain `PresentationDecision`, UI Plan Candidate, UI IR, A2UI Operations, HTML, Vue, React, model provider objects, or frontend component choices.
Runtime Host validates Business Agent requests and results at the adapter boundary.

## Runtime HTTP and WebSocket Contract

`@generative-ui/runtime-contract` owns the Web-facing Runtime Run and Action contracts.
HTTP request bodies use `RuntimeRunRequest` and `RuntimeActionRequest`.
WebSocket messages wrap the same application payloads in versioned discriminated envelopes.
Transport layers must validate messages before calling orchestration code.

```ts
export interface RuntimeRunRequest {
  protocolVersion: "1.0";
  requestId: string;
  threadId?: string;
  runId?: string;
  agentId?: string;
  message: {
    role: "user";
    content: string;
  };
  presentation?: {
    catalog?: CatalogReference;
    context?: PresentationContext;
  };
}

export interface RuntimeActionRequest {
  protocolVersion: "1.0";
  requestId: string;
  threadId: string;
  runId: string;
  action: {
    actionId: string;
    actionType: string;
    surfaceId: string;
    payload?: JsonValue;
    approved?: boolean;
  };
}

export type RuntimeRunResult =
  | {
      protocolVersion: "1.0";
      requestId: string;
      threadId: string;
      runId: string;
      presentationRequestId: string;
      status: "completed" | "degraded";
      presentation: PresentationResult;
      diagnostics?: RuntimeDiagnosticsSummary;
    }
  | {
      protocolVersion: "1.0";
      requestId: string;
      threadId: string;
      runId: string;
      presentationRequestId?: string;
      status: "failed";
      error: PlatformError;
      presentation?: PresentationResult;
      diagnostics?: RuntimeDiagnosticsSummary;
    };

export type RuntimeActionResult =
  | {
      protocolVersion: "1.0";
      requestId: string;
      threadId: string;
      runId: string;
      actionId: string;
      presentationRequestId: string;
      status: "completed" | "degraded";
      presentation: PresentationResult;
      diagnostics?: RuntimeDiagnosticsSummary;
    }
  | {
      protocolVersion: "1.0";
      requestId: string;
      threadId: string;
      runId: string;
      actionId?: string;
      presentationRequestId?: string;
      status: "failed";
      error: PlatformError;
      presentation?: PresentationResult;
      diagnostics?: RuntimeDiagnosticsSummary;
    };
```

`RuntimeRunResult` and `RuntimeActionResult` may carry `PresentationResult` plus a minimal diagnostic summary.
When a Runtime result carries both `presentationRequestId` and `presentation`, `presentation.requestId` must match `presentationRequestId`.
Runtime diagnostics contain only stage names, statuses, durations, and normalized error codes.
They must not contain complete user requests, complete AgentContent, provider raw responses, API keys, Authorization headers, or unsanitized Action payloads.

The WebSocket inbound union is `runtime.run.request | runtime.action.request`.
The WebSocket outbound union is `runtime.run.result | runtime.action.result | runtime.error`.
The WebSocket envelope does not define an internal UI Compiler client or remote Compiler mode.

## Stable Runtime Errors and Correlation

`PlatformErrorCode` is the stable Runtime and Business Agent adapter error code union.
The current codes are `REQUEST_INVALID`, `REQUEST_TIMEOUT`, `REQUEST_CANCELLED`, `RUN_NOT_FOUND`, `ACTION_INVALID`, `ACTION_FORBIDDEN`, `ACTION_CONFLICT`, `SURFACE_NOT_FOUND`, `BUSINESS_AGENT_UNAVAILABLE`, `BUSINESS_AGENT_TIMEOUT`, `BUSINESS_AGENT_PROTOCOL_INVALID`, `BUSINESS_AGENT_ERROR`, `PRESENTATION_PIPELINE_ERROR`, `PRESENTATION_RESULT_INVALID`, and `INTERNAL_ERROR`.

`requestId` identifies the current external Runtime request.
`threadId` and `runId` identify the Business Agent conversation and run.
`presentationRequestId` identifies the in-process Presentation Pipeline request.
`surfaceId` and `actionId` identify the rendered surface and validated action.
Runtime Host is responsible for generating missing Runtime correlation values before calling Business Agent or Presentation Pipeline.

## Presentation Request

`PresentationRequest` is the stable in-process input from Agent Runtime Host to the Embedded Presentation Pipeline.
It is not the current platform HTTP request body.
It must not be reintroduced as a UI Compiler network protocol, UI Compiler Client contract, or remote mode contract.

```ts
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type AgentContent =
  | {
      contentType: "markdown";
      markdown: string;
    }
  | {
      contentType: "structured-data";
      data: JsonValue;
      fallbackMarkdown?: string;
    };

export interface PresentationRequest {
  requestId: string;
  threadId?: string;
  runId?: string;
  content: AgentContent;
  context?: {
    userMessage?: string;
    locale?: string;
    theme?: string;
    viewport?: {
      width: number;
      height: number;
    };
    domain?: string;
  };
  catalog: {
    catalogId: string;
    catalogVersion: string;
  };
}
```

Markdown content must be present and non-empty.
Before Markdown enters a Model Adapter, UI Compiler Core, UI IR, A2UI, a cache, or a log, UI Compiler Service must sanitize it.
Structured data must be JSON serializable and remain within configured depth and item limits.
When `fallbackMarkdown` is present, it must be non-empty and pass Markdown safety sanitization before use.
When structured data does not include `fallbackMarkdown`, the service must be able to produce a deterministic and safe Markdown serialization without silently truncating data.
`userMessage` is optional because some callers only have the Agent response.
The service must not require a Business Agent to provide presentation mode, presentation intent, or a UI plan.

## Presentation Decision

`PresentationDecision` is the validated output of the Presentation Router.
It is internal to the Presentation Pipeline and must not be accepted as trusted model output.

```ts
export type PresentationDecision =
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

The Model Adapter may produce a candidate decision.
The service validates the candidate against its Schema before using it.
An invalid decision degrades to sanitized Markdown or a deterministic Markdown serialization of structured data.
Runtime Host must not construct or accept `PresentationDecision` through its Web or Business Agent contracts.

## UI Plan Candidate

`UIPlan` is the contract name for a framework-neutral UI plan candidate.
It is Schema-valid but remains untrusted and non-authoritative.
It may contain component suggestions, data, layout intent, and Action descriptions.
It must not contain executable code, DOM nodes, framework component instances, or provider-specific model response objects.

Every suggested component and Action is provisional.
UI Compiler Core performs the authoritative Catalog and Schema validation.
The candidate should describe semantic regions, source-data bindings, component preferences, layout constraints, and Action intent rather than duplicate final UI IR.
Its exact interface must be decided before the model-analysis implementation phase and must preserve a meaningful lowering step from candidate to UI IR.

The three representations have distinct trust levels:

| Representation | Meaning | Trust |
|---|---|---|
| UI Plan Candidate | A semantic proposal from a model or deterministic planner | Untrusted |
| UI IR | The normalized component graph produced after authoritative Core validation | Trusted inside the Compiler |
| A2UI | The validated external rendering payload compiled from UI IR | Trusted protocol output |

## Action Intent

`ActionIntent` describes what an interface action means, not how a frontend executes arbitrary code.
Candidate Actions are provisional until Core validates their type, payload, target component, and Catalog permission.
The MVP may emit validated Action descriptions but does not implement the complete action callback path to a Business Agent.
候选 `payload` 是命名语义参数映射，每个参数只能是源数据 JSON Pointer 绑定或 JSON 标量字面值。

## Compile Request

`UICompileRequest` is an internal package-level request for content that has already been selected for generative UI by the Presentation Pipeline.
It is not a Runtime HTTP or WebSocket contract.

```ts
export interface UICompileRequest {
  requestId: string;
  threadId?: string;
  runId?: string;
  plan: UIPlan;
  sourceData: JsonValue;
  sourceKind: "markdown" | "structured-data";
  fallbackMarkdown: string;
  catalog: {
    catalogId: string;
    catalogVersion: string;
  };
  context?: {
    locale?: string;
    theme?: string;
    viewport?: {
      width: number;
      height: number;
    };
  };
}
```

Core assumes that the caller has already selected generative UI.
Core must not use this request to decide between Markdown and generative UI.
For structured Agent content, `sourceData` is the complete validated input JSON.
For Markdown Agent content, `sourceData` is exactly `{ "markdown": sanitizedMarkdown }`.
Raw unsanitized Markdown is not part of the compile contract.
For structured Agent content, UI Compiler Service supplies `fallbackMarkdown` from the request or from deterministic serialization.
For Markdown Agent content, `fallbackMarkdown` is the sanitized Markdown.
The Presentation request contains only a Catalog ID and version.
The Presentation Pipeline resolves the Catalog from an authorized source before routing, derives the Router capability summary from that exact Catalog, and injects the complete Catalog into Core.
Core must reject a mismatch between the request Catalog reference and the injected Catalog ID or version.
Core recomputes the injected Catalog content hash and compares it with the trusted Adapter option.
The Presentation Pipeline separately verifies that the Router capability summary used the same content hash.

## Catalog Content Hash

`catalogContentHash` has one normative representation across UI Compiler Service, Presentation Router capability summaries, trusted direct Core Adapters, Core validation, and cache keys.
The phrases "canonical content hash" and "normalized content hash" elsewhere in this repository refer to this exact algorithm.

```ts
export function computeCatalogContentHash(
  catalog: ComponentCatalog
): `sha256:${string}`;
```

The algorithm is:

1. Validate the complete Catalog against the versioned Component Catalog Schema before hashing. Inputs containing duplicate object member names, non-finite numbers, or values outside the supported JSON domain must be rejected.
2. Canonicalize the complete validated Catalog using RFC 8785 JSON Canonicalization Scheme (JCS). Object member order is canonicalized by JCS, array order remains significant, and no Catalog fields are excluded.
3. Encode the canonical JSON text as UTF-8 without a byte-order mark.
4. Compute SHA-256 over those exact bytes.
5. Serialize the digest as `sha256:` followed by 64 lowercase hexadecimal characters.

All callers must use the shared `computeCatalogContentHash` implementation exported by `component-catalog-schema`; ad hoc `JSON.stringify` hashing is forbidden.
Core must still recompute the hash from the injected Catalog rather than trusting the caller-provided value.
The Router capability summary, Core `CompileOptions.catalogContentHash`, and cache key must carry the exact same hash string.
A change to any Catalog field, including `catalogId` or `catalogVersion`, changes the content hash.
Changing the canonicalization algorithm, digest algorithm, or wire representation is a contract change and requires an ADR, tests, and a changeset.

## UI IR

UI IR is the trusted, framework-neutral intermediate representation produced by Core.
Trusted means that Compiler structure and references are validated; it does not make external business facts authoritative or executable.
It contains only Catalog-approved components, validated Props and Actions, resolved references, normalized layout, source-data bindings, and fallback metadata.
It is not a model response, a frontend component instance, or an external rendering protocol.
The A2UI 0.9.1 Profile compiler maps normalized Props to flat component properties, Bindings to standard JSON Pointer objects, and validated component Action bindings to the versioned `action.event` Envelope.
`id`, `component`, and `action` are reserved A2UI output properties and cannot be supplied as ordinary Catalog Props.
`ActionIR.payload` 的每个参数必须保留为 `source-binding` 或 string、number、boolean 类型的 `literal`，以便确定性映射为 A2UI `DynamicValue`。
`actionId`、`requiresApproval` 和 `destructive` 是 Action Envelope 的保留 context 键，不能作为 payload 参数名。
`source-binding.sourcePointer` 映射为以 `/sourceData` 为前缀的 A2UI DataBinding，`literal.value` 原样映射为标量。
不能映射为 A2UI `DynamicValue` 的候选 Action 参数不得进入可信 UI IR。
进入可信 UI IR 的 Prop Binding 和 Action source binding 必须能够在声明的数据源中解析到现有值。
`compiler-contract` 的 A2UI Profile 只验证协议 Envelope 和与 Catalog 无关的 Surface 不变量。
Component Prop 的结构引用与 Binding 语义由已授权 Catalog 和 Core 映射负责，不得根据字段名或普通对象形状推断。

## Compile Result

`UICompileResult` remains a discriminated union with complete success, degraded success, and complete failure branches.
Only complete success contains A2UI Operations.
Only degraded success contains a Fallback.
Every result contains request correlation and compile metadata.
The MVP Fallback is safe Markdown.
The MVP does not emit fixed-template A2UI, `deleteSurface`, or Surface replacement results.

## Presentation Result

`PresentationResult` is the stable in-process output of the Embedded Presentation Pipeline.
It distinguishes ordinary Markdown from generative UI.
Runtime Host maps it into `RuntimeRunResult` or `RuntimeActionResult` before sending data to Web.

```ts
export interface PresentationError {
  code: string;
  message: string;
  stage:
    | "input-validation"
    | "content-serialization"
    | "presentation-routing"
    | "model-analysis"
    | "ui-plan-validation"
    | "ui-compilation";
  retryable: boolean;
  details?: unknown;
}

export type PresentationResult =
  | {
      requestId: string;
      status: "completed";
      mode: "markdown";
      markdown: string;
    }
  | {
      requestId: string;
      status: "completed";
      mode: "generative-ui";
      surfaceId: string;
      operations: A2UIOperation[];
    }
  | {
      requestId: string;
      status: "degraded";
      mode: "markdown";
      markdown: string;
      errors: PresentationError[];
    }
  | {
      requestId: string;
      status: "failed";
      errors: PresentationError[];
    };
```

The frontend sends `mode = "markdown"` to its Markdown Renderer.
The frontend sends `mode = "generative-ui"` to its A2UI Renderer and Component Registry.

Model, routing, planning, or compilation failure should normally produce a degraded Markdown result when valid source content is available.
`PresentationResult` 不依赖 AG-UI、CopilotKit、HTTP 或 WebSocket。
如果 Agent Runtime Host 选择 AG-UI，它可以把 completed 或 degraded 结果映射到 `CUSTOM(name = "generative-ui.presentation-result")`，并使用 `{ mappingVersion: "1.0", result }`。
没有可消费内容的失败可以映射到 `CUSTOM(name = "generative-ui.presentation-error")`，并在 `RUN_ERROR` 前携带 `{ mappingVersion: "1.0", errors }`。
该可选映射不属于当前平台 Runtime Contract 的必需接口。

## State and Correlation

`threadId` and `runId` are optional protocol correlation fields.
Core may pass through correlation values but must not use them to maintain conversation state or AG-UI Run lifecycle.
Presentation Pipeline only uses these fields for current-request correlation and diagnostics.
Agent Runtime Host owns the Business Agent Run lifecycle.
If Runtime Host needs non-empty identifiers, Runtime Host generates and reuses them according to the Runtime Contract.
The serialized request byte limit is enforced by the application Adapter before deserialization.
The Service or another trusted Core Adapter generates a unique request-level Surface ID.
Surface IDs and complete compile results must not be reused through cross-request caches.

## Package Ownership

The target package ownership is:

- `presentation-contract` owns `AgentContent`, `PresentationRequest`, `PresentationDecision`, `PresentationResult`, `UIPlan`, and `ActionIntent`.
- `runtime-contract` owns Business Agent Run and Resume Action requests/results, Runtime HTTP Run and Action request/result payloads, Runtime WebSocket envelopes, `PlatformError`, `PlatformErrorCode`, and Runtime diagnostics summaries.
- `compiler-contract` owns `UICompileRequest`, `UICompileResult`, UI IR, compile diagnostics, compile stages, and the A2UI 0.9.1 Profile Schema and mapping contract.
- `component-catalog-schema` owns Catalog, component, Props, Action, and structure Schemas, plus the shared `computeCatalogContentHash` implementation.
- `ag-ui-adapter` 如果通过单独范围启用，只拥有可选协议事件工具，不拥有展示路由、Business Agent Run 或编译逻辑。

## Implementation Status

`presentation-contract` 现已实现第一组可执行的 `AgentContent`、`PresentationRequest`、`PresentationDecision`、`PresentationResult`、`UIPlan` 和 `ActionIntent` 契约。
`runtime-contract` 现已实现第一组可执行的 Business Agent、Runtime HTTP、Runtime WebSocket、Action、错误码和诊断摘要契约。
`component-catalog-schema` 现已实现第一组可执行的 Catalog、component、Props、Action 和 nesting 契约，以及共享的 RFC 8785 Catalog 内容哈希。
`shared-types` 统一拥有两个包共用的公共 `JsonValue` 和校验结果定义。
`presentation-contract` 只把 `PresentationResult.operations` 校验为非空的可序列化对象数组，不在该包复制 A2UI Profile。
`compiler-contract` 现已实现可执行的编译请求、UI IR、三态编译结果、稳定错误和 A2UI 0.9.1 Profile 契约。
`ag-ui-adapter` 现已实现 SDK 无关的编译请求解析、请求级标识规范化、最小 AG-UI 事件 Schema、PresentationResult Payload 和错误事件映射。
`ag-ui-adapter` 只依赖 Compiler Contract、Presentation Contract、Shared Types 和 Schema 校验依赖，不安装或导入 AG-UI SDK。
`business-agent-adapter` 现已实现稳定的 Run 和 Resume Action 接口，以及可替换的 LangGraph HTTP 与 Mock Adapter。
`business-agent-adapter` 只依赖 Runtime Contract，并在具体 HTTP 协议进入 Runtime Host 前封装超时、取消、显式幂等前提下的有限重试、Schema 校验、错误归一化和关联 ID 一致性校验。
`agent-runtime-host` 已在组合根中依赖统一 Adapter 接口，并以 Runtime Contract 类型调用 Run 和 Resume Action，不依赖 LangGraph SDK 或具体协议路径。
UI Compiler Core 现已实现 summary、status、comparison、timeline、detail、form 和 confirmation 场景的确定性编译链路，包括输入和 Catalog 校验、基于数据规模、Catalog 描述、Viewport 和 nesting 约束的组件选择、标准 JSON Pointer 绑定、领域组件选择、Props 与 Action 权威校验、布局规范化、UI IR lowering、A2UI 0.9.1 Profile 编译和 Markdown 降级。
UI Compiler Service 现已实现 ADR-0014 Policy 1.0 Markdown Sanitizer、结构化数据资源校验、确定性 Markdown 展示路由和 completed Markdown `PresentationResult` 直出 tracer bullet。
结构化数据直出会在路由前拒绝非 JSON、超深、超量和超过序列化字节限制的输入。
合法 Fallback 会经过 Markdown 安全清理，没有可用 Fallback 时会完整且稳定地序列化 JSON。
generative UI 模型路径、Core 编排和历史 HTTP Service 仍属于 Compiler 子系统限定范围。
当前平台目标不新增 UI Compiler HTTP Contract、UI Compiler Client Contract 或 Remote Mode Contract。
协议 Adapter 需要单独范围，不是 Presentation Pipeline 或 Runtime Contract 的必需接口。
每个新增可执行契约都必须包含 Schema 测试、changeset 和必要的版本决策。

## Migration and Deprecation Plan

可复用类型如下。
`AgentContent`、`PresentationRequest` 和 `PresentationResult` 保留在 `presentation-contract` 中，不复制到 Runtime 或 Business Agent 应用。
`JsonValue` 和 `ValidationResult` 保留在 `shared-types` 中。
`UICompileRequest`、`UICompileResult`、UI IR 和 A2UI Profile 保留在 `compiler-contract` 中，只供 Presentation Pipeline 和 UI Compiler Core 使用。

需扩展类型如下。
Business Agent Run、Business Agent Resume Action、Runtime Run、Runtime Action、Runtime WebSocket Envelope、Runtime diagnostics 和稳定 Platform error codes 由 `runtime-contract` 提供。
后续 `apps/business-agent-langgraph`、Business Agent Adapter、Agent Runtime Host、Workbench 和 Action 回传任务必须依赖该包，而不是在应用内重新定义相同公共消息。

需废弃或迁移的类型如下。
旧 Web Demo 浏览器应用已经删除。
`user_message`、`agent_message`、`system_message` 和 `error_message` 私有消息仍仅作为 Runtime Host Mock HTTP 和 WebSocket 兼容 Fixture 使用。
Web 与 Runtime 的正式链路使用 `runtime-contract` 提供的 `/api/runs`、`/api/actions` 和 `/ws/runs` 契约。

存在语义冲突的类型如下。
历史 `PresentationRequest` 曾作为 UI Compiler Service HTTP 输入描述。
当前平台中它只表示 Runtime 与 Embedded Presentation Pipeline 的进程内稳定契约。
历史 `PresentationResult` 曾作为 UI Compiler Service HTTP 输出描述。
当前平台中它由 Runtime Result 携带，并通过 Runtime Contract 暴露给 Web。
`requestId` 表示当前 Runtime 请求，`presentationRequestId` 表示 Presentation Pipeline 请求。
不得用 `PresentationRequest.requestId` 替代 Runtime 请求 ID，也不得为 UI Compiler Core 建立新的网络调用契约。

## Rules

1. Contract changes require tests and a changeset.
2. Breaking changes require an ADR and major version change.
3. External input is validated at application boundaries.
4. Model output is always treated as external untrusted input.
5. Core validates generated output and protects contract invariants.
6. Stable error codes are part of the public contract.
7. No contract may require a Business Agent to emit compiler-specific routing metadata.
8. Runtime contracts must not expose UI Plan Candidate, UI IR, A2UI, Model Adapter objects, or UI Compiler network client details to Business Agent.
9. A2UI 0.9.1 Profile messages use the wire discriminator `version = "v0.9"`.
10. Complete UI IR, compile results, A2UI Operations, request data, Fallback Markdown, and Surface IDs are not cross-request cache entries in the MVP.
11. Catalog hashes use the shared RFC 8785 plus SHA-256 algorithm and `sha256:<lowercase-hex>` wire representation defined above.
