# Thin CopilotKit Runtime

## Responsibility

`apps/copilot-runtime` is the Workbench Agent integration boundary accepted by ADR-0029.
It always registers the AGUIMock and `single-agent-chat-server` Business Agent sources under stable Agent identities and proxies native AG-UI streams.
When explicit dev configuration is complete, it also registers the independent `map-validation-agent` through the official `LangGraphAgent` bridge.
For controlled Dynamic A2UI it additionally hosts the narrow presentation wiring accepted by ADR-0030: a thin deterministic Presentation Policy, the Secondary Presentation LLM wiring based on `@ag-ui/a2ui-toolkit`, and the stitching of generation results into the AG-UI event stream.
It does not own product runtime state, general presentation routing, orchestration, or durable history.

## Agent identities

- `ag-ui-mock` is the deterministic Frontend Tool and failure-scenario fixture.
- `single-agent-chat-server` is the real Business Agent profile.
- `map-validation-agent` is a dev-only real LLM interaction validation source and is disabled by default.

Both Agents are registered concurrently.
The Workbench chooses one identity for a conversation.
The SACS profile does not support client-provided Frontend Tools, and the Runtime does not emulate them.
The validation source advertises client-provided Frontend Tools and streaming only when its independent LangGraph server is explicitly registered.

## Dynamic A2UI presentation policy

The `ag-ui-mock` Agent runs behind a thin AG-UI middleware (`DynamicA2uiPresentationPolicy`) that implements the Issue #210 minimal policy subset:

1. a run that already emits a valid `a2ui-surface` activity passes through untouched after its operations and Catalog boundary are validated (Native A2UI Passthrough);
2. an explicit `requestedMode: "dynamic"` arriving through AG-UI `forwardedProps` selects a valid `inspection-summary` `ACTIVITY_SNAPSHOT.content` and triggers one Secondary LLM generation at the successful `RUN_FINISHED` lifecycle checkpoint, driven by `runA2UIGenerationWithRecovery` and validated against the shared Final Catalog schema from `@generative-ui/a2ui-catalog`;
3. the validated operations are stitched into the current run as an `a2ui-surface` ACTIVITY_SNAPSHOT before RUN_FINISHED;
4. when the explicit mode is not executable (missing client A2UI capability, missing Secondary LLM configuration, non-structured content, or generation failure), the original content is preserved and an explicit `a2ui-generation-error` activity is emitted instead (Plain Content Fallback).

The policy never inspects natural language, never lets the Secondary LLM decide whether to run, and only applies to `ag-ui-mock`; the SACS Agent has no Dynamic A2UI path while its content is not yet integrated.
Tests inject a deterministic fake through the `invokeSubagent` option of `createRuntimeHandler`; no real model call happens in CI.

## Configuration

Copy `.env.example` values into the process environment as needed.
The local `dev` and `start` commands load `apps/copilot-runtime/.env` when it exists, while already exported deployment variables retain precedence.
The local defaults are AGUIMock at `http://127.0.0.1:4800`, SACS at `http://127.0.0.1:3000/ag-ui`, and the Runtime at `http://127.0.0.1:4801/api/copilotkit`.

`SACS_AG_UI_SERVICE_KEY` becomes the server-side `Authorization: Bearer` credential.
`SACS_OPENWEBUI_USER_JWT_SECRET` must equal the SACS `OPENWEBUI_USER_JWT_SECRET` value.
`SACS_PRINCIPAL_ID` is the stable identity for this single-user Workbench deployment, and `SACS_PRINCIPAL_ROLE` defaults to `user`.
The Runtime signs a new five-minute `X-OpenWebUI-User-Jwt` for every SACS request.
The static `SACS_OPENWEBUI_USER_JWT` configuration is rejected because it necessarily expires while the application is running.
No credential or signed JWT is returned by the Runtime `/info` response or sent to the browser.
The standalone Runtime does not emit permissive CORS headers.
Deploy it behind the Workbench same-origin reverse proxy or another authenticated server boundary.

`A2UI_SECONDARY_LLM_BASE_URL` selects the OpenAI-compatible provider endpoint and defaults to `https://openrouter.ai/api/v1`.
`A2UI_SECONDARY_LLM_MODEL` selects the provider-qualified presentation model and defaults to `openai/gpt-4.1-mini`.
`A2UI_SECONDARY_LLM_API_KEY` supplies its server-only provider key; the Runtime never falls back to other provider environment variables.
When the key is omitted, Dynamic Eligibility does not hold: an explicit dynamic request receives an explicit `A2UI_GENERATION_UNAVAILABLE` error and the original content is preserved.
The model only answers through the catalog-constrained `render_a2ui` structured output; generated components outside the Final Catalog are rejected before painting.
The adapter sends a fixed trust-boundary policy as the system message and keeps the toolkit-composed prompt, including untrusted business content, in the user message.
The Secondary LLM credential stays in the Runtime process and never reaches the browser bundle.

