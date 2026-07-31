# Agent Runtime Host

Protocol and runtime integration layer for the Generative UI Platform.

## Responsibility

Agent Runtime Host sits between the frontend and Business Agents. It exposes a
stable frontend-facing interaction boundary and adapts each Business Agent's
existing protocol when that integration is introduced.

Business Agents do not need to implement AG-UI or CopilotKit directly.

```text
Vue Web
   |
   | HTTP or WebSocket
   v
Agent Runtime Host
   |
   | Business Agent adapter
   v
Business Agent
```

UI planning and UI compilation do not belong in this host. UI Compiler remains
an independent service and can be composed into a later platform workflow.

## Current endpoints

### Mock HTTP demo

`POST /api/demo/message` is a development-only HTTP endpoint used by
`apps/web-demo`. It accepts one complete JSON message and returns one complete
mock JSON response.

Request:

```json
{
  "type": "user_message",
  "messageId": "demo-1",
  "content": "查询设备状态"
}
```

The endpoint returns `400` for an invalid message and enables CORS for the local
browser demo.

### Mock WebSocket demo

`/ws/demo` is a development-only WebSocket endpoint used by `apps/web-demo`.
It accepts one complete text message and pushes one complete mock text response.

Neither Mock endpoint calls a real Business Agent or provides token streaming.

### CopilotKit compatibility endpoint

`/api/copilotkit` is the existing CopilotKit Runtime endpoint. Its current
implementation uses an `HttpAgent` compatibility adapter and therefore expects
an AG-UI-compatible upstream URL. This is an implementation detail of that
adapter, not a platform requirement for future Business Agents.

## Requirements

- Node.js 24 or newer
- pnpm 10.13.1

## Configuration

Copy `.env.example` values into the environment used to start the process.
Environment files are not loaded automatically by the application.

| Variable | Default | Description |
| --- | --- | --- |
| `HOST` | `0.0.0.0` | Listen address |
| `PORT` | `8200` | Listen port |
| `COPILOTKIT_ENDPOINT` | `/api/copilotkit` | Existing compatibility endpoint |
| `BUSINESS_AGENT_ID` | `business-agent` | Compatibility adapter identifier |
| `BUSINESS_AGENT_URL` | `http://localhost:8000/ag-ui` | Compatibility adapter upstream URL |

The Mock HTTP and WebSocket endpoints can run without a live service at
`BUSINESS_AGENT_URL`.

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

The response explicitly reports both demo transports and that a real Business
Agent is not connected:

```json
{
  "status": "ok",
  "service": "agent-runtime-host",
  "demoHttpPath": "/api/demo/message",
  "demoSocketPath": "/ws/demo",
  "businessAgentConnected": false
}
```

HTTP request example:

```bash
curl -X POST http://localhost:8200/api/demo/message \
  -H "content-type: application/json" \
  -d '{"type":"user_message","messageId":"demo-1","content":"查询设备状态"}'
```

Start the browser demo in another terminal:

```bash
pnpm dev:web-demo
```

Then open `http://localhost:5173` and select `WebSocket` or `HTTP POST`.

## Current boundary

This stage intentionally does not include:

- real Business Agent integration
- token-level streaming
- UI Compiler invocation
- thread persistence
- authentication
- frontend tools or approval handlers
- A2UI generation or rendering

The next Business Agent integration should be introduced through an explicit
adapter inside Agent Runtime Host without requiring the Business Agent to adopt
AG-UI.
