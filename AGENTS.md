# Repository Instructions for Coding Agents

## Source of truth

1. Read `docs/REQUIREMENTS.md` before modifying architecture or public contracts.
2. Read `docs/ARCHITECTURE.md` and relevant ADRs before adding dependencies.
3. Do not expand MVP scope without an issue or ADR.

## Architecture rules

- `packages/ui-compiler-core` MUST remain framework-, transport-, and vendor-neutral.
- Apps may depend on packages; packages MUST NOT depend on apps.
- Current MVP MUST NOT create or implement `apps/interaction-gateway`.
- In the future Gateway phase, `ui-compiler-agent` and
  `interaction-gateway` MUST NOT import one another.
- Shared contracts belong in the matching contract package; do not duplicate types.
- External systems (frontend, Copilot Runtime, real business agents) are out of scope; use mocks.

## Commands

```bash
pnpm install
pnpm validate
pnpm test
pnpm build
pnpm docs:check
```

Run `pnpm validate` after all changes. Documentation-only changes must run `pnpm docs:check`.

## Coding standards

- TypeScript strict mode.
- ESM only.
- Prefer pure functions and explicit interfaces.
- Validate all external input at boundaries.
- Use stable error codes; do not rely on error text.
- Do not execute model-generated code.
- Do not log secrets or raw sensitive payloads.

## Output requirements

- Respond in Simplified Chinese unless the user explicitly requests another language.
- Lead with the result, then list changed files, validation performed, and any remaining risks or follow-up work.
- Keep output concise, specific, and verifiable.
- Do not claim that a command, test, commit, push, or deployment succeeded unless it was actually completed.
- Use only the ASCII hyphen `-`; do not use non-ASCII dash characters.
- When writing or heavily editing long Markdown files, put each complete sentence on its own physical line.

## Pull requests

PR descriptions must include: scope, rationale, architecture impact, validation, risks, and documentation changes.
