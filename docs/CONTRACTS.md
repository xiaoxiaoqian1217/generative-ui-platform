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

## UI IR

UI IR is the trusted, framework-neutral intermediate representation produced by Core.
Trusted means that Compiler structure and references are validated; it does not make external business facts authoritative or executable.
It contains only Catalog-approved components, validated Props and Actions, resolved references, normalized layout, source-data bindings, and fallback metadata.
It is not a model response, a frontend component instance, or an external rendering protocol.
The A2UI 0.9.1 Profile compiler maps normalized Props to flat component properties, Bindings to standard JSON Pointer objects, and validated component Action bindings to the versioned `action.event` Envelope.
`id`, `component`, and `action` are reserved A2UI output properties and cannot be supplied as ordinary Catalog Props.

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
AG-UI carries completed or degraded results in `CUSTOM(name = "generative-ui.presentation-result")` with `{ mappingVersion: "1.0", result }`.
Failures without consumable content use `CUSTOM(name = "generative-ui.presentation-error")` with `{ mappingVersion: "1.0", errors }` before `RUN_ERROR`.

## State and Correlation

`threadId` and `runId` are optional protocol correlation fields.
Core may pass through correlation values but must not use them to maintain conversation state or AG-UI Run lifecycle.
The AG-UI Adapter must generate non-empty request-level values when either field is missing and must reuse them for the complete event stream.
The serialized request byte limit is enforced by the application Adapter before deserialization.
The Service or another trusted Core Adapter generates a unique request-level Surface ID.
Surface IDs and complete compile results must not be reused through cross-request caches.

## Package Ownership

The target package ownership is:

- `presentation-contract` owns `AgentContent`, `PresentationRequest`, `PresentationDecision`, `PresentationResult`, `UIPlan`, and `ActionIntent`.
- `compiler-contract` owns `UICompileRequest`, `UICompileResult`, UI IR, compile diagnostics, compile stages, and the A2UI 0.9.1 Profile Schema and mapping contract.
- `component-catalog-schema` owns Catalog, component, Props, Action, and structure Schemas.
- `ag-ui-adapter` owns protocol event mapping and does not own routing or compilation logic.

## Implementation Status

The current planning baseline contains no executable product contracts.
The contracts in this document are the target design for future implementation tasks.
Each executable contract must be introduced with Schema tests, a changeset, and any required versioning decision.

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
