$ErrorActionPreference = "Stop"
corepack enable
corepack prepare pnpm@10.13.1 --activate
pnpm install --frozen-lockfile
pnpm --filter @generative-ui/web-workbench exec playwright install chromium
pnpm check:doctor -- --source --browser
pnpm build:platform
Write-Host "Ready. Next: pnpm dev:platform, or pnpm test:e2e:platform"
