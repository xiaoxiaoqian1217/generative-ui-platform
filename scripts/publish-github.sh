#!/usr/bin/env bash
set -euo pipefail

OWNER="${1:-xiaoxiaoqian1217}"
REPO="${2:-generative-ui-platform}"
VISIBILITY="${3:-private}"

command -v gh >/dev/null || {
  echo "GitHub CLI is required: https://cli.github.com/" >&2
  exit 1
}

gh auth status

FLAG="--private"
if [[ "$VISIBILITY" == "public" ]]; then FLAG="--public"; fi

gh repo create "$OWNER/$REPO" "$FLAG" --source . --remote origin --push
gh workflow run seed-issues.yml --repo "$OWNER/$REPO"

echo "Repository created: https://github.com/$OWNER/$REPO"
echo "Next: configure optional AI secrets."