`MAP_VALIDATION_AGENT_ENABLED=true` opts into the third dev-only source.
`MAP_VALIDATION_AGENT_URL` points to the independent LangGraph server and `MAP_VALIDATION_AGENT_GRAPH_ID` must match the graph id in its `langgraph.json`.
If either value is missing, the Runtime fails closed and does not expose the source through `/info`.
The Runtime does not load scenario facts or execute the graph in process.

## Dev-only Scenario Lab

Scenario Lab is disabled by default and is mounted only when `SCENARIO_LAB_ENABLED=true`.
Do not enable it on an unauthenticated or Internet-facing Runtime.
Its source-neutral base path is `/api/dev/scenario-lab`; it is separate from the `/api/copilotkit` Agent integration endpoint even though both are hosted by the same local process.
The endpoints can read and write repository Scenario files and can invoke configured models, so the `/dev` path name is not itself an access-control mechanism.

The boundary separates four operations:

- `GET /api/dev/scenario-lab/scenarios` and `PUT /api/dev/scenario-lab/scenarios/:name` list and save repository evaluation fixtures;
- `POST /api/dev/scenario-lab/fixture-drafts` creates synthetic content drafts for human review;
- `POST /api/dev/scenario-lab/generations` accepts only `presentationInput` and generates one Dynamic A2UI preview;
- `POST /api/dev/scenario-lab/evaluations` accepts `presentationInput` plus an `evaluationOracle` and returns a post-generation fact check.

The generation endpoint never accepts the evaluation oracle.
The oracle cannot constrain component choice or layout and is not sent to the Secondary Presentation LLM.

Scenario fixture authoring is separate from the Secondary Presentation LLM.
Configure it with `SCENARIO_DRAFT_LLM_BASE_URL`, `SCENARIO_DRAFT_LLM_MODEL`, `SCENARIO_DRAFT_LLM_API_KEY`, and optionally `SCENARIO_DRAFT_LLM_TIMEOUT_MS`.
The same provider or model may be selected explicitly, but the authoring adapter never reads `A2UI_SECONDARY_LLM_*` as a fallback.
It returns schema-constrained synthetic fixture content for human review and never claims that the content came from a Business Agent.

An AI-authored draft remains an unsaved editor buffer and can be freely previewed without an evaluation oracle.
The Workbench exposes the oracle only under advanced evaluation controls.
Saving as a reusable evaluation scenario requires at least one manually written oracle assertion, and the Workbench requires an explicit review acknowledgement for AI-authored content.
The server also rejects evaluation scenario files with an empty `expected-facts.json` list.

This configured principal is appropriate only for a single-user or trusted shared Workbench deployment.
Before exposing Workbench to multiple users, authenticate requests at the Runtime boundary and derive the JWT subject from that verified server-side identity.

## Local development

From the repository root, run:

```powershell
pnpm dev:ag-ui-mock
pnpm dev:map-validation-agent
pnpm dev:copilot-runtime
pnpm dev:web-workbench
```

The root `pnpm dev` command starts all three workspace development processes in parallel.

## Real SACS smoke test

Start the Runtime with real SACS environment values, then run:

```powershell
pnpm --filter @generative-ui/copilot-runtime smoke:sacs
```

Set `SACS_SMOKE_RUNTIME_URL` when the Runtime is not at its local default.
Set `SACS_SMOKE_PROMPT` to a domain-specific prompt that produces a published business result in the deployed Agent.
Set `SACS_SMOKE_ERROR_PROMPT` to a safe, domain-specific input that the deployed Agent is expected to reject with bounded `RUN_ERROR`.
The smoke test verifies discovery through Runtime `/info`, then requires streaming text, successful run lifecycle, state snapshot/delta, activity snapshot/delta, and a structured `RUN_FINISHED.result` through the real service.
It also performs the configured negative run and requires `RUN_ERROR` without `RUN_FINISHED`.
The deterministic browser E2E profile verifies the same Workbench mapping plus bounded `RUN_ERROR` handling without depending on external credentials.

## Real model validation (manual, non-CI)

Dynamic A2UI uses a deterministic fake in CI.
To validate a real provider, set `A2UI_SECONDARY_LLM_*` and run the `巡检摘要 (Dynamic A2UI)` Workbench scenario at least five times against the same controlled input.
Every run must stay inside the Final Catalog, render completely, and preserve the key business facts (5 devices / 1 error / 100%).
Record the provider, model, parameters, and outcomes alongside the run; do not promote a model configuration that misses any run.
