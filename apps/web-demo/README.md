# Web Demo

Minimal Vue browser demo for validating text messaging with Agent Runtime Host.

## Current scope

The demo validates this temporary development path:

```text
Vue Web Demo
     |
     | WebSocket text message
     v
Agent Runtime Host Mock Socket
```

A real Business Agent is not connected yet. Business Agent implementations do
not need to support AG-UI. Future protocol adapters belong in Agent Runtime Host.

The current demo intentionally excludes streaming output, UI compilation,
A2UI rendering, frontend tools, persistence, authentication, and multi-agent
routing.

## Run

Start Agent Runtime Host:

```bash
pnpm --filter @generative-ui/agent-runtime-host dev
```

Start the Web demo in another terminal:

```bash
pnpm --filter @generative-ui/web-demo dev
```

Open `http://localhost:5173`.

The default socket is `ws://localhost:8200/ws/demo`. Override it with a query
parameter when necessary:

```text
http://localhost:5173/?ws=ws://127.0.0.1:8200/ws/demo
```

## Build

```bash
pnpm --filter @generative-ui/web-demo build
```

The static output is written to `apps/web-demo/dist`.

## Note

To avoid introducing frontend package dependencies during this first smoke
validation, the page loads Vue 3 from unpkg. A production frontend should pin
Vue as a workspace dependency and use the repository build toolchain.
