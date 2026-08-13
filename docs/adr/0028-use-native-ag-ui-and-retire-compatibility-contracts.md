# ADR-0028: Workbench directly uses native AG-UI contracts

- **Status:** Accepted
- **Date:** 2026-08-13
- **Scope:** Current repository phase, Web Workbench, AG-UI Adapter, compatibility contracts

## Context

The previous Presentation-first phase introduced application-level abstractions such as `RuntimeRunResult` and `PresentationResult`.
`apps/web-workbench` and `packages/ag-ui-adapter` still depended on three compatibility packages after the Runtime, Compiler, and Presentation implementations had left the active product track.

Those compatibility dependencies obscured the current vertical scenario and encouraged new code to preserve an architecture that was no longer active.
At the same time, some Workbench capabilities remain useful inputs for a later phase and must not be confused with removed architecture.

## State vocabulary

The repository uses four distinct states.

- **Active** means the capability is part of the current release gate and may receive focused implementation work.
- **Frozen** means the capability remains in the repository for later evaluation, but must not gain new platform abstractions or old contract dependencies.
- **Removed** means the implementation is no longer present and must not be recreated without an explicit architecture-stage decision.
- **Historical** means the document or ADR is retained as decision history, but is not a current implementation specification or release gate.

Frozen does not mean deprecated or safe to delete.
Removed does not mean that historical documentation should be erased.

## Decision

### Active track

The only active product track is:

```text
Business Agent or AGUIMock
-> AG-UI
-> CopilotKit
-> Web Workbench
-> Controlled UI or Frontend Tool
```

The first vertical scenario is `locateDevice`.
The Agent requests the browser-side `locateDevice` tool, Workbench updates the MapLibre workspace, and the tool result continues the same AG-UI run.

The active modules are:

```text
apps/web-workbench
packages/ag-ui-mock
packages/ag-ui-adapter
packages/shared-types
```

Workbench uses CopilotKit and native AG-UI messages directly.
AG-UI Adapter uses `@ag-ui/core` as its protocol source of truth.
`packages/shared-types` remains limited to types that are genuinely shared by active modules.

### Frozen Workbench capabilities

The following capabilities are preserved but are not part of the current release gate:

- the Playground, Inspect, Cases, Catalog, Scenarios, and Settings routes;
- the local A2UI reducer, controlled renderer, raw viewer, and component registry;
- the accepted Workbench shell and inspection prototype baselines;
- case-library and presentation-inspection support that can operate without removed contracts.

Frozen code may receive compatibility fixes required to keep the repository healthy.
It must not be expanded into an A2UI platform, Component Catalog platform, Theme platform, Runtime platform, Presentation Pipeline, or UI Compiler without a new real scenario and an explicit phase decision.

### Removed compatibility contracts

The following packages are removed:

```text
packages/compiler-contract
packages/presentation-contract
packages/runtime-contract
```

Workbench and AG-UI Adapter must not depend on or recreate `RuntimeRunResult`, `PresentationResult`, `CompilerResult`, or equivalent application wrappers around native AG-UI messages.

### Removed previous-stage implementation

The following implementation remains removed:

- `apps/agent-runtime-host`;
- `apps/business-agent-langgraph`;
- `packages/business-agent-adapter`;
- `packages/component-catalog-schema`;
- `packages/presentation-pipeline`;
- `packages/ui-compiler-core`;
- Runtime Platform scripts and workspace architecture tests.

The recovery point is `archive/pre-scope-reset-2026-08-13` at commit `c33504db91614420c2ccdf26a8c707f61d659065`.
That recovery point is historical evidence, not permission to restore the architecture automatically.

### Historical documentation

Compiler, Presentation, and Runtime Platform specifications remain in `docs/` as historical design records.
They do not describe the current repository layout or release gate.
When they conflict with this ADR, this ADR and the current root documentation take precedence.

## Relationship to earlier ADRs

This ADR supersedes ADR-0027 as the current phase and release-gate decision.
It supersedes the Runtime Host topology in ADR-0026 while retaining AG-UI as the active Workbench application protocol.
Earlier ADRs remain historical records and may still explain a frozen design, but they do not authorize recreation of removed modules.

ADR-0001's package dependency direction remains active: apps may depend on packages, and packages must not depend on apps.
The existing safety rule against executing model-generated arbitrary HTML or JavaScript also remains active.

## Consequences

- The current code path is smaller and aligned with CopilotKit and AG-UI terminology.
- The three compatibility packages no longer define a parallel application protocol.
- Frozen Workbench experiments remain available for a later evidence-driven phase.
- Historical documents require explicit status labels so a new contributor does not treat them as current instructions.
- A future Compiler, Presentation, Runtime, A2UI, Catalog, or Theme phase requires a new decision based on a real scenario.
