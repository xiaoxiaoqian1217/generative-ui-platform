# Source Boundaries

Workbench source code is split by active responsibility.

| Directory | Responsibility |
|---|---|
| `agent/` | CopilotKit Agent discovery, cloning, execution, and cancellation |
| `app/` | Application composition, stable routes, and current scenarios |
| `conversation/` | Native AG-UI message state plus CopilotKit provider and A2UI activity integration |
| `features/frontend-tools/` | Browser-side Frontend Tool implementations |
| `features/map/` | MapLibre state and rendering |
| `components/domain/` | Controlled business components such as `DeviceCard` |
| `inspect/` | Turn inspection observation model, swimlane timeline, and structured JSON viewer |
| `renderer/` | Safe Markdown rendering |
| `settings/` | Agent origin and local Workbench settings |
| `shell/` | Conversation-first shell components |

Protocol-boundary code uses native CopilotKit and AG-UI contracts.
Do not recreate `RuntimeRunResult`, `PresentationResult`, or a parallel Workbench protocol.

Fixed A2UI fixtures use CopilotKit's Vue Basic Catalog and activity renderer instead of a local A2UI protocol or component registry.
Renderer and case-library code must remain independent of the removed contract packages.
