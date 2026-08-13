# Test Scope

`unit/` verifies native AG-UI conversation state, safe Markdown, configuration, stable routes, Frontend Tool behavior, frozen A2UI safety, and semantic cases.

`e2e/` uses a production build, real Chromium, an AG-UI fixture, and the reusable `ag-ui-mock` package.

The current E2E release gate covers:

- the Conversation-first shell;
- native AG-UI Markdown rendering and script safety;
- per-turn AG-UI inspection;
- frozen A2UI requests remaining normal Agent text;
- browser Frontend Tool execution and AG-UI continuation;
- the `locateDevice` MapLibre flow;
- cancellation;
- retryable timeout behavior;
- Agent outage and recovery.

The fixture implements only the Agent protocol surface required by these flows.
It does not recreate Runtime, Presentation, or Compiler contracts.
