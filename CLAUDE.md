# Claude Code Instructions

Follow `AGENTS.md` as the primary repository instructions.
Select the applicable platform or Compiler documentation source according to its scope rules.

Before coding:

1. Identify the affected module and its allowed dependencies.
2. Confirm the task is inside the current approved scope.
3. Prefer native CopilotKit and AG-UI contracts at protocol boundaries.
4. Put only genuinely cross-module types in `packages/shared-types`.
5. Do not recreate removed Runtime, Presentation, or Compiler contracts.

Before finishing:

```bash
pnpm validate
```

For documentation-only work:

```bash
pnpm docs:check
```

Do not modify repository automation to weaken validation, permissions, review requirements, or secret handling.
