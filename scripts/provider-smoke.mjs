import { spawn } from "node:child_process";
import {
  loadDevelopmentEnvironment,
  redactEnvironmentError,
} from "./environment.mjs";
import { repositoryRoot } from "./platform-topology.mjs";

loadDevelopmentEnvironment(`${repositoryRoot}/apps/agent-runtime-host`);
const check = spawn(
  process.execPath,
  ["scripts/check-platform-environment.mjs", "--provider"],
  {
    cwd: repositoryRoot,
    stdio: "inherit",
    env: process.env,
    windowsHide: true,
  },
);
const code = await new Promise((resolve) =>
  check.once("exit", (value) => resolve(value ?? 1)),
);
if (code !== 0) process.exit(code);
const cli = process.env.npm_execpath;
if (!cli) throw new Error("PACKAGE_MANAGER_CLI_UNAVAILABLE");
const smoke = spawn(
  process.execPath,
  [
    cli,
    "--filter",
    "@generative-ui/presentation-pipeline",
    "test:provider-smoke",
  ],
  {
    cwd: repositoryRoot,
    stdio: "inherit",
    env: process.env,
    windowsHide: true,
  },
);
smoke.once("error", (error) =>
  process.stderr.write(`${redactEnvironmentError(error.message)}\n`),
);
process.exitCode = await new Promise((resolve) =>
  smoke.once("exit", (value) => resolve(value ?? 1)),
);
