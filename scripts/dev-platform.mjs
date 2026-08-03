import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import {
  assertPortsAvailable,
  readProcessState,
  removeProcessState,
  repositoryRoot,
  stopTrackedPlatformProcesses,
  writeProcessState,
} from "./platform-processes.mjs";

const background = process.argv.includes("--background");
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const webEnvironment = Object.fromEntries(
  Object.entries(process.env).filter(([name]) => !name.startsWith("VITE_")),
);
const services = [
  {
    name: "Reference Business Agent",
    filter: "@generative-ui/business-agent-langgraph",
    environment: {},
  },
  {
    name: "Agent Runtime Host",
    filter: "@generative-ui/agent-runtime-host",
    environment: { BUSINESS_AGENT_CONTRACT_URL: "http://127.0.0.1:8300" },
  },
  {
    name: "Generative UI Workbench",
    filter: "@generative-ui/web-workbench",
    environment: {
      ...webEnvironment,
      VITE_RUNTIME_HOST_URL: "http://127.0.0.1:8200",
      VITE_WORKBENCH_ENVIRONMENT: "platform-local",
    },
  },
];

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
        fetch("http://127.0.0.1:5173/"),
        fetch("http://127.0.0.1:8200/health"),
        fetch("http://127.0.0.1:8300/health"),
        fetch("http://127.0.0.1:8200/health/dependencies"),
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
    const child = spawn(pnpmCommand, ["--filter", service.filter, "dev"], {
      cwd: repositoryRoot,
      env: { ...process.env, ...service.environment },
      detached: process.platform !== "win32",
      shell: process.platform === "win32",
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
