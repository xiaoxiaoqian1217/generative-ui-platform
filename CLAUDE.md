# Claude Code Instructions

Follow `AGENTS.md` and `REQUIREMENTS.md` as the primary repository instructions.

Before coding:

1. Identify the affected module and its allowed dependencies.
2. Confirm the task is inside MVP scope.
3. Reuse shared contracts rather than redefining types.

Before finishing:

```bash
pnpm validate
```

For documentation-only work:

```bash
pnpm docs:check
```

Do not modify repository automation to weaken validation, permissions, review requirements, or secret handling.
