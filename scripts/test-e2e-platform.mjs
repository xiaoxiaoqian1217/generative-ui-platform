import { spawn } from "node:child_process";
import { join } from "node:path";
import { repositoryRoot } from "./platform-processes.mjs";

const packageManagerCli = process.env.npm_execpath;
if (packageManagerCli === undefined)
  throw new Error("PACKAGE_MANAGER_CLI_UNAVAILABLE");

const playwrightCli = join(
  repositoryRoot,
  "apps",
  "web-workbench",
  "node_modules",
  "@playwright",
  "test",
  "cli.js",
);

function run(command, args, cwd, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env: {
        ...process.env,
        ...env,
        npm_config_user_agent:
          process.env.npm_config_user_agent ?? "pnpm/10.13.1",
      },
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("exit", (code) => resolve(code ?? 1));
    child.once("error", () => resolve(1));
  });
}

if (
  (await run(
    process.execPath,
    [packageManagerCli, "--filter", "@generative-ui/web-workbench", "build"],
    repositoryRoot,
  )) !== 0
)
  throw new Error("PLATFORM_E2E_BUILD_FAILED");

if (
  (await run(
    process.execPath,
    [playwrightCli, "test", "--config", "playwright.config.ts"],
    join(repositoryRoot, "apps", "web-workbench"),
    { WEB_WORKBENCH_E2E_MODE: "platform" },
  )) !== 0
)
  throw new Error("PLATFORM_E2E_FAILED");
