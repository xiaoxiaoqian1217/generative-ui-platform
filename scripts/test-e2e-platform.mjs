import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { join } from "node:path";
import {
  isPortAvailable,
  platformPorts,
  readProcessState,
  repositoryRoot,
} from "./platform-processes.mjs";

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const playwrightCli = join(
  repositoryRoot,
  "apps",
  "web-workbench",
  "node_modules",
  "@playwright",
  "test",
  "cli.js",
);
function run(args, environment = {}) {
  return new Promise((resolve) => {
    const child = spawn(pnpmCommand, args, {
      cwd: repositoryRoot,
      env: { ...process.env, ...environment },
      shell: process.platform === "win32",
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
  if ((await run(["dev:platform", "--", "--background"], environment)) !== 0)
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
          environment,
        )) === 0
      )
        break;
      if (attempt === 29) throw new Error("PLATFORM_HEALTH_TIMEOUT");
      await delay(1_000);
    }
    const result = await runPlaywright(
      ["test", "--config", "playwright.platform.config.ts", "--grep", grep],
      environment,
    );
    if (result !== 0) throw new Error("PLATFORM_E2E_FAILED");
  } finally {
    await run(["stop:platform"]);
    if ((await readProcessState()).length !== 0) {
      cleanupError = new Error("PLATFORM_PROCESS_CLEANUP_FAILED");
    }
    if (
      !(
        await Promise.all(
          platformPorts.map(({ port }) => isPortAvailable(port)),
        )
      ).every(Boolean)
    ) {
      cleanupError ??= new Error("PLATFORM_PORT_CLEANUP_FAILED");
    }
  }
  if (cleanupError) throw cleanupError;
}

await runFixtureSuite({}, ".*");
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
