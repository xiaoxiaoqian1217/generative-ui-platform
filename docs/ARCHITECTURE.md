# Architecture

## 1. Product Architecture

Generative UI Compiler is an Agent presentation infrastructure layer.
The Business Agent output contract contains only Markdown.
Presentation mode, presentation intent, structured data, and UI plans are not part of that contract.

The system first decides whether the Markdown should remain Markdown or become a controlled generative UI.
Only content selected for generative UI enters UI Compiler Core.

```text
Business Agent / LLM Agent
returns Markdown

        |
        v

UI Compiler Service
        |
        v

Presentation Router
        |
        +---- markdown ----> Markdown Sanitizer ----> Markdown Result
        |
        +---- generative-ui
                    |
                    v
              Validated UI Plan
                    |
                    v
              UI Compiler Core
                    |
                    v
              A2UI / Fallback

        |
        v

Frontend Runtime Renderer
```

The service does not manage business Agent execution, Agent routing, workflow state, or business logic.

## 2. Current MVP Modules

### UI Compiler Service

Responsibilities:

- Provide HTTP and AG-UI interfaces.
- Receive Markdown produced by an external Business Agent.
- Accept the original user message and presentation context when the caller can provide them.
- Sanitize Markdown before returning it to a frontend.
- Invoke Presentation Router.
- Return ordinary content as a Markdown result without invoking UI Compiler Core.
- Pass a validated UI plan to UI Compiler Core when generative UI is selected.
- Manage request lifecycle, cancellation, timeout, error mapping, and observability.

The service is the application composition root.
It selects and injects the concrete Model Adapter.
It is not a Business Agent and does not perform business reasoning, business tool calls, or Agent orchestration.

### Presentation Router

Presentation Router decides how an Agent response should be presented.
Its result is a discriminated union:

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

The router may use deterministic shortcuts for unambiguous cases.
When semantic analysis is required, it uses a replaceable Model Adapter.
One model call should produce both the presentation decision and the UI plan so the system does not pay for separate classification and planning calls.

The decision should consider the original user message when it is available.
Markdown alone is accepted, but the system must treat a decision made without user context as lower confidence.

If routing or model analysis fails, the safe default is sanitized Markdown.

### Model Adapter

The Model Adapter is outside UI Compiler Core.
It is responsible for:

- Calling a concrete model provider.
- Producing structured output that matches `PresentationDecision`.
- Enforcing model timeout and retry limits.
- Mapping provider errors to stable error codes.
- Preventing provider-specific response types from leaking into Core.

Model output is untrusted input.
It must not be executed and must pass contract, Catalog, Props, Action, and structural validation before it can become A2UI.

### UI Compiler Core

Responsibilities:

- Validate a generative UI compile request and UI plan.
- Load the requested Component Catalog.
- Resolve and validate component selections against the Catalog.
- Build framework-neutral UI IR.
- Compile UI IR to A2UI.
- Validate UI IR and A2UI.
- Produce deterministic fallback and diagnostics.

Core assumes that its caller has already selected generative UI.
Core does not decide between Markdown and generative UI.
Core does not call a model provider and does not depend on a model SDK.
Core must remain independent from:

- Frontend frameworks.
- Network services.
- Model providers.
- Specific Agent frameworks.
- Business domains.

### Frontend Runtime

The external Frontend Runtime consumes a presentation result.
It sends a Markdown result to its Markdown Renderer and a generative UI result to its A2UI Renderer and Component Registry.

## 3. Contract Flow

```text
Agent Markdown
        |
        v
PresentationRequest
        |
        v
PresentationDecision
        |
        +---- markdown ------> PresentationResult.markdown
        |
        +---- generative-ui -> UICompileRequest
                                  |
                                  v
                            UI Compiler Core
                                  |
                                  v
                         PresentationResult.generative-ui
```

`PresentationRequest` describes raw Markdown plus optional user and rendering context.
`PresentationDecision` is the validated output of Presentation Router.
A Model Adapter may produce an untrusted candidate decision, but that candidate is not a `PresentationDecision` until it passes Schema validation.
`UICompileRequest` describes an already selected and validated generative UI plan.
`PresentationResult` is the public service result and distinguishes Markdown from generative UI.

## 4. Component Extension Model

Generative UI Compiler does not automatically create arbitrary business UI components.
Business-specific component declarations are provided through Component Catalog.
Their real frontend implementations are provided through an external Component Registry.

```text
Component Catalog

+-- Common Components
|   +-- Card
|   +-- Table
|   +-- Form
|
+-- Domain Components
    +-- GISMapPanel
    +-- DeviceControlPanel
    +-- TaskManagementPanel

Component type in A2UI
        |
        v
External Component Registry
        |
        v
Real frontend component
```

The model may suggest only component types declared by the active Catalog.
UI Compiler Core performs the authoritative selection and validation.

## 5. Dependency Direction

```text
ui-compiler-service
        |
        +---- model-adapter
        |
        +---- markdown-sanitizer
        |
        +---- ui-compiler-core
                    |
                    v
             contract packages
```

UI Compiler Core must not depend on UI Compiler Service or a concrete Model Adapter.

## 6. Future Platform Extension: Interaction Gateway

This section is a non-normative roadmap and is not part of the current MVP.
Interaction Gateway may be considered when the product needs:

- Multiple Agent routing.
- Agent collaboration.
- Task or session state management.
- Human approval workflows.

```text
Frontend
    |
    v
Interaction Gateway
    |
    +---- Business Agents
    |
    +---- UI Compiler Service
```

Starting Gateway design requires an explicit scope-change issue and a new ADR.
That ADR must decide responsibilities, dependency direction, contracts, protocols, deployment boundaries, and acceptance criteria.
