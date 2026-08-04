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

const packageManagerCli = process.env.npm_execpath;
if (packageManagerCli === undefined || packageManagerCli.trim() === "") {
  process.stderr.write("Provider smoke test requires npm_execpath.\n");
  process.exit(1);
}
const result = spawnSync(
  process.execPath,
  [packageManagerCli, "exec", "vitest", "run", "test/provider-smoke.test.ts"],
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
