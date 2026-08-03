import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { repositoryRoot } from "./platform-processes.mjs";

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
function run(args) {
  return new Promise((resolve) => {
    const child = spawn(pnpmCommand, args, {
      cwd: repositoryRoot,
      shell: process.platform === "win32",
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("exit", (code) => resolve(code ?? 1));
    child.once("error", () => resolve(1));
  });
}

try {
  if ((await run(["dev:platform", "--", "--background"])) !== 0)
    throw new Error("PLATFORM_START_FAILED");
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (
      (await run([
        "exec",
        "node",
        "scripts/check-platform-environment.mjs",
        "--require-running",
        "--require-build",
      ])) === 0
    )
      break;
    if (attempt === 29) throw new Error("PLATFORM_HEALTH_TIMEOUT");
    await delay(1_000);
  }
  process.exitCode = await run(["test:e2e:web-workbench"]);
} finally {
  await run(["stop:platform"]);
}
