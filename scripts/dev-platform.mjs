import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import {
  assertPortsAvailable,
  createWorkbenchEnvironment,
  readProcessState,
  removeProcessState,
  stopTrackedPlatformProcesses,
  writeProcessState,
} from "./platform-processes.mjs";
import { platformServices, platformUrls } from "./platform-topology.mjs";

const background = process.argv.includes("--background");
const services = platformServices.map((service) => ({
  ...service,
  environment:
    service.name === "Generative UI Workbench"
      ? createWorkbenchEnvironment()
      : {
          ...process.env,
          ...(service.name === "Agent Runtime Host"
            ? { BUSINESS_AGENT_CONTRACT_URL: platformUrls.businessAgent }
            : {}),
        },
}));

if ((await readProcessState()).length > 0) {
  throw new Error("PLATFORM_ALREADY_RUNNING: run pnpm stop:platform first.");
}
await assertPortsAvailable();

const children = [];
const cleanup = async () => {
  await stopTrackedPlatformProcesses(children);
  await removeProcessState();
};

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

let started = false;
try {
  for (const service of services) {
    const child = spawn(process.execPath, service.args, {
      cwd: service.cwd,
      env: service.environment,
      detached: true,
      stdio: background ? "ignore" : "inherit",
      windowsHide: true,
    });
    child.once("error", (error) =>
      process.stderr.write(
        `${service.name} failed to start: ${error.message}\n`,
      ),
    );
    if (background) child.unref();
    children.push(child);
  }
  await writeProcessState(
    children.map((child, index) => ({
      name: services[index].name,
      pid: child.pid,
    })),
  );
  process.stdout.write(
    "Platform starting: Workbench :5173, Runtime Host :8200, Reference Business Agent :8300.\n",
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
