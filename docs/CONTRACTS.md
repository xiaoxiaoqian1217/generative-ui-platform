# Contracts

## Contract Boundaries

The MVP uses separate contracts for presentation routing and UI compilation.
The Business Agent content contract accepts Markdown or JSON structured data.
Compiler-specific metadata is not part of that contract.

```text
Agent Markdown / JSON
    |
    v
PresentationRequest
    |
    v
PresentationDecision
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
```

## Presentation Request

`PresentationRequest` is the public input to UI Compiler Service.

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

`PresentationDecision` is the validated output of Presentation Router.
It is internal to UI Compiler Service and must not be accepted as trusted model output.

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

`UICompileRequest` is an internal or SDK-level request for content that has already been selected for generative UI.

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
The network request contains only a Catalog ID and version.
UI Compiler Service resolves the Catalog from an authorized source before routing, derives the Router capability summary from that exact Catalog, and injects the complete Catalog into Core.
Core must reject a mismatch between the request Catalog reference and the injected Catalog ID or version.
Core recomputes the injected Catalog content hash and compares it with the trusted Adapter option.
Service separately verifies that the Router capability summary used the same content hash.

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

`PresentationResult` is the public output of UI Compiler Service.
It distinguishes ordinary Markdown from generative UI.

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
`PresentationResult` 是 UI Compiler Service 的规范应用层输出，不依赖 AG-UI 或 CopilotKit。
如果 Agent Runtime Host 选择 AG-UI，它可以把 completed 或 degraded 结果映射到 `CUSTOM(name = "generative-ui.presentation-result")`，并使用 `{ mappingVersion: "1.0", result }`。
没有可消费内容的失败可以映射到 `CUSTOM(name = "generative-ui.presentation-error")`，并在 `RUN_ERROR` 前携带 `{ mappingVersion: "1.0", errors }`。
该可选映射不属于当前 Compiler MVP 的必需接口。

## State and Correlation

`threadId` and `runId` are optional protocol correlation fields.
Core may pass through correlation values but must not use them to maintain conversation state or AG-UI Run lifecycle.
UI Compiler Service 只把这些字段用于当前请求的关联和诊断，不拥有 Business Agent Run。
如果 Agent Runtime Host 需要非空标识符，由该 Agent Runtime Host 按其协议要求生成并复用。
The serialized request byte limit is enforced by the application Adapter before deserialization.
The Service or another trusted Core Adapter generates a unique request-level Surface ID.
Surface IDs and complete compile results must not be reused through cross-request caches.

## Package Ownership

The target package ownership is:

- `presentation-contract` owns `AgentContent`, `PresentationRequest`, `PresentationDecision`, `PresentationResult`, `UIPlan`, and `ActionIntent`.
- `compiler-contract` owns `UICompileRequest`, `UICompileResult`, UI IR, compile diagnostics, compile stages, and the A2UI 0.9.1 Profile Schema and mapping contract.
- `component-catalog-schema` owns Catalog, component, Props, Action, and structure Schemas, plus the shared `computeCatalogContentHash` implementation.
- `ag-ui-adapter` 如果通过单独范围启用，只拥有可选协议事件工具，不拥有展示路由、Business Agent Run 或编译逻辑。

## Implementation Status

`presentation-contract` 现已实现第一组可执行的 `AgentContent`、`PresentationRequest`、`PresentationDecision`、`PresentationResult`、`UIPlan` 和 `ActionIntent` 契约。
`component-catalog-schema` 现已实现第一组可执行的 Catalog、component、Props、Action 和 nesting 契约，以及共享的 RFC 8785 Catalog 内容哈希。
`shared-types` 统一拥有两个包共用的公共 `JsonValue` 和校验结果定义。
`presentation-contract` 只把 `PresentationResult.operations` 校验为非空的可序列化对象数组，不在该包复制 A2UI Profile。
`compiler-contract` 现已实现可执行的编译请求、UI IR、三态编译结果、稳定错误和 A2UI 0.9.1 Profile 契约。
`ag-ui-adapter` 现已实现 SDK 无关的编译请求解析、请求级标识规范化、最小 AG-UI 事件 Schema、PresentationResult Payload 和错误事件映射。
`ag-ui-adapter` 只依赖 Compiler Contract、Presentation Contract、Shared Types 和 Schema 校验依赖，不安装或导入 AG-UI SDK。
UI Compiler Core 现已实现 summary、status、comparison、timeline 和 detail 场景的确定性编译链路，包括输入和 Catalog 校验、基于数据规模、Catalog 描述、Viewport 和 nesting 约束的组件选择、标准 JSON Pointer 绑定、布局规范化、UI IR lowering、A2UI 0.9.1 Profile 编译和 Markdown 降级。
confirmation、form、Action 和 Service 仍是后续限定范围实现任务的目标设计。
协议 Adapter 需要单独范围，不是 Compiler Service 的必需接口。
每个新增可执行契约都必须包含 Schema 测试、changeset 和必要的版本决策。

## Rules

1. Contract changes require tests and a changeset.
2. Breaking changes require an ADR and major version change.
3. External input is validated at application boundaries.
4. Model output is always treated as external untrusted input.
5. Core validates generated output and protects contract invariants.
6. Stable error codes are part of the public contract.
7. No contract may require a Business Agent to emit compiler-specific routing metadata.
8. A2UI 0.9.1 Profile messages use the wire discriminator `version = "v0.9"`.
9. Complete UI IR, compile results, A2UI Operations, request data, Fallback Markdown, and Surface IDs are not cross-request cache entries in the MVP.
10. Catalog hashes use the shared RFC 8785 plus SHA-256 algorithm and `sha256:<lowercase-hex>` wire representation defined above.
