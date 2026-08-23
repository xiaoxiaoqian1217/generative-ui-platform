Read `/AGENTS.md` before generating code and treat it as the repository source of truth.
Use `/CONTEXT.md` and `/docs/ARCHITECTURE.md` for the current implementation boundary.
Apps may depend on packages, but packages must not depend on apps.
Prefer native CopilotKit, AG-UI, and A2UI contracts at framework boundaries.
Keep `/packages/shared-types` minimal and do not recreate removed Runtime, Presentation, or Compiler contracts.
Use strict TypeScript, boundary validation, stable error semantics, and tests.
