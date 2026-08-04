import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

const tsxCli = join(repositoryRoot, "node_modules", "tsx", "dist", "cli.mjs");
const workbenchDirectory = join(repositoryRoot, "apps", "web-workbench");

export const platformServices = Object.freeze([
  Object.freeze({
    name: "Reference Business Agent",
    healthName: "Reference Business Agent",
    port: 8300,
    cwd: join(repositoryRoot, "apps", "business-agent-langgraph"),
    args: Object.freeze([tsxCli, "watch", "src/cli.ts"]),
    processMarker: "@generative-ui/business-agent-langgraph",
  }),
  Object.freeze({
    name: "Agent Runtime Host",
    healthName: "Agent Runtime Host",
    port: 8200,
    cwd: join(repositoryRoot, "apps", "agent-runtime-host"),
    args: Object.freeze([tsxCli, "watch", "src/main.ts"]),
    processMarker: "@generative-ui/agent-runtime-host",
  }),
  Object.freeze({
    name: "Generative UI Workbench",
    healthName: "Workbench",
    port: 5173,
    cwd: workbenchDirectory,
    args: Object.freeze([
      join(workbenchDirectory, "node_modules", "vite", "bin", "vite.js"),
      "--host",
      "0.0.0.0",
    ]),
    processMarker: "@generative-ui/web-workbench",
  }),
]);

const serviceByName = new Map(
  platformServices.map((service) => [service.name, service]),
);
const serviceUrl = (name) => {
  const service = serviceByName.get(name);
  if (service === undefined)
    throw new Error(`PLATFORM_SERVICE_UNKNOWN:${name}`);
  return `http://127.0.0.1:${service.port}`;
};

export const platformUrls = Object.freeze({
  businessAgent: serviceUrl("Reference Business Agent"),
  runtimeHost: serviceUrl("Agent Runtime Host"),
  workbench: serviceUrl("Generative UI Workbench"),
});
