# ADR-0029: Adopt thin CopilotKit Runtime integration boundary and activate A2UI next phase

- **Status:** Accepted
- **Date:** 2026-08-13
- **Scope:** Current repository phase, Web Workbench, Agent integration boundary, A2UI next phase

## Context

ADR-0028 intentionally reduced the repository to one evidence-driven vertical track and removed the previous Runtime Platform / Presentation Compiler implementation.
That reset was necessary and remains valid.

The first controlled interaction scenario has now been proven with AGUIMock:

```text
User
  ↓
Web Workbench
  ↓
CopilotKit / AG-UI
  ↓
Frontend Tool: locateDevice
  ↓
MapLibre + DeviceCard
```

This proves that AG-UI + CopilotKit Frontend Tool can drive a real browser capability.
The next integration target is the real Business Agent `zhouwen-giser/single-agent-chat-server` tracked by #200.

The current SACS AG-UI profile already provides useful real-agent behavior:

- HTTP POST + SSE AG-UI transport;
- streaming text and Run lifecycle;
- `STATE_SNAPSHOT` / `STATE_DELTA`;
- `ACTIVITY_SNAPSHOT` / `ACTIVITY_DELTA`;
- structured output and published Artifact data;
- bounded `RUN_ERROR`;
- interrupt / resume and human-in-the-loop semantics;
- durable Run / reconnect semantics owned by SACS.

SACS currently does **not** support client-provided Frontend Tools or AG-UI `TOOL_CALL_*` behavior.
This is an interoperability gap of the current real Agent profile, not a limitation that should be copied into the Workbench capability model.

SACS also requires server-side credentials and signed identity headers.
Those secrets must not be placed in the browser bundle.
If Workbench directly integrates every Agent endpoint, authentication, routing, and middleware concern itself, the browser application will gradually become an Agent Gateway.

At the same time, the product direction has moved beyond proving only one controlled UI scenario.
The next research question is whether A2UI can provide a controlled generative presentation layer when future Business Agent result shapes are not known in advance.

ADR-0028 explicitly required a new phase decision before reactivating Runtime or A2UI platform work.
This ADR is that decision.

## Decision

### 1. Introduce CopilotKit Runtime as a thin supporting integration layer

The target Agent integration topology is:

```text
┌──────────────────────────────────────┐
│ Web Workbench                        │
│ CopilotKit Frontend / A2UI Renderer  │
└──────────────────┬───────────────────┘
                   │
                   ▼
          ┌───────────────────┐
          │ CopilotKit Runtime│
          │ thin integration  │
          └─────────┬─────────┘
                    │
          ┌─────────┴───────────────┐
          ▼                         ▼
      AGUIMock          single-agent-chat-server
      Test Agent             Real Agent
```

CopilotKit Runtime is **Supporting Infrastructure**, not product-domain Runtime ownership.

Its allowed responsibilities in the current phase are limited to:

- Agent registration and routing;
- server-side Agent endpoint configuration;
- server-side credential / header injection;
- the unified Workbench-to-Agent integration endpoint;
- framework middleware needed by current CopilotKit / AG-UI / A2UI integration.

The implementation is tracked by #207.

Until #207 is implemented, the existing Workbench → AGUIMock path remains the current executable baseline.
Documentation must distinguish this implementation fact from the accepted target architecture above.

### 2. Keep AGUIMock and SACS as two different Agent sources

The two Agent sources have different purposes.

```text
AGUIMock
  → deterministic capability fixture / test double
  → Frontend Tool / TOOL_CALL scenarios
  → regression and failure scenarios

single-agent-chat-server
  → real Business Agent interoperability
  → Text / State / Activity / Artifact / Interrupt
  → current profile does not provide Frontend Tools
```

Workbench must not infer that all registered Agents have identical capabilities.
Capability differences must remain explicit.

Runtime must not fabricate Tool Calling events to make SACS appear to support a capability it does not publish.

### 3. #200 validates real AG-UI interoperability through the unified integration boundary

#200 remains the Real Agent Profile / interoperability issue.
Its value is not limited to proving text chat.
The real SACS integration should exercise the business-facing AG-UI facts that SACS already publishes, especially:

- streaming text;
- Run lifecycle and bounded errors;
- State;
- Activity;
- Artifact / structured business results;
- capability discovery;
- interrupt / resume when available to the scenario.

SACS-owned durable Run semantics should be consumed correctly but must not trigger a new Workbench Runtime Repository or Recovery Platform.

### 4. The previous Runtime Platform remains Deferred

CopilotKit Runtime is not a replacement name for the removed Runtime Platform.
The following remain Deferred and must not be reintroduced by #207:

