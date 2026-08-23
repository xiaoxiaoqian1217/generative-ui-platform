# Map Validation Agent

`apps/map-validation-agent` is an independent, dev-only TypeScript LangGraph server for Issue #216.
It is an interaction research instrument, not a SACS replacement or a product Business Agent.

## Boundary

The application loads one versioned scenario input for each run, gives only that input to a generic model prompt, and binds the existing Workbench map and consultation Frontend Tools.
It does not calculate routes, access a business database, execute patrol work, or host server-side business tools.
Frontend Tool calls return to CopilotKit and the Workbench for execution instead of entering a LangGraph `ToolNode`.

The supported client-provided actions are:

- `setLayerVisibility`;
- `focusOn`;
- `highlight`;
- `previewPath`;
- `requestPatrolRouteSelection`.

The scenario loader parses the complete file for tests and human inspection, but the Agent boundary receives only `input`.
The `expected` section is never added to model context.

## Version alignment

`@copilotkit/sdk-js` is fixed at `1.64.1` to match the repository CopilotKit version.
The Agent uses `@langchain/core` `1.2.9`, `@langchain/langgraph` `1.4.12`, `@langchain/langgraph-checkpoint` `1.1.5`, `@langchain/openai` `1.5.10`, `langchain` `1.5.10`, and `@langchain/langgraph-cli` `1.4.3`.
CLI `1.4.3` is pinned because later `1.4.4` and `1.4.5` package incompatible `@hono/node-server` and `@hono/node-ws` peer ranges under this workspace's strict peer policy.
The Runtime bridge uses `@ag-ui/langgraph` `0.0.42`, the same bridge version selected by CopilotKit `1.64.1`.
Although `0.0.43` declares a compatible peer range, its runtime build imports a symbol absent from `@ag-ui/client` `0.0.57`, so this workspace cannot use it safely.
No repository-wide CopilotKit upgrade is part of this work.

## Configuration

Copy `.env.example` to `.env` in this directory and set:

- `LANGSMITH_API_KEY` for the LangGraph development server;
- `MAP_VALIDATION_LLM_API_KEY` for the independent model provider credential;
- `MAP_VALIDATION_LLM_BASE_URL` for the OpenAI-compatible endpoint;
- `MAP_VALIDATION_LLM_MODEL` for the validation model id.

The Agent never reads `A2UI_SECONDARY_LLM_*` or `SCENARIO_DRAFT_LLM_*` as fallbacks.
Model temperature is fixed at `0` for the initial interaction study.

## Local development

Start four processes from separate terminals:

```powershell
pnpm dev:ag-ui-mock
pnpm dev:map-validation-agent
$env:MAP_VALIDATION_AGENT_ENABLED = "true"
$env:MAP_VALIDATION_AGENT_URL = "http://127.0.0.1:8123"
$env:MAP_VALIDATION_AGENT_GRAPH_ID = "map_validation_agent"
pnpm dev:copilot-runtime
pnpm dev:web-workbench
```

The LangGraph server is an independent process at port `8123`.
The existing CopilotKit Runtime only registers its `LangGraphAgent` bridge when all three `MAP_VALIDATION_AGENT_*` registration values are present and enablement is true.
Default Runtime configuration still exposes only AGUIMock and SACS.

Open `/conversation`, select `map-validation-agent`, and run these quick scenarios:

1. `北侧通道真实 Agent 展示`;
2. `候选路线真实 Agent 征询`, selecting route B;
3. `候选顺序反转对照`.

Use Turn Inspect to verify the source, Run lifecycle, Tool Call and Result events, consultation response, map terminal state, and grounded assistant continuation.

## Smoke evidence

Real-provider smoke evidence is intentionally kept separate from deterministic CI fixtures.
Use [smoke/README.md](./smoke/README.md) to record the three required local runs without credentials or private reasoning.
