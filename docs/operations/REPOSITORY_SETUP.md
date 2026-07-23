# GitHub Repository Setup

Files in this repository configure most automation. Some repository-level controls require one-time GitHub settings.

## Required one-time settings

1. Create the repository as **private** with default branch `main`.
2. Enable Issues and Actions.
3. Add branch protection or a ruleset for `main`:
   - Require pull requests.
   - Require one approval.
   - Dismiss stale approvals.
   - Require conversation resolution.
   - Require `CI / validate` and `Docs / docs-review` checks.
   - Block force pushes and branch deletion.
4. Enable Dependabot alerts and security updates.
5. Enable secret scanning and push protection when available.
6. Add repository variables as needed:
   - `ENABLE_CODEQL=true`
   - `ENABLE_DEPENDENCY_REVIEW=true`
   - `ENABLE_CODEX_REVIEW=true`
   - `ENABLE_CODEX_TRIAGE=true`
   - `ENABLE_CLAUDE=true`
7. Add Actions secrets only when enabling the corresponding workflow:
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN`

## Optional Settings app

Install the Probot Settings app to apply `.github/settings.yml`. Review its permissions before installation.

## Lockfile

The initial scaffold may not include `pnpm-lock.yaml`. Run `scripts/bootstrap.ps1` or manually dispatch `Bootstrap lockfile` and merge its PR. CI automatically uses frozen installs once the lockfile exists.
