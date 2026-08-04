import { existsSync } from "node:fs";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { loadDevelopmentEnvironment } from "./environment.mjs";
import {
  isPortAvailable,
  platformPorts,
  repositoryRoot,
} from "./platform-processes.mjs";

const argumentsSet = new Set(process.argv.slice(2));
const requireBuild = argumentsSet.has("--require-build");
const requireRunning = argumentsSet.has("--require-running");
const requireBrowser = argumentsSet.has("--browser");
const requireProvider = argumentsSet.has("--provider");
if (requireProvider)
  loadDevelopmentEnvironment(
    join(repositoryRoot, "apps", "agent-runtime-host"),
  );
const failures = [];
const nodeMajor = Number(process.versions.node.split(".")[0]);
if (!Number.isInteger(nodeMajor) || nodeMajor < 24)
  failures.push("NODE_VERSION_UNSUPPORTED");
if (!/pnpm\/10\.13\./u.test(process.env.npm_config_user_agent ?? ""))
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

if (requireBrowser) {
  const playwright = join(
    repositoryRoot,
    "apps",
    "web-workbench",
    "node_modules",
    "@playwright",
    "test",
    "cli.js",
  );
  if (!existsSync(playwright)) failures.push("PLAYWRIGHT_PACKAGE_MISSING");
  else {
    const moduleUrl = pathToFileURL(
      join(
        repositoryRoot,
        "apps",
        "web-workbench",
        "node_modules",
        "@playwright",
        "test",
        "index.mjs",
      ),
    ).href;
    const { chromium } = await import(moduleUrl);
    if (!existsSync(chromium.executablePath()))
      failures.push("PLAYWRIGHT_CHROMIUM_MISSING");
  }
}

if (requireProvider) {
  const provider = process.env.PRESENTATION_MODEL_PROVIDER;
  if (!provider || provider === "fixture")
    failures.push("PRESENTATION_PROVIDER_NOT_EXPLICIT");
  for (const name of [
    "PRESENTATION_MODEL_NAME",
    "PRESENTATION_MODEL_API_KEY",
  ]) {
    if (!process.env[name]?.trim())
      failures.push(`PRESENTATION_PROVIDER_VARIABLE_MISSING:${name}`);
  }
  if (
    provider === "openai-compatible" &&
    !process.env.PRESENTATION_MODEL_BASE_URL?.trim()
  )
    failures.push(
      "PRESENTATION_PROVIDER_VARIABLE_MISSING:PRESENTATION_MODEL_BASE_URL",
    );
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
    `Platform environment check failed: ${failures.join(",")}\n` +
      "Run `pnpm check:doctor -- --source --require-build --browser` for a local fixture diagnosis. Values are intentionally never printed.\n",
  );
  process.exitCode = 1;
} else {
  process.stdout.write("Platform environment check passed.\n");
}