- Thread Platform;
- Turn / Operation Repository;
- Runtime Truth;
- Command Admission;
- Surface Lifecycle;
- Recovery / Reconcile Platform;
- runtime-owned durable history;
- custom multi-Agent orchestration platform.

If these become necessary later, they require separate evidence and a new architecture decision.

### 5. Activate A2UI as the next product research phase

After the thin Runtime integration boundary is established, the main product track moves to A2UI.

The implementation order is intentionally incremental:

```text
A2UI Renderer MVP
  ↓
Fixed A2UI fixtures
  ↓
Basic Catalog
  ↓
Small Custom Catalog
  ↓
Theme tokens
  ↓
Real AgentContent → Dynamic A2UI
```

The first A2UI milestone must prove rendering before introducing a Secondary LLM.

The Catalog should initially prefer reusable presentation semantics such as:

- Metric;
- StatusBadge;
- InfoRow;

and only add domain-specific components such as DeviceCard / AlarmCard / TaskCard when real reuse evidence exists.

Controlled UI and A2UI should reuse the same real frontend UI implementation and Theme foundation where practical.
They differ in presentation decision mode, not in the need to maintain two visual component systems.

### 6. A2UI does not replace Frontend Tools

The product keeps two complementary interaction modes:

```text
Deterministic interaction
Agent → Frontend Tool → Controlled UI / browser capability

Dynamic presentation
AgentContent → A2UI → Renderer → controlled component catalog
```

Map operations, route drawing, panel control, and other deterministic browser actions remain suitable Frontend Tool capabilities.
Business result summaries, comparisons, metrics, task outputs, and other variable result presentations are candidates for A2UI.

### 7. UI Compiler is not a mandatory current-path dependency

Historical Compiler research remains useful for later reliability and controlled-generation work.
However, the current A2UI phase must not require rebuilding `ui-compiler-core`, Presentation Pipeline, or the old compatibility contracts before Renderer / Catalog behavior has been proven in practice.

A future reliability phase may reintroduce explicit validation, policy, plan, or compilation layers if real A2UI experiments demonstrate the need.
That would require a separate decision and must not silently restore removed packages.

## Active phase roadmap

The accepted near-term order is:

```text
Completed
#202 Controlled UI vertical slice
AGUIMock + Frontend Tool + MapLibre + DeviceCard

Current integration work
#207 Thin CopilotKit Runtime
  ↓
#200 Real SACS interoperability through that boundary

Next product track
A2UI Renderer MVP
  ↓
Basic / Custom Catalog
  ↓
Theme
  ↓
SACS AgentContent → Dynamic A2UI

Later, only if evidence requires it
Runtime Platform / controlled-generation Compiler capabilities
```

## Repository state impact

### Active / accepted implementation target

- `apps/web-workbench` remains the product application;
- `packages/ag-ui-mock` remains the deterministic Agent test double;
- `packages/ag-ui-adapter` remains protocol-boundary support only;
- `packages/shared-types` remains minimal;
- a minimal CopilotKit Runtime host may be added by #207 at the smallest natural Monorepo boundary.

### Reactivated from Frozen

The following Workbench assets may now receive focused implementation work for the A2UI phase after #207:

- A2UI renderer integration;
- Component Catalog experiments;
- Theme experiments;
- A2UI fixtures / scenarios;
- presentation comparison and validation needed to evaluate generated UI.

This does not authorize restoration of removed Compiler / Presentation / Runtime Platform packages.

## Relationship to ADR-0028

ADR-0028 remains authoritative for:

- native AG-UI contracts instead of the deleted compatibility contracts;
- Active / Frozen / Removed / Historical state vocabulary;
- removed Runtime / Compiler / Presentation implementations;
- Monorepo dependency direction;
- the rule against executing arbitrary model-generated HTML or JavaScript.

This ADR **partially supersedes ADR-0028** in two areas:

1. the active integration topology now includes a thin CopilotKit Runtime target instead of assuming the Workbench remains the direct long-term Agent boundary;
2. A2UI / Catalog / Theme are no longer indefinitely Frozen — they are the explicitly accepted next phase after the thin Agent integration boundary is established.

## Consequences

- Workbench gets one server-side Agent integration boundary without rebuilding a custom Runtime Platform.
- Real Agent credentials stay outside the browser.
- AGUIMock and SACS can be evaluated through one frontend integration model while preserving capability differences.
- SACS can become a real AgentContent source for later A2UI experiments even before it supports Frontend Tools.
- The repository can start accumulating reusable UI / Theme knowledge from A2UI practice rather than speculative platform design.
- Historical Compiler and Runtime research remains available but does not become a prerequisite for the next implementation phase.

## Implementation principle

> **先统一 Agent 接入边界，再进入 A2UI；先证明 Renderer，再横向抽象 Catalog / Theme。**
