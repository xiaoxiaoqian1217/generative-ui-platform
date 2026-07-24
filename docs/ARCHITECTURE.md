# Architecture

## Components

```text
Frontend (external)
  → AG-UI
Interaction Gateway
  → Business Agent Adapters (external agents)
  → UI Compiler Core
  → A2UI carried in AG-UI events
```

The independent compiler path is:

```text
External caller → HTTP / AG-UI → UI Compiler Agent → UI Compiler Core
```

## Dependency direction

```text
apps → packages
ui-compiler-core → contract packages only
```

Forbidden:

```text
packages → apps
interaction-gateway ↔ ui-compiler-agent package imports
```

## State ownership

- Gateway: Run, routing, Action, Surface correlation.
- Business systems: authoritative domain state and checkpoints.
- Compiler: Catalog and compilation caches only.
- Frontend: rendered Surface state.

See `docs/REQUIREMENTS.md` for normative requirements.
