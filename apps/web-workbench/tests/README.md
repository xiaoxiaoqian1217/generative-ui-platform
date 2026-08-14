# Test Scope

`unit/` verifies native AG-UI conversation state, safe Markdown, configuration, stable routes, Frontend Tool behavior, A2UI source gating and quick-scenario wiring, and semantic cases.

`e2e/` uses a production build, real Chromium, the thin CopilotKit Runtime, a SACS profile fixture, and the reusable `ag-ui-mock` package.

The current E2E release gate covers:

- the Conversation-first shell;
- native AG-UI Markdown rendering and script safety;
- per-turn Turn Inspect: swimlane timeline, observed order, raw JSON detail, process events without contract artifacts, and large-payload lazy rendering;
- deterministic A2UI activity rendering through the Basic Catalog, repeatability, inspection visibility, and invalid-catalog isolation;
- browser Frontend Tool execution and AG-UI continuation with tool call / result correlation;
- the `locateDevice` MapLibre flow;
- Agent source switching and the explicit SACS Frontend Tool capability gap;
- SACS streaming text, state snapshot/delta, activity snapshot/delta, artifact result, and `RUN_ERROR` handling;
- SACS interrupt / resume with real correlation and durable-run conflict facts;
- cancellation;
- retryable timeout behavior;
- Agent outage and recovery.

The fixtures implement only the Agent protocol surfaces required by these flows.
It does not recreate Runtime, Presentation, or Compiler contracts.
