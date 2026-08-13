# GitHub Repository Setup

> **Status: Historical.**
> Validate repository settings against the current GitHub state before applying this record.

Files in this repository configure most automation. Some repository-level controls require one-time GitHub settings.

## Required one-time settings

1. Create the repository as **private** with default branch `main`.
2. Enable Issues and Actions.
3. Add branch protection or a ruleset for `main`:
   - Require pull requests.
   - Require one approval.
   - Dismiss stale approvals.
   - Require conversation resolution.
   - Require the `CI / validate` check.
   - Block force pushes and branch deletion.
4. Enable Dependabot alerts and security updates.
5. Enable secret scanning and push protection when available.
6. Add repository variables as needed:
   - `ENABLE_CODEQL=true`
   - `ENABLE_DEPENDENCY_REVIEW=true`

## Current workflows

- `CI` runs `pnpm validate` for pull requests, pushes to `main`, and manual dispatches.
- `Changesets` maintains package version pull requests after pushes to `main`.
- `Container Release` publishes application images for version tags or manual dispatches.
- `PR Governance` checks semantic pull request titles and applies path-based labels.
- `Security` runs CodeQL and dependency review when their repository variables are enabled.

No Codex or Claude GitHub Actions workflow is configured.
Codex follows `AGENTS.md`, and Claude Code follows `CLAUDE.md`.
Adding AI automation requires a separate security and permissions review.

## Optional Settings app

Install the Probot Settings app to apply `.github/settings.yml`. Review its permissions before installation.

## Lockfile

The repository includes `pnpm-lock.yaml`.
CI uses `pnpm install --frozen-lockfile` when the lockfile is present.
