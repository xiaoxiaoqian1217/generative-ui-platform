import { spawn } from "node:child_process";
import { repositoryRoot } from "./platform-topology.mjs";

const pnpmCli = process.env.npm_execpath;
if (!pnpmCli) throw new Error("PACKAGE_MANAGER_CLI_UNAVAILABLE");
async function run(args) {
  const child = spawn(process.execPath, [pnpmCli, ...args], {
    cwd: repositoryRoot,
    stdio: "inherit",
    windowsHide: true,
  });
  return new Promise((resolve) =>
    child.once("exit", (code) => resolve(code ?? 1)),
  );
}
for (const args of [
  ["install", "--frozen-lockfile"],
  [
    "--filter",
    "@generative-ui/web-workbench",
    "exec",
    "playwright",
    "install",
    "chromium",
  ],
  ["build:platform"],
]) {
  if ((await run(args)) !== 0) process.exitCode = 1;
  if (process.exitCode) break;
}
if (!process.exitCode)
  process.stdout.write(
    "Setup complete. Next: pnpm dev:platform or pnpm test:e2e:platform\n",
  );
