# Source Boundaries

Workbench source code is split by active responsibility.

| Directory | Responsibility |
|---|---|
| `agent/` | CopilotKit Agent discovery, cloning, execution, and cancellation |
| `app/` | Application composition, stable routes, and current scenarios |
| `conversation/` | Native AG-UI message state plus CopilotKit provider and A2UI activity integration |
| `features/a2ui/catalog/` | Merged A2UI catalog: framework-independent `definitions/`, Vue adapter `implementations/`, and the single `platform-catalog.ts` instance |
| `features/frontend-tools/` | Browser-side Frontend Tool implementations |
| `features/map/` | MapLibre state and rendering |
| `components/domain/` | Controlled business components such as `DeviceCard` |
| `components/ui/` | Business-agnostic UI SFCs (`UiMetric` / `UiStatusBadge` / `UiInfoRow`) backing the platform A2UI catalog |
| `inspect/` | Turn inspection observation model, swimlane timeline, and structured JSON viewer |
| `renderer/` | Safe Markdown rendering |
| `settings/` | Agent origin and local Workbench settings |
| `shell/` | Conversation-first shell components |

Protocol-boundary code uses native CopilotKit and AG-UI contracts.
Do not recreate `RuntimeRunResult`, `PresentationResult`, or a parallel Workbench protocol.

A2UI fixtures render through the merged platform catalog (`Basic 18 + Metric / StatusBadge / InfoRow`) registered under `PLATFORM_A2UI_CATALOG_ID` from `@generative-ui/shared-types`.
Catalog definitions stay framework-independent: they import only zod and `@a2ui/web_core`, never Vue or a UI library.
The catalog stays layer-flat while it holds only a handful of components.
When the fifth or sixth platform component lands, re-aggregate `definitions/` and `implementations/` by component (`catalog/components/<name>/definition.ts` plus `implementation.ts`); `components/ui/` stays in place.
Renderer and case-library code must remain independent of the removed contract packages.
