import { mkdir, readFile, readlink, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

export const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
export const stateFile = join(repositoryRoot, ".platform", "processes.json");
export const platformPorts = Object.freeze([
  { name: "Workbench", port: 5173 },
  { name: "Agent Runtime Host", port: 8200 },
  { name: "Reference Business Agent", port: 8300 },
]);
const platformServiceNames = new Set([
  "Reference Business Agent",
  "Agent Runtime Host",
  "Generative UI Workbench",
]);
const platformProcessMarkers = new Map([
  ["Reference Business Agent", "@generative-ui/business-agent-langgraph"],
  ["Agent Runtime Host", "@generative-ui/agent-runtime-host"],
  ["Generative UI Workbench", "@generative-ui/web-workbench"],
]);

export async function readProcessState() {
  try {
    const parsed = JSON.parse(await readFile(stateFile, "utf8"));
    if (
      !Array.isArray(parsed) ||
      parsed.some(
        (entry) =>
          typeof entry !== "object" ||
          entry === null ||
          typeof entry.name !== "string" ||
          !platformServiceNames.has(entry.name) ||
          !Number.isSafeInteger(entry.pid) ||
          entry.pid <= 0,
      )
    ) {
      throw new Error("PLATFORM_PROCESS_STATE_INVALID");
    }
    return parsed;
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT")
      return [];
    throw new Error("PLATFORM_PROCESS_STATE_INVALID");
  }
}

export async function writeProcessState(processes) {
  await mkdir(dirname(stateFile), { recursive: true });
  await writeFile(stateFile, `${JSON.stringify(processes)}\n`, "utf8");
}

export async function removeProcessState() {
  await rm(stateFile, { force: true });
}

export async function assertPortsAvailable() {
  const unavailable = [];
  for (const service of platformPorts) {
    if (!(await isPortAvailable(service.port))) unavailable.push(service.name);
  }
  if (unavailable.length > 0) {
    throw new Error(`PLATFORM_PORT_IN_USE:${unavailable.join(",")}`);
  }
}

export function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.listen({ host: "127.0.0.1", port }, () => {
      server.close(() => resolve(true));
    });
  });
}

export async function waitForPlatformPortsAvailable(
  timeoutMs = 10_000,
  stableMs = 2_000,
) {
  const deadline = Date.now() + timeoutMs;
  let availableSince;
  while (Date.now() < deadline) {
    const available = await Promise.all(
      platformPorts.map(({ port }) => isPortAvailable(port)),
    );
    if (available.every(Boolean)) {
      availableSince ??= Date.now();
      if (Date.now() - availableSince >= stableMs) return true;
    } else {
      availableSince = undefined;
    }
    await delay(100);
  }
  return false;
}

export async function stopProcessTree(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return;
  if (process.platform === "win32") {
    const { spawn } = await import("node:child_process");
    await new Promise((resolve) => {
      const taskkill = spawn("taskkill", ["/pid", String(pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
      taskkill.once("close", resolve);
      taskkill.once("error", resolve);
    });
    return;
  }

  if (!signalProcessGroup(pid, "SIGTERM")) return;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await delay(100);
    if (!isProcessGroupRunning(pid)) return;
  }
  signalProcessGroup(pid, "SIGKILL");
}

export async function stopTrackedPlatformProcesses(processes) {
  await Promise.all(
    processes.map(async ({ name, pid }) => {
      if (await isPlatformProcess(pid, name)) await stopProcessTree(pid);
    }),
  );
  if (process.platform === "win32" && processes.length > 0) {
    const { spawn } = await import("node:child_process");
    const output = await new Promise((resolve) => {
      let stdout = "";
      const netstat = spawn("netstat", ["-ano"], { windowsHide: true });
      netstat.stdout.on("data", (chunk) => {
        stdout += String(chunk);
      });
      netstat.once("close", () => resolve(stdout));
      netstat.once("error", () => resolve(""));
    });
    const pids = new Set();
    for (const line of output.split(/\r?\n/u)) {
      const match = /:(5173|8200|8300)\s+\S+\s+LISTENING\s+(\d+)$/u.exec(
        line.trim(),
      );
      if (match) pids.add(Number(match[2]));
    }
    await Promise.all(
      [...pids].map(async (pid) => {
        if (await isPlatformProcess(pid)) await stopProcessTree(pid);
      }),
    );
  }
  if (!(await waitForPlatformPortsAvailable())) {
    throw new Error("PLATFORM_PROCESS_CLEANUP_FAILED");
  }
}

function signalProcessGroup(pid, signal) {
  try {
    process.kill(-pid, signal);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    throw error;
  }
}

function isProcessGroupRunning(pid) {
  try {
    process.kill(-pid, 0);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    throw error;
  }
}

async function isPlatformProcess(pid, name) {
  const normalize = (value) => value.replaceAll("\\", "/").toLowerCase();
  const commandLine = normalize(await readProcessCommandLine(pid));
  const root = normalize(repositoryRoot);
  const marker = name ? normalize(platformProcessMarkers.get(name) ?? "") : "";
  if (commandLine.includes(root) || (marker && commandLine.includes(marker))) {
    return true;
  }
  if (process.platform !== "linux") return false;
  try {
    const workingDirectory = normalize(await readlink(`/proc/${pid}/cwd`));
    return workingDirectory === root || workingDirectory.startsWith(`${root}/`);
  } catch {
    return false;
  }
}

async function readProcessCommandLine(pid) {
  const { spawn } = await import("node:child_process");
  const command =
    process.platform === "win32"
      ? "(Get-CimInstance Win32_Process -Filter 'ProcessId = " +
        `${pid}` +
        "').CommandLine"
      : `ps -p ${pid} -o command=`;
  const executable = process.platform === "win32" ? "powershell" : "sh";
  const args =
    process.platform === "win32"
      ? ["-NoProfile", "-Command", command]
      : ["-c", command];
  return new Promise((resolve) => {
    let stdout = "";
    const child = spawn(executable, args, { windowsHide: true });
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.once("close", () => resolve(stdout));
    child.once("error", () => resolve(""));
  });
}
