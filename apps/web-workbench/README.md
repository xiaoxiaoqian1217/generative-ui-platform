# Web Workbench

## Current role

`apps/web-workbench` is the active product and integration workbench.

Its current release gate uses one thin CopilotKit Runtime boundary:

```text
Web Workbench
-> thin CopilotKit Runtime
-> AGUIMock or single-agent-chat-server
```

Only the AGUIMock source advertises the browser `locateDevice` Frontend Tool and drives MapLibre plus `DeviceCard`.
The SACS source streams Business Agent text, state, activity, and structured results without client-provided Frontend Tools.

Workbench consumes native AG-UI messages through CopilotKit.
It does not wrap the run in `RuntimeRunResult`, `PresentationResult`, or another application protocol.

## Current behavior

The active Conversation route supports:

- native AG-UI user and assistant messages;
- fixed A2UI activity rendering through the merged platform catalog (CopilotKit Vue Basic Catalog plus the `Metric` / `StatusBadge` / `InfoRow` platform components);
- deterministic A2UI inspection-summary, platform-catalog, and invalid-catalog fixtures from AGUIMock;
- safe Markdown rendering for assistant text;
- CopilotKit `useFrontendTool` registration;
- the `locateDevice` browser tool;
- MapLibre device selection, map movement, marker highlighting, and a controlled `DeviceCard`;
- per-turn Turn Inspect: a swimlane timeline of the observations the Workbench really saw (Workbench / CopilotKit Runtime / Agent / Frontend Tool lanes appear only when they actually occurred) plus on-demand raw JSON detail;
- SACS interrupt / resume: an interrupted run renders an in-turn confirmation card, and the user's answer is sent back as a native AG-UI `resume` entry;
- cancellation, retryable timeout handling, agent outage handling, and recovery;
- explicit selection between AGUIMock and `single-agent-chat-server`.

Turn Inspect records only observable public facts in observed order; it does not infer server-side sequences, and it does not create a Runtime Repository, Recovery Platform, or a private diagnostic protocol.

AGUIMock sees the stable `locateDevice` tool capability.
SACS receives no client-provided tools because its current profile does not support them.
MapLibre and device-selection state remain browser-side implementation details.

Workbench never executes model-generated arbitrary HTML or JavaScript.

## Frozen capabilities

The following capabilities remain in the repository for later evaluation:

- Playground, Inspect, Cases, Catalog, Scenarios, and Settings routes;
- the accepted Conversation-first shell and inspection prototype baselines;
- semantic case-library support.

These capabilities are frozen rather than removed.
They may receive compatibility maintenance, but they are not part of the current release gate.
The focused A2UI Renderer MVP is active under ADR-0029, while custom catalogs, theme work, dynamic A2UI, and any Runtime, Presentation, or Compiler platform remain outside this slice.

## Removed dependencies

Workbench no longer depends on:

- `@generative-ui/compiler-contract`;
- `@generative-ui/presentation-contract`;
- `@generative-ui/runtime-contract`.

The old Runtime Host, Presentation Pipeline, UI Compiler, and Business Agent Adapter implementations are not part of the current repository.

## Configuration

The default Agent origin is the Workbench page origin.

The build-time configuration keys are:

- `VITE_AGENT_URL`;
- `VITE_WORKBENCH_ENVIRONMENT`.

The page may provide an equivalent deployment-time configuration before the application starts:

```js
window.__GEN_UI_WORKBENCH_CONFIG__ = {
  agentUrl: "https://agent.example.test",
  environment: "test",
};
```

`agentUrl` must be an `http` or `https` origin without embedded credentials.
Workbench gives deployment-time configuration priority over build-time configuration, then falls back to the page origin.

Local Settings can override the Agent URL, request timeout, and debug-detail preference in the browser.

## Local development

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

This starts Web Workbench, the reusable AG-UI Mock, and the thin CopilotKit Runtime together.
The Vite development server proxies same-origin `/api/copilotkit` requests to `http://127.0.0.1:4801`.
No Settings override is required for the default Mock flow.

Production deployments should expose `/api/copilotkit` on the Workbench origin through a reverse proxy.
The local Vite proxy already provides that same-origin path.

## Run integration services separately

To run the three development processes in separate terminals:

```bash
pnpm dev:ag-ui-mock
pnpm dev:copilot-runtime
pnpm dev:web-workbench
```

The default same-origin configuration uses the Vite proxy to reach the Runtime.
The Runtime registers AGUIMock and SACS at the same time; the Workbench selector chooses one Agent identity for each conversation.
SACS credentials remain in the Runtime process and are never browser configuration.
See [`apps/copilot-runtime/README.md`](../copilot-runtime/README.md) for its environment variables and real-service smoke test.
Enter `定位无人机 01` in Conversation.

The mock requests `locateDevice({ deviceId: "01" })`.
Workbench updates the GIS workspace and returns the Frontend Tool result to the Agent through the same AG-UI run.

## Routes

The stable routes are:

- `/conversation`;
- `/playground`;
- `/inspect`;
- `/cases`;
- `/catalog`;
- `/scenarios`;
- `/settings`.

Unknown paths safely fall back to `/conversation`.
Only Conversation and its `locateDevice` flow are in the current release gate.

## Verification

From the repository root:

```bash
pnpm lint
pnpm typecheck
pnpm --filter @generative-ui/web-workbench test
pnpm --filter @generative-ui/ag-ui-adapter test
pnpm --filter @generative-ui/ag-ui-mock test
pnpm test:e2e:web-workbench
pnpm build
pnpm docs:check
```

The browser E2E suite covers native AG-UI Markdown, the Turn Inspect swimlane timeline and raw JSON detail, Frontend Tool continuation, the real `locateDevice` map flow, SACS profile interoperability (state, activity, artifact, bounded `RUN_ERROR`, interrupt / resume, durable-run conflict facts), large-payload lazy rendering, cancellation, retry, outage, and recovery.

## Documentation status

- [ADR-0029](../../docs/adr/0029-adopt-thin-copilotkit-runtime-and-activate-a2ui-next-phase.md) is the current Agent integration decision.
- [ADR-0028](../../docs/adr/0028-use-native-ag-ui-and-retire-compatibility-contracts.md) continues to constrain native AG-UI and removed compatibility contracts.
- [Workbench prototype baselines](../../docs/workbench/PROTOTYPE_BASELINES.md) are frozen design inputs.
- The old Workbench SRS is historical and is not the current release gate; it was removed from the main docs tree and can be consulted via Git history or `archive/pre-scope-reset-2026-08-13`.
