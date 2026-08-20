# Test Scope

`unit/` verifies native AG-UI conversation state, safe Markdown, configuration, stable routes, Frontend Tool behavior, A2UI source gating and quick-scenario wiring, platform A2UI catalog composition and its definition import boundary, the platform UI components, and semantic cases.

The retired Agent-facing `locateDevice` contract remains only as an isolated characterization of its standard call / result chain, while production Agent capability advertises the four map-domain tools used by the patrol-plan scenario.

`e2e/` uses a production build, real Chromium, the thin CopilotKit Runtime, a SACS profile fixture, and the reusable `ag-ui-mock` package.

The current E2E release gate covers:

- the Conversation-first shell;
- native AG-UI Markdown rendering and script safety;
- per-turn Turn Inspect: swimlane timeline, observed order, raw JSON detail, process events without contract artifacts, and large-payload lazy rendering;
- deterministic A2UI activity rendering through the Basic Catalog, repeatability, inspection visibility, and invalid-catalog isolation;
- Platform Catalog scenario rendering: `Metric` / `StatusBadge` / `InfoRow` composed with Basic components through the merged catalog;
- browser Frontend Tool execution and AG-UI continuation with standard tool call / result correlation;
- the migrated locate flow through `focusOn` and `highlight`;
- the patrol-plan scenario through `setLayerVisibility -> focusOn -> highlight -> previewPath -> Assistant result` on one persistent MapLibre surface;
- Agent source switching and the explicit SACS Frontend Tool capability gap;
- SACS streaming text, state snapshot/delta, activity snapshot/delta, artifact result, and `RUN_ERROR` handling;
- SACS interrupt / resume with real correlation and durable-run conflict facts;
- cancellation;
- retryable timeout behavior;
- Agent outage and recovery.

The fixtures implement only the Agent protocol surfaces required by these flows.
It does not recreate Runtime, Presentation, or Compiler contracts.
