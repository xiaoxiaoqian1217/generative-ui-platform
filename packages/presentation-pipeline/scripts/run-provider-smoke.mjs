import { spawnSync } from "node:child_process";

const requiredEnvironment = [
  "PRESENTATION_PROVIDER_SMOKE_PROVIDER",
  "PRESENTATION_PROVIDER_SMOKE_MODEL_NAME",
  "PRESENTATION_PROVIDER_SMOKE_API_KEY",
];

const missing = requiredEnvironment.filter(
  (name) => !process.env[name] || process.env[name]?.trim() === "",
);
if (missing.length > 0) {
  process.stderr.write(`Provider smoke test requires: ${missing.join(", ")}\n`);
  process.exit(1);
}

const executable = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(
  executable,
  ["exec", "vitest", "run", "test/provider-smoke.test.ts"],
  {
    cwd: new URL("..", import.meta.url),
    env: {
      ...process.env,
      PRESENTATION_PROVIDER_SMOKE_REQUIRED: "1",
    },
    stdio: "inherit",
  },
);

if (result.error) {
  process.stderr.write("Unable to start the Provider smoke test.\n");
  process.exit(1);
}
process.exit(result.status ?? 1);
