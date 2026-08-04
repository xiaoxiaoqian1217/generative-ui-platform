import { spawn } from "node:child_process";
import { join } from "node:path";
import { loadDevelopmentEnvironment } from "./environment.mjs";
import { repositoryRoot } from "./platform-topology.mjs";

const applications = {
  "business-agent": {
    directory: "apps/business-agent-langgraph",
    command: ["tsx", "watch", "src/cli.ts"],
  },
  runtime: {
    directory: "apps/agent-runtime-host",
    command: ["tsx", "watch", "src/main.ts"],
  },
  workbench: {
    directory: "apps/web-workbench",
    command: ["vite", "--host", "0.0.0.0"],
  },
};
const application = applications[process.argv[2]];
if (!application)
  throw new Error(
    "APPLICATION_NAME_REQUIRED: business-agent, runtime, or workbench",
  );

const cwd = join(repositoryRoot, application.directory);
loadDevelopmentEnvironment(cwd);
const pnpmCli = process.env.npm_execpath;
if (!pnpmCli) throw new Error("PACKAGE_MANAGER_CLI_UNAVAILABLE");
const build = spawn(
  process.execPath,
  [
    pnpmCli,
    "exec",
    "turbo",
    "run",
    "build",
    `--filter=@generative-ui/${application.directory.split("/").at(-1)}...`,
  ],
  {
    cwd: repositoryRoot,
    stdio: "inherit",
    env: process.env,
    windowsHide: true,
  },
);
const buildCode = await new Promise((resolve) =>
  build.once("exit", (code) => resolve(code ?? 1)),
);
if (buildCode !== 0) process.exit(buildCode);
const child = spawn(
  process.execPath,
  [pnpmCli, "exec", ...application.command],
  { cwd, stdio: "inherit", env: process.env, windowsHide: true },
);
child.once("exit", (code) => {
  process.exitCode = code ?? 1;
});
