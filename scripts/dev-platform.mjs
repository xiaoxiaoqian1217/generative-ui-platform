import { spawn } from "node:child_process";
import { mkdir, open } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import {
  loadDevelopmentEnvironment,
  redactEnvironmentError,
} from "./environment.mjs";
import {
  assertPortsAvailable,
  createWorkbenchEnvironment,
  readProcessState,
  removeProcessState,
  stopTrackedPlatformProcesses,
  writeProcessState,
} from "./platform-processes.mjs";
import {
  platformServices,
  platformUrls,
  repositoryRoot,
} from "./platform-topology.mjs";

const background = process.argv.includes("--background");
const realProvider = process.argv.includes("--provider=real");
if (
  process.argv.some(
    (argument) =>
      argument.startsWith("--provider=") && argument !== "--provider=real",
  )
)
  throw new Error(
    "PLATFORM_PROVIDER_INVALID: use --provider=real or omit the option for fixture.",
  );
loadDevelopmentEnvironment(join(repositoryRoot, "apps", "agent-runtime-host"));
const pnpmCli = process.env.npm_execpath;
if (!pnpmCli) throw new Error("PACKAGE_MANAGER_CLI_UNAVAILABLE");
if (realProvider) {
  const providerCheck = spawn(
    process.execPath,
    ["scripts/check-platform-environment.mjs", "--provider"],
    {
      cwd: repositoryRoot,
      stdio: "inherit",
      env: process.env,
      windowsHide: true,
    },
  );
  if (
    (await new Promise((resolve) =>
      providerCheck.once("exit", (code) => resolve(code ?? 1)),
    )) !== 0
  )
    throw new Error("PLATFORM_PROVIDER_CONFIGURATION_INVALID");
}
if ((await readProcessState()).length > 0) {
  throw new Error("PLATFORM_ALREADY_RUNNING: run pnpm stop:platform first.");
}
await assertPortsAvailable();
const build = spawn(
  process.execPath,
  [
    pnpmCli,
    "exec",
    "turbo",
    "run",
    "build",
    "--filter=@generative-ui/web-workbench...",
    "--filter=@generative-ui/agent-runtime-host...",
    "--filter=@generative-ui/business-agent-langgraph...",
  ],
  {
    cwd: repositoryRoot,
    stdio: "inherit",
    env: process.env,
    windowsHide: true,
  },
);
if (
  (await new Promise((resolve) =>
    build.once("exit", (code) => resolve(code ?? 1)),
  )) !== 0
)
  throw new Error("PLATFORM_BUILD_FAILED");
const services = platformServices.map((service) => ({
  ...service,
  environment:
    service.name === "Generative UI Workbench"
      ? createWorkbenchEnvironment()
      : {
          ...process.env,
          ...(realProvider ? {} : { PRESENTATION_MODEL_PROVIDER: "fixture" }),
          ...(service.name === "Reference Business Agent"
            ? { BUSINESS_AGENT_PORT: String(service.port) }
            : {}),
          ...(service.name === "Agent Runtime Host"
            ? {
                PORT: String(service.port),
                BUSINESS_AGENT_CONTRACT_URL: platformUrls.businessAgent,
              }
            : {}),
        },
}));

const children = [];
const cleanup = async () => {
  await stopTrackedPlatformProcesses(children);
  await removeProcessState();
};

function attachForegroundLogs(child, name) {
  const prefix = `[${name}] `;
  for (const stream of [child.stdout, child.stderr]) {
    stream?.on("data", (chunk) => {
      const message = redactEnvironmentError(String(chunk))
        .split(/\r?\n/u)
        .filter(Boolean)
        .map((line) => `${prefix}${line}\n`)
        .join("");
      process.stdout.write(message);
    });
  }
}

async function waitForPlatformHealth() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const [workbench, runtime, agent, dependencies] = await Promise.all([
        fetch(`${platformUrls.workbench}/`),
        fetch(`${platformUrls.runtimeHost}/health`),
        fetch(`${platformUrls.businessAgent}/health`),
        fetch(`${platformUrls.runtimeHost}/health/dependencies`),
      ]);
      const body = await dependencies.json();
      if (
        workbench.ok &&
        runtime.ok &&
        agent.ok &&
        dependencies.ok &&
        body.dependencies?.businessAgent?.status === "ready"
      ) {
        return;
      }
    } catch {
      // Services are still starting.
    }
    await delay(1_000);
  }
  throw new Error("PLATFORM_HEALTH_TIMEOUT");
}

async function waitForServiceHealth(service) {
  const url =
    service.name === "Generative UI Workbench"
      ? `${platformUrls.workbench}/`
      : service.name === "Agent Runtime Host"
        ? `${platformUrls.runtimeHost}/health/dependencies`
        : `${platformUrls.businessAgent}/health`;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(url);
      const body =
        service.name === "Agent Runtime Host"
          ? await response.json()
          : undefined;
      if (
        response.ok &&
        (service.name !== "Agent Runtime Host" ||
          body.dependencies?.businessAgent?.status === "ready")
      )
        return;
    } catch {
      // The named service is still starting.
    }
    await delay(1_000);
  }
  throw new Error(`PLATFORM_SERVICE_HEALTH_TIMEOUT:${service.name}`);
}

let started = false;
try {
  for (const service of services) {
    let log;
    if (background) {
      await mkdir(join(repositoryRoot, ".platform", "logs"), {
        recursive: true,
      });
      log = await open(
        join(
          repositoryRoot,
          ".platform",
          "logs",
          `${service.name.replaceAll(/[^a-z0-9]+/giu, "-").toLowerCase()}.log`,
        ),
        "a",
      );
      await log.writeFile(`[${service.name}] process log\n`);
    }
    const child = spawn(process.execPath, service.args, {
      cwd: service.cwd,
      env: service.environment,
      detached: true,
      stdio: background
        ? ["ignore", log.fd, log.fd]
        : ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    child.once("error", (error) =>
      process.stderr.write(
        `${service.name} failed to start: ${error.message}\n`,
      ),
    );
    if (background) child.unref();
    if (!background) attachForegroundLogs(child, service.name);
    children.push(child);
    await waitForServiceHealth(service);
  }
  await writeProcessState(
    children.map((child, index) => ({
      name: services[index].name,
      pid: child.pid,
    })),
  );
  process.stdout.write(
    `Platform starting in ${realProvider ? "real Provider" : "fixture"} mode: Workbench :${platformServices[2].port}, Runtime Host :${platformServices[1].port}, Reference Business Agent :${platformServices[0].port}.\n`,
  );
  await waitForPlatformHealth();
  started = true;
  if (background) {
    process.exitCode = 0;
  } else {
    await new Promise((resolve) => {
      const exit = () => resolve();
      process.once("SIGINT", exit);
      process.once("SIGTERM", exit);
      Promise.all(
        children.map(
          (child) => new Promise((childExit) => child.once("exit", childExit)),
        ),
      ).then(exit);
    });
  }
} finally {
  if (!started || !background) await cleanup();
}
