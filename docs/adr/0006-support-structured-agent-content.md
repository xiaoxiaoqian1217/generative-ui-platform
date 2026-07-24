# ADR-0006: Support structured Agent content

- **Status:** Accepted
- **Date:** 2026-07-24

## Context

ADR-0005 assumed that a Business Agent provides only Markdown.
Some Business Agents can also return JSON structured data.
Rejecting that data or forcing the Agent to convert it to Markdown would discard useful structure and reduce the quality of UI planning.

Supporting structured content must not reintroduce the assumption that a Business Agent understands Compiler-specific presentation modes, intents, component types, or UI plans.

## Decision

The Business Agent content contract accepts a discriminated union of Markdown and JSON structured data.

```ts
type AgentContent =
  | {
      contentType: "markdown";
      markdown: string;
    }
  | {
      contentType: "structured-data";
      data: JsonValue;
      fallbackMarkdown?: string;
    };
```

Business Agents must not be required to provide `presentationMode`, `presentationIntent`, component selections, or a UI plan.

UI Compiler Service must validate structured data before passing it to Presentation Router or a Model Adapter.
Validation includes JSON compatibility, configured nesting depth, configured item count, and request size.

Presentation Router handles both content variants.
It returns either a simple Markdown presentation decision or a generative UI decision with a UI plan.
The router may use deterministic rules or a replaceable Model Adapter.

When structured data does not become generative UI, UI Compiler Service must produce a deterministic and safe Markdown representation.
The service uses `fallbackMarkdown` when one is present and valid.
The service must reject an empty fallback and sanitize Markdown before returning or passing it to a compilation fallback.
Otherwise it performs stable JSON-to-Markdown serialization.
Serialization must not execute input, silently truncate data, or silently summarize business facts.

When structured data becomes generative UI, the same UI Plan, Catalog, Props, Action, UI IR, and A2UI validation rules from ADR-0005 apply.
UI Compiler Core remains independent from the source content format.
Core receives only an already selected UI plan and fallback Markdown.

If routing, model analysis, UI Plan validation, or compilation fails, the service returns sanitized Markdown or deterministic Markdown serialization when valid source content is available.

## Consequences

- `PresentationRequest` changes from a Markdown-only shape to an `AgentContent` discriminated union.
- Structured data retains its shape during presentation analysis and UI planning.
- Markdown and structured data share the same Presentation Router and Model Adapter seam.
- Structured Data Validator and Structured Data Serializer become explicit Service modules.
- Frontends still consume the same `PresentationResult` union and do not need a separate raw JSON rendering path.
- Resource limit tests must cover structured Agent content before model invocation.
- The executable presentation contract requires a breaking migration with Schema tests and a changeset.

## Supersession

This ADR supersedes only the Markdown-only input assumption in ADR-0005.
ADR-0005 remains authoritative for presentation routing, model isolation, UI compilation, validation, and fallback.
