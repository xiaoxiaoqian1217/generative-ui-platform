# Web Demo

Minimal Vue browser demo for validating complete text messages with Agent Runtime
Host.

## Current scope

The demo validates this temporary development path:

```text
Vue Web Demo
     |
     | WebSocket complete text message
     v
Agent Runtime Host Mock Socket
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

Open `http://localhost:5173`.

The default socket is `ws://localhost:8200/ws/demo`. Override it with a query
parameter when necessary:

```text
http://localhost:5173/?ws=ws://127.0.0.1:8200/ws/demo
```

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
