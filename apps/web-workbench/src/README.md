# Source Boundaries

Workbench source code is split by active responsibility.

| Directory | Responsibility |
|---|---|
| `agent/` | CopilotKit Agent discovery, cloning, execution, and cancellation |
| `app/` | Application composition, stable routes, and current scenarios |
| `conversation/` | Native AG-UI message state and CopilotKit provider integration |
| `features/frontend-tools/` | Browser-side Frontend Tool implementations |
| `features/map/` | MapLibre state and rendering |
| `components/domain/` | Controlled business components such as `DeviceCard` |
| `inspect/` | Safe AG-UI turn inspection snapshots |
| `renderer/` | Safe Markdown plus frozen local A2UI support |
| `settings/` | Agent origin and local Workbench settings |
| `shell/` | Conversation-first shell components |

Protocol-boundary code uses native CopilotKit and AG-UI contracts.
Do not recreate `RuntimeRunResult`, `PresentationResult`, or a parallel Workbench protocol.

The frozen A2UI renderer validates its local bounded data model and never executes arbitrary code.
Frozen renderer and case-library code must remain independent of the removed contract packages.
