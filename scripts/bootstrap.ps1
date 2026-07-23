$ErrorActionPreference = "Stop"
corepack enable
corepack prepare pnpm@10.13.1 --activate
pnpm install
pnpm validate
