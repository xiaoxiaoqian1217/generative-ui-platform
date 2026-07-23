#!/usr/bin/env bash
set -euo pipefail
corepack enable
corepack prepare pnpm@10.13.1 --activate
pnpm install
pnpm validate
