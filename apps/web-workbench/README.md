# Web Workbench

## Current role

`apps/web-workbench` is the active product and integration workbench.

Its current release gate is the vertical AG-UI Frontend Tool flow:

```text
Business Agent or AGUIMock
-> AG-UI
-> CopilotKit
-> Web Workbench
-> useFrontendTool("locateDevice")
-> MapLibre
-> AG-UI tool result
```

Workbench consumes native AG-UI messages through CopilotKit.
It does not wrap the run in `RuntimeRunResult`, `PresentationResult`, or another application protocol.

## Current behavior

The active Conversation route supports:

- native AG-UI user and assistant messages;
- safe Markdown rendering for assistant text;
- CopilotKit `useFrontendTool` registration;
- the `locateDevice` browser tool;
- MapLibre device selection, map movement, marker highlighting, and a controlled `DeviceCard`;
- per-turn AG-UI inspection;
- cancellation, retryable timeout handling, agent outage handling, and recovery.

The Agent only sees the stable `locateDevice` tool capability.
MapLibre and device-selection state remain browser-side implementation details.

Workbench never executes model-generated arbitrary HTML or JavaScript.

## Frozen capabilities

The following capabilities remain in the repository for later evaluation:

- Playground, Inspect, Cases, Catalog, Scenarios, and Settings routes;
- the local A2UI reducer and controlled renderer;
- A2UI raw inspection;
- the controlled component registry;
- the accepted Conversation-first shell and inspection prototype baselines;
- semantic case-library support.

These capabilities are frozen rather than removed.
They may receive compatibility maintenance, but they are not part of the current release gate.
Do not expand them into an A2UI, Catalog, Theme, Runtime, Presentation, or Compiler platform without a new real scenario and an explicit phase decision.

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
pnpm dev:web-workbench
```

To supply an Agent origin at build time:

```bash
VITE_AGENT_URL=http://127.0.0.1:4800 pnpm dev:web-workbench
```

On PowerShell:

```powershell
$env:VITE_AGENT_URL = "http://127.0.0.1:4800"
pnpm dev:web-workbench
```

## Run the reusable AG-UI mock

Build and start the AG-UI Mock with all scenarios in a separate terminal:

```bash
pnpm --filter @generative-ui/ag-ui-mock build
pnpm --filter @generative-ui/ag-ui-mock exec ag-ui-mock --port 4800
```

Set the Workbench Agent URL to `http://127.0.0.1:4800`.
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

The browser E2E suite covers native AG-UI Markdown, inspection, Frontend Tool continuation, the real `locateDevice` map flow, cancellation, retry, outage, and recovery.

## Documentation status

- [ADR-0028](../../docs/adr/0028-use-native-ag-ui-and-retire-compatibility-contracts.md) is the current phase decision.
- [Workbench prototype baselines](../../docs/workbench/PROTOTYPE_BASELINES.md) are frozen design inputs.
- [The old Workbench SRS](../../docs/WEB_WORKBENCH_SRS.md) is historical and is not the current release gate.
