import { spawn } from "node:child_process";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { readProcessState, repositoryRoot } from "./platform-processes.mjs";

const packageManagerCli = process.env.npm_execpath;
if (packageManagerCli === undefined) {
  throw new Error("PACKAGE_MANAGER_CLI_UNAVAILABLE");
}
const playwrightCli = join(
  repositoryRoot,
  "apps",
  "web-workbench",
  "node_modules",
  "@playwright",
  "test",
  "cli.js",
);
async function ensureChromium() {
  const code = await runPlaywright(["install", "chromium"]);
  if (code !== 0) throw new Error("PLAYWRIGHT_CHROMIUM_UNAVAILABLE");
}
function run(args, environment = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [packageManagerCli, ...args], {
      cwd: repositoryRoot,
      env: { ...process.env, ...environment },
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("exit", (code) => resolve(code ?? 1));
    child.once("error", () => resolve(1));
  });
}

function runPlaywright(args, environment = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [playwrightCli, ...args], {
      cwd: join(repositoryRoot, "apps", "web-workbench"),
      env: { ...process.env, ...environment },
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("exit", (code) => resolve(code ?? 1));
    child.once("error", () => resolve(1));
  });
}

async function runFixtureSuite(environment, grep) {
  const fixtureEnvironment = {
    ...environment,
    PRESENTATION_MODEL_PROVIDER: "fixture",
  };
  if (
    (await run(["dev:platform", "--", "--background"], fixtureEnvironment)) !==
    0
  )
    throw new Error("PLATFORM_START_FAILED");
  let cleanupError;
  try {
    const processes = await readProcessState();
    if (
      processes.length !== 3 ||
      new Set(processes.map(({ name }) => name)).size !== 3
    ) {
      throw new Error("PLATFORM_TOPOLOGY_INVALID");
    }
    for (let attempt = 0; attempt < 30; attempt += 1) {
      if (
        (await run(
          [
            "exec",
            "node",
            "scripts/check-platform-environment.mjs",
            "--require-running",
            "--require-build",
          ],
          fixtureEnvironment,
        )) === 0
      )
        break;
      if (attempt === 29) throw new Error("PLATFORM_HEALTH_TIMEOUT");
      await delay(1_000);
    }
    const result = await runPlaywright(
      ["test", "--config", "playwright.platform.config.ts", "--grep", grep],
      fixtureEnvironment,
    );
    if (result !== 0) throw new Error("PLATFORM_E2E_FAILED");
  } finally {
    if ((await run(["stop:platform"])) !== 0) {
      cleanupError = new Error("PLATFORM_PROCESS_CLEANUP_FAILED");
    }
    if ((await readProcessState()).length !== 0) {
      cleanupError ??= new Error("PLATFORM_PROCESS_STATE_CLEANUP_FAILED");
    }
  }
  if (cleanupError) throw cleanupError;
}

if ((await readProcessState()).length > 0)
  throw new Error(
    "PLATFORM_ALREADY_RUNNING: stop it with pnpm stop:platform before E2E.",
  );
await ensureChromium();
for (let run = 0; run < 3; run += 1) await runFixtureSuite({}, ".*");
for (const fault of ["rate-limited", "invalid-candidate", "timeout"]) {
  await runFixtureSuite(
    {
      PLATFORM_E2E_FIXTURE_FAULT: fault,
      PRESENTATION_FIXTURE_MODEL_FAULT: fault,
      ...(fault === "timeout" ? { RUNTIME_TOTAL_TIMEOUT_MS: "250" } : {}),
    },
    "fixture model failures",
  );
}
