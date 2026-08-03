import type { Express, Request, Response } from "express";
import type { RuntimeHost } from "./runtime.js";

export const RUNTIME_RUNS_PATH = "/api/runs";
export const RUNTIME_ACTIONS_PATH = "/api/actions";
export const RUNTIME_DEPENDENCIES_HEALTH_PATH = "/health/dependencies";

function setCors(response: Response): void {
  response.set({ "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" });
}

function signalFromRequest(request: Request): AbortSignal {
  const controller = new AbortController();
  request.once("aborted", () => controller.abort(new Error("Client disconnected.")));
  return controller.signal;
}

export function attachRuntimeHttp(app: Express, host: RuntimeHost): void {
  for (const path of [RUNTIME_RUNS_PATH, RUNTIME_ACTIONS_PATH]) app.options(path, (_request, response) => { setCors(response); response.sendStatus(204); });
  app.post(RUNTIME_RUNS_PATH, async (request, response) => {
    setCors(response);
    const result = await host.orchestrator.run(request.body, signalFromRequest(request));
    response.status(result.status === "failed" ? 400 : 200).json(result);
  });
  app.post(RUNTIME_ACTIONS_PATH, async (request, response) => {
    setCors(response);
    const result = await host.orchestrator.action(request.body, signalFromRequest(request));
    response.status(result.status === "failed" ? 409 : 200).json(result);
  });
  app.get(RUNTIME_DEPENDENCIES_HEALTH_PATH, (_request, response) => {
    response.json({ status: "ok", dependencies: { businessAgent: { kind: "remote", status: "configured" }, presentationPipeline: { kind: "in-process", status: "ready" }, catalog: { kind: "in-process", status: "ready" }, fixtureAdapter: { kind: "in-process", status: "ready" } }, capacity: { activeRuns: host.orchestrator.capacity.activeRuns(), maxConcurrentRuns: host.orchestrator.capacity.maxConcurrentRuns } });
  });
}
