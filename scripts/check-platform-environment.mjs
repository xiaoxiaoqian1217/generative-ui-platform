import { access } from "node:fs/promises";
import { join } from "node:path";
import {
  isPortAvailable,
  platformPorts,
  repositoryRoot,
} from "./platform-processes.mjs";

const argumentsSet = new Set(process.argv.slice(2));
const requireBuild = argumentsSet.has("--require-build");
const requireRunning = argumentsSet.has("--require-running");
const failures = [];
const nodeMajor = Number(process.versions.node.split(".")[0]);
if (!Number.isInteger(nodeMajor) || nodeMajor < 24)
  failures.push("NODE_VERSION_UNSUPPORTED");
if (
  !/pnpm\/(?:1[0-9]|[2-9][0-9])\./u.test(
    process.env.npm_config_user_agent ?? "",
  )
)
  failures.push("PNPM_VERSION_UNSUPPORTED");

const forbiddenEnvironment = Object.keys(process.env).filter((name) =>
  /(?:UI_COMPILER.*(?:URL|PORT)|(?:URL|PORT).*UI_COMPILER)/iu.test(name),
);
if (forbiddenEnvironment.length > 0)
  failures.push("UI_COMPILER_CONFIGURATION_FORBIDDEN");
const unsafeFrontendVariables = Object.keys(process.env).filter(
  (name) =>
    name.startsWith("VITE_") &&
    !["VITE_RUNTIME_HOST_URL", "VITE_WORKBENCH_ENVIRONMENT"].includes(name),
);
if (unsafeFrontendVariables.length > 0)
  failures.push("FRONTEND_ENVIRONMENT_UNSAFE");

if (requireBuild) {
  for (const path of [
    "apps/business-agent-langgraph/dist/cli.js",
    "apps/agent-runtime-host/dist/main.js",
    "apps/web-workbench/dist/index.html",
  ]) {
    try {
      await access(join(repositoryRoot, path));
    } catch {
      failures.push("BUILD_ARTIFACT_MISSING");
      break;
    }
  }
}

if (requireRunning) {
  for (const service of platformPorts) {
    try {
      const response = await fetch(
        `http://127.0.0.1:${service.port}${service.port === 5173 ? "/" : "/health"}`,
      );
      if (!response.ok) failures.push(`SERVICE_UNHEALTHY:${service.name}`);
    } catch {
      failures.push(`SERVICE_UNREACHABLE:${service.name}`);
    }
  }
  try {
    const response = await fetch("http://127.0.0.1:8200/health/dependencies");
    const body = await response.json();
    if (
      !response.ok ||
      body.status !== "ok" ||
      body.dependencies?.businessAgent?.status !== "ready"
    )
      failures.push("RUNTIME_DEPENDENCIES_DEGRADED");
    for (const name of ["presentationPipeline", "modelProvider", "catalog"]) {
      if (
        body.dependencies?.[name]?.kind !== "in-process" ||
        body.dependencies?.[name]?.status !== "ready"
      )
        failures.push(`RUNTIME_${name.toUpperCase()}_NOT_READY`);
    }
  } catch {
    failures.push("RUNTIME_DEPENDENCIES_UNAVAILABLE");
  }
} else {
  for (const service of platformPorts) {
    if (!(await isPortAvailable(service.port))) {
      failures.push(`PORT_UNAVAILABLE:${service.name}`);
    }
  }
}

if (failures.length > 0) {
  process.stderr.write(
    `Platform environment check failed: ${failures.join(",")}\n`,
  );
  process.exitCode = 1;
} else {
  process.stdout.write("Platform environment check passed.\n");
}
