# Agent Runtime Host

CopilotKit Runtime integration layer for the Generative UI Platform.

## Responsibility

The runtime host sits between the frontend and an AG-UI-compatible business
agent. It provides the CopilotKit runtime endpoint and must not contain UI
planning or UI compilation logic.

```text
Vue + CopilotKit Headless
          |
          | AG-UI
          v
Agent Runtime Host
          |
          v
Business Agent
```

The UI Compiler remains an independent service. A later integration adapter can
call it after the business agent produces Markdown or structured data.

## Requirements

- Node.js 24 or newer
- pnpm 10.13.1
- An AG-UI-compatible business agent endpoint

## Configuration

Copy `.env.example` values into the environment used to start the process.
Environment files are not loaded automatically by the application.

| Variable | Default | Description |
| --- | --- | --- |
| `HOST` | `0.0.0.0` | Listen address |
| `PORT` | `8200` | Listen port |
| `COPILOTKIT_ENDPOINT` | `/api/copilotkit` | Frontend runtime endpoint |
| `BUSINESS_AGENT_ID` | `business-agent` | Agent identifier exposed to the frontend |
| `BUSINESS_AGENT_URL` | `http://localhost:8000/ag-ui` | Remote AG-UI agent endpoint |

## Run

From the repository root:

```bash
pnpm install
pnpm --filter @generative-ui/agent-runtime-host dev
```

Health check:

```bash
curl http://localhost:8200/health
```

CopilotKit frontend configuration:

```text
runtimeUrl: http://localhost:8200/api/copilotkit
agent: business-agent
```

## Current boundary

This initialization intentionally does not include:

- business-agent implementation
- UI Compiler invocation
- thread persistence
- authentication
- frontend tools or approval handlers
- CopilotKit automatic A2UI generation

These capabilities should be introduced through explicit adapters after the
basic AG-UI connection is verified.
