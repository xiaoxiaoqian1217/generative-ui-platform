import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const packageManagerCli = process.env.npm_execpath;
if (packageManagerCli === undefined) {
  throw new Error("PACKAGE_MANAGER_CLI_UNAVAILABLE");
}

const build = spawn(
  process.execPath,
  [packageManagerCli, "exec", "vite", "build"],
  {
    cwd: appRoot,
    env: { ...process.env, VITE_ALLOW_AG_UI_MOCK: "true" },
    stdio: "inherit",
    windowsHide: true,
  },
);

const exitCode = await new Promise((resolve) => {
  build.once("exit", (code) => resolve(code ?? 1));
  build.once("error", () => resolve(1));
});
process.exitCode = exitCode;
