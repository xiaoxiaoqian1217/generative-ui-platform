# Architecture Decision Records

This directory preserves repository architecture decisions and their original context.

An ADR's lifecycle status and its applicability to the current phase are separate dimensions.
An accepted ADR can become Historical after a later phase decision removes its implementation.

## Current phase

[ADR-0029](./0029-adopt-thin-copilotkit-runtime-and-activate-a2ui-next-phase.md) is the current phase decision.

It accepts two near-term steps:

```text
#207 Thin CopilotKit Runtime integration boundary
  ↓
#200 Real single-agent-chat-server interoperability
  ↓
A2UI Renderer / Catalog / Theme
```

The thin CopilotKit Runtime is Supporting Infrastructure only.
It must not restore the removed Runtime Platform.

ADR-0029 also reactivates focused A2UI work after the first Controlled UI vertical slice proved AG-UI + Frontend Tool + MapLibre interaction.

[ADR-0028](./0028-use-native-ag-ui-and-retire-compatibility-contracts.md) is partially superseded by ADR-0029.
ADR-0028 remains authoritative for:

- native AG-UI contracts instead of deleted compatibility contracts;
- Active / Frozen / Removed / Historical vocabulary;
- removed Runtime / Compiler / Presentation implementations;
- Monorepo dependency direction;
- the safety rule against executing arbitrary model-generated HTML or JavaScript.

## State vocabulary

The repository continues to use the four applicability states introduced by ADR-0028:

- Active;
- Frozen;
- Removed;
- Historical.

The following ADR-0001 invariants remain active:

- apps may depend on packages;
- packages must not depend on apps.

## Frozen design inputs

Some earlier decisions explain Workbench assets that remain in the repository but are not automatically part of the current release gate.

- [ADR-0023](./0023-adopt-controlled-copilotkit-conversation-ui-and-platform-thread-history.md) contains the Conversation-first shell and inspection background.
- [ADR-0024](./0024-adopt-runtime-truth-model-and-safe-command-admission.md) contains deferred safety research for a possible future Runtime Platform phase.
- [ADR-0027](./0027-refocus-current-phase-on-presentation-first-generative-ui.md) contains the previous Presentation-first scope and the rationale for preserving selected Workbench experiments.
- [ADR-0028](./0028-use-native-ag-ui-and-retire-compatibility-contracts.md) contains the native AG-UI scope reset and removed-contract decision that ADR-0029 retains except where explicitly superseded.

These decisions do not authorize rebuilding removed Runtime, Presentation, Compiler, or compatibility-contract packages.

## Historical ADR index

The following ADRs are retained for decision history but do not by themselves describe the current release gate or repository topology:

| ADR | Historical subject |
|---|---|
| [0001](./0001-monorepo-and-boundaries.md) | Monorepo and dependency boundaries |
| [0002](./0002-ui-compile-result-states.md) | UI compile result states |
| [0003](./0003-exclude-interaction-gateway-from-compiler-mvp.md) | Interaction Gateway exclusion |
| [0004](./0004-domain-components-through-catalog.md) | Domain components through Catalog |
| [0005](./0005-route-markdown-before-ui-compilation.md) | Markdown routing before compilation |
| [0006](./0006-support-structured-agent-content.md) | Structured Agent content |
| [0007](./0007-compile-data-and-catalog-injection.md) | Compile data and Catalog injection |
| [0008](./0008-a2ui-0.9.1-profile.md) | A2UI 0.9.1 profile |
| [0009](./0009-markdown-fallback-and-surface-lifecycle.md) | Markdown fallback and Surface lifecycle |
| [0010](./0010-ag-ui-event-mapping.md) | AG-UI event mapping for old Presentation results |
| [0011](./0011-cache-compiled-templates-only.md) | Compiled template caching |
| [0012](./0012-typebox-and-ajv-schema-validation.md) | TypeBox and Ajv validation |
| [0013](./0013-move-ag-ui-run-lifecycle-outside-compiler-service.md) | AG-UI lifecycle outside Compiler Service |
| [0014](./0014-markdown-sanitizer.md) | Markdown sanitizer |
| [0015](./0015-presentation-router-and-model-adapter.md) | Presentation Router and Model Adapter |
| [0016](./0016-fastify-http-lifecycle.md) | Fastify Compiler HTTP lifecycle |
| [0017](./0017-http-observability-and-sensitive-data.md) | HTTP observability and sensitive data |
| [0018](./0018-expand-repository-scope-to-platform-validation-environment.md) | Runtime Platform validation environment |
| [0019](./0019-embed-presentation-pipeline-in-agent-runtime-host.md) | Presentation Pipeline in Runtime Host |
| [0020](./0020-workbench-runtime-read-contract-and-copilotkit-headless.md) | Workbench Runtime read contract |
| [0021](./0021-retire-runnable-fixture-provider-mode.md) | Runnable fixture provider retirement |
| [0022](./0022-support-http-sse-and-websocket-business-agent-adapters.md) | Business Agent transports |
| [0023](./0023-adopt-controlled-copilotkit-conversation-ui-and-platform-thread-history.md) | Controlled CopilotKit conversation UI and history |
| [0024](./0024-adopt-runtime-truth-model-and-safe-command-admission.md) | Runtime Truth and command admission |
| [0025](./0025-adopt-two-external-integration-modes-and-layered-platform-capabilities.md) | Two external integration modes |
| [0026](./0026-adopt-ag-ui-as-workbench-runtime-application-protocol.md) | AG-UI as the old Workbench to Runtime Host protocol |
| [0027](./0027-refocus-current-phase-on-presentation-first-generative-ui.md) | Presentation-first scope reset |
| [0028](./0028-use-native-ag-ui-and-retire-compatibility-contracts.md) | Native AG-UI scope reset and compatibility contract removal |

## Current decision

| ADR | Current subject |
|---|---|
| [0029](./0029-adopt-thin-copilotkit-runtime-and-activate-a2ui-next-phase.md) | Thin CopilotKit Runtime integration boundary and A2UI next phase |

## Numbering and status rules

ADR filenames use `NNNN-short-decision-title.md`.
Numbers are unique and never reused.
The next ADR number is `0030`.

Allowed lifecycle states include:

- Proposed;
- Accepted;
- Rejected;
- Deprecated;
- Superseded by ADR-NNNN;
- Partially superseded by ADR-NNNN.

Active, Frozen, Removed, and Historical describe current applicability, not lifecycle status.

When a new ADR changes an earlier decision:

1. state the superseded scope in the new ADR;
2. update the old ADR or this index with the relationship;
3. update current requirements, architecture, and Agent rules;
4. preserve the old document as historical evidence.

## Conflict rule

Do not silently use an older ADR to override ADR-0029 or current repository instructions.
If a future task needs to reactivate a Historical or Frozen capability beyond the scope explicitly accepted by ADR-0029, record a new explicit phase decision first.
