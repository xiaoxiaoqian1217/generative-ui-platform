import type { Express, Request, Response } from "express";
import type { RuntimeHostConfig } from "./config.js";
import { createRuntimeDependenciesHealth } from "./dependency-health.js";
import type { RuntimeHost } from "./runtime.js";

export const RUNTIME_RUNS_PATH = "/api/runs";
export const RUNTIME_ACTIONS_PATH = "/api/actions";
export const RUNTIME_DEPENDENCIES_HEALTH_PATH = "/health/dependencies";
export const RUNTIME_CATALOG_PATH = "/api/catalog";
export const RUNTIME_SCENARIOS_PATH = "/api/scenarios";

function setCors(response: Response): void {
  response.set({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  });
}

function signalFromRequest(request: Request): AbortSignal {
  const controller = new AbortController();
  request.once("aborted", () =>
    controller.abort(new Error("Client disconnected.")),
  );
  return controller.signal;
}

export function attachRuntimeHttp(
  app: Express,
  host: RuntimeHost,
  config: RuntimeHostConfig,
): void {
  for (const path of [RUNTIME_RUNS_PATH, RUNTIME_ACTIONS_PATH])
    app.options(path, (_request, response) => {
      setCors(response);
      response.sendStatus(204);
    });
  app.post(RUNTIME_RUNS_PATH, async (request, response) => {
    setCors(response);
    const result = await host.orchestrator.run(
      request.body,
      signalFromRequest(request),
    );
    response.status(result.status === "failed" ? 400 : 200).json(result);
  });
  app.post(RUNTIME_ACTIONS_PATH, async (request, response) => {
    setCors(response);
    const result = await host.orchestrator.action(
      request.body,
      signalFromRequest(request),
    );
    response.status(result.status === "failed" ? 409 : 200).json(result);
  });
  app.get(RUNTIME_DEPENDENCIES_HEALTH_PATH, async (_request, response) => {
    const health = await createRuntimeDependenciesHealth(config);
    response.status(health.status === "ok" ? 200 : 503).json({
      ...health,
      capacity: {
        activeRuns: host.orchestrator.capacity.activeRuns(),
        maxConcurrentRuns: host.orchestrator.capacity.maxConcurrentRuns,
      },
    });
  });
  for (const path of [RUNTIME_CATALOG_PATH, RUNTIME_SCENARIOS_PATH])
    app.options(path, (_request, response) => {
      setCors(response);
      response.sendStatus(204);
    });
  app.get(RUNTIME_CATALOG_PATH, (_request, response) => {
    setCors(response);
    response.json(host.catalogSummary);
  });
  app.get(RUNTIME_SCENARIOS_PATH, (_request, response) => {
    setCors(response);
    response.json({ scenarios: host.scenarios });
  });
}
