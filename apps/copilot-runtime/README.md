# Thin CopilotKit Runtime

## Responsibility

`apps/copilot-runtime` is the Workbench Agent integration boundary accepted by ADR-0029.
It registers AGUIMock and `single-agent-chat-server` under stable Agent identities and proxies native AG-UI streams.
It does not own product runtime state, presentation decisions, orchestration, or durable history.

## Agent identities

- `ag-ui-mock` is the deterministic Frontend Tool and failure-scenario fixture.
- `single-agent-chat-server` is the real Business Agent profile.

Both Agents are registered concurrently.
The Workbench chooses one identity for a conversation.
The SACS profile does not support client-provided Frontend Tools, and the Runtime does not emulate them.

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

This configured principal is appropriate only for a single-user or trusted shared Workbench deployment.
Before exposing Workbench to multiple users, authenticate requests at the Runtime boundary and derive the JWT subject from that verified server-side identity.

## Local development

From the repository root, run:

```powershell
pnpm dev:ag-ui-mock
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
