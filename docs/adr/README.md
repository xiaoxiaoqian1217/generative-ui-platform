# Architecture Decision Records

This directory preserves repository architecture decisions and their original context.

An ADR's lifecycle status and its applicability to the current phase are separate dimensions.
An accepted ADR can become Historical after a later phase decision removes its implementation.

## Current phase

[ADR-0028](./0028-use-native-ag-ui-and-retire-compatibility-contracts.md) is the current phase and release-gate decision.

It defines four repository states:

- Active;
- Frozen;
- Removed;
- Historical.

It supersedes ADR-0027 as the current phase decision.
It also supersedes the Runtime Host topology in ADR-0026 while retaining AG-UI as the active Workbench application protocol.

The following ADR-0001 invariants remain active:

- apps may depend on packages;
- packages must not depend on apps.

Safety rules explicitly retained by ADR-0028 also remain active, including the rule against executing model-generated arbitrary HTML or JavaScript.

## Frozen design inputs

Some earlier decisions explain Workbench assets that remain in the repository but are not in the current release gate.

- [ADR-0023](./0023-adopt-controlled-copilotkit-conversation-ui-and-platform-thread-history.md) contains the Conversation-first shell and inspection background.
- [ADR-0024](./0024-adopt-runtime-truth-model-and-safe-command-admission.md) contains deferred safety research for a possible future Runtime phase.
- [ADR-0027](./0027-refocus-current-phase-on-presentation-first-generative-ui.md) contains the previous Presentation-first scope and the rationale for preserving selected Workbench experiments.

These ADRs are Frozen / Historical inputs.
They do not authorize rebuilding removed Runtime, Presentation, Compiler, Catalog, or contract packages.

## Historical ADR index

The following ADRs are retained for decision history but do not describe the current release gate or repository topology:

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

## Numbering and status rules

ADR filenames use `NNNN-short-decision-title.md`.
Numbers are unique and never reused.
The next ADR number is `0029`.

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

Do not silently use an older ADR to override ADR-0028 or current repository instructions.
If a future task needs to reactivate a Historical or Frozen capability, record a new explicit phase decision first.
