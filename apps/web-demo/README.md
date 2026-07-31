# Web Demo

Minimal Vue browser demo for validating complete text messages with Agent Runtime
Host over WebSocket and HTTP.

## Current scope

The demo validates two temporary development paths:

```text
Vue Web Demo
     |
     +-- WebSocket complete text message --> /ws/demo
     |
     +-- HTTP POST complete text message --> /api/demo/message
                                                |
                                                v
                                   Agent Runtime Host Mock
```

A real Business Agent is not connected yet. Business Agent implementations do
not need to support AG-UI. Future Business Agent protocol adapters belong in
Agent Runtime Host.

The current demo intentionally excludes token streaming, UI compilation, A2UI
rendering, frontend tools, persistence, authentication, and multi-agent routing.

## Run

Start Agent Runtime Host:

```bash
pnpm --filter @generative-ui/agent-runtime-host dev
```

Start the Web demo in another terminal:

```bash
pnpm dev:web-demo
```

Open `http://localhost:5173` and select `WebSocket` or `HTTP POST`.

Default endpoints:

- WebSocket: `ws://localhost:8200/ws/demo`
- HTTP: `http://localhost:8200/api/demo/message`

Override them with query parameters when necessary:

```text
http://localhost:5173/?transport=http&http=http://127.0.0.1:8200/api/demo/message
http://localhost:5173/?transport=websocket&ws=ws://127.0.0.1:8200/ws/demo
```

## HTTP request example

```bash
curl -X POST http://localhost:8200/api/demo/message \
  -H "content-type: application/json" \
  -d '{"type":"user_message","messageId":"demo-1","content":"查询设备状态"}'
```

Both transports use complete request and response messages. Neither endpoint
provides token-level streaming.

## Build and test

```bash
pnpm build:web-demo
pnpm test:web-demo
```

The static output is written to `apps/web-demo/dist`.

## Note

To avoid changing the workspace dependency lock during the first smoke
validation, the page loads Vue 3 from a public browser CDN. A production frontend
should pin Vue as a workspace dependency and use the repository build toolchain.
