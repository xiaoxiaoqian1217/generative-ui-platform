# Codex and Claude Automation Setup

AI workflows are committed but disabled by repository variables. This prevents missing secrets from breaking initialization.

## Codex

1. Connect the repository to Codex in ChatGPT when it appears in GitHub access.
2. Add `OPENAI_API_KEY` to Actions secrets for `openai/codex-action` workflows.
3. Set `ENABLE_CODEX_REVIEW=true` to enable PR review on the `codex-review` label.
4. Set `ENABLE_CODEX_TRIAGE=true` to enable issue refinement on the `codex-triage` label.
5. Codex reads root `AGENTS.md`; keep instructions concise and test commands accurate.

## Claude Code

1. Install the official Claude GitHub app or configure a custom app.
2. Add `ANTHROPIC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN`.
3. Set `ENABLE_CLAUDE=true`.
4. Mention `@claude` in issues or PR comments.
5. Claude reads `CLAUDE.md`, which delegates to `AGENTS.md` and `REQUIREMENTS.md`.

## Security

- Do not run AI workflows on untrusted fork code with write permissions.
- Keep AI jobs least-privileged.
- Never interpolate issue or PR text directly into shell commands.
- Require human review before merging AI-generated changes.
