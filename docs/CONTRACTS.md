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

## UI Plan

`UIPlan` is a framework-neutral semantic plan for generative UI.
It may contain component suggestions, data, layout intent, and Action descriptions.
It must not contain executable code, DOM nodes, framework component instances, or provider-specific model response objects.

Every suggested component and Action is provisional.
UI Compiler Core performs the authoritative Catalog and Schema validation.

## Compile Request

`UICompileRequest` is an internal or SDK-level request for content that has already been selected for generative UI.

```ts
export interface UICompileRequest {
  requestId: string;
  threadId?: string;
  runId?: string;
  plan: UIPlan;
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
    userPreferences?: Record<string, unknown>;
  };
}
```

Core assumes that the caller has already selected generative UI.
Core must not use this request to decide between Markdown and generative UI.
For structured Agent content, UI Compiler Service supplies `fallbackMarkdown` from the request or from deterministic serialization.

## Compile Result

`UICompileResult` remains a discriminated union with complete success, degraded success, and complete failure branches.
Only complete success contains A2UI Operations.
Only degraded success contains a Fallback.
Every result contains request correlation and compile metadata.

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

## State and Correlation

`threadId` and `runId` are optional protocol correlation fields.
Core may pass through correlation values but must not use them to maintain conversation state or AG-UI Run lifecycle.
The serialized request byte limit is enforced by the application Adapter before deserialization.

## Package Ownership

The target package ownership is:

- `presentation-contract` owns `AgentContent`, `PresentationRequest`, `PresentationDecision`, `PresentationResult`, `UIPlan`, and `ActionIntent`.
- `compiler-contract` owns `UICompileRequest`, `UICompileResult`, UI IR, compile diagnostics, and compile stages.
- `component-catalog-schema` owns Catalog, component, Props, Action, and structure Schemas.
- `ag-ui-adapter` owns protocol event mapping and does not own routing or compilation logic.

## Migration Status

The executable contracts currently reflect the pre-ADR-0005 shape.
They remain the executable source of truth for the current code until the contract migration is implemented.
The contract migration must include Schema updates, tests, a changeset, and any required major version changes.

## Rules

1. Contract changes require tests and a changeset.
2. Breaking changes require an ADR and major version change.
3. External input is validated at application boundaries.
4. Model output is always treated as external untrusted input.
5. Core validates generated output and protects contract invariants.
6. Stable error codes are part of the public contract.
7. No contract may require a Business Agent to emit compiler-specific routing metadata.
