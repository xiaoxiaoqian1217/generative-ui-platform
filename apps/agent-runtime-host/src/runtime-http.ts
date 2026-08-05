import {
  validateCreateRuntimeThreadRequest,
  validateRenameRuntimeThreadRequest,
} from "@generative-ui/runtime-contract";
import type { Express, Request, Response } from "express";
import type { RuntimeHostConfig } from "./config.js";
import { createRuntimeDependenciesHealth } from "./dependency-health.js";
import type { RuntimeHost } from "./runtime.js";

export const RUNTIME_RUNS_PATH = "/api/runs";
export const RUNTIME_ACTIONS_PATH = "/api/actions";
export const RUNTIME_DEPENDENCIES_HEALTH_PATH = "/health/dependencies";
export const RUNTIME_CATALOG_PATH = "/api/catalog";
export const RUNTIME_SCENARIOS_PATH = "/api/scenarios";
export const RUNTIME_THREADS_PATH = "/api/threads";

function setCors(response: Response): void {
  response.set({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
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
    const result = await host.run(request.body, signalFromRequest(request));
    response.status(result.status === "failed" ? 400 : 200).json(result);
  });
  app.post(RUNTIME_ACTIONS_PATH, async (request, response) => {
    setCors(response);
    const result = await host.action(request.body, signalFromRequest(request));
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
  app.options(RUNTIME_THREADS_PATH, (_request, response) => {
    setCors(response);
    response.sendStatus(204);
  });
  app.options(`${RUNTIME_THREADS_PATH}/:threadId`, (_request, response) => {
    setCors(response);
    response.sendStatus(204);
  });
  app.get(RUNTIME_THREADS_PATH, (request, response) => {
    setCors(response);
    response.json(
      host.threadRepository.list(
        typeof request.query.cursor === "string"
          ? request.query.cursor
          : undefined,
      ),
    );
  });
  app.post(RUNTIME_THREADS_PATH, (request, response) => {
    setCors(response);
    const validated = validateCreateRuntimeThreadRequest(request.body);
    if (!validated.success) {
      response
        .status(400)
        .json({
          code: "REQUEST_INVALID",
          message: "The thread create request is invalid.",
          retryable: false,
        });
      return;
    }
    response
      .status(201)
      .json(host.threadRepository.create(validated.value.title));
  });
  app.get(`${RUNTIME_THREADS_PATH}/:threadId`, (request, response) => {
    setCors(response);
    const detail = host.threadRepository.get(request.params.threadId);
    response
      .status(detail ? 200 : 404)
      .json(
        detail ?? {
          code: "THREAD_NOT_FOUND",
          message: "Thread was not found.",
          retryable: false,
        },
      );
  });
  app.post(`${RUNTIME_THREADS_PATH}/:threadId/rename`, (request, response) => {
    setCors(response);
    const validated = validateRenameRuntimeThreadRequest(request.body);
    if (!validated.success) {
      response
        .status(400)
        .json({
          code: "REQUEST_INVALID",
          message: "The thread rename request is invalid.",
          retryable: false,
        });
      return;
    }
    const thread = host.threadRepository.rename(
      request.params.threadId,
      validated.value.title,
    );
    response
      .status(thread ? 200 : 404)
      .json(
        thread ?? {
          code: "THREAD_NOT_FOUND",
          message: "Thread was not found.",
          retryable: false,
        },
      );
  });
  app.post(`${RUNTIME_THREADS_PATH}/:threadId/archive`, (request, response) => {
    setCors(response);
    const thread = host.threadRepository.archive(request.params.threadId);
    response
      .status(thread ? 200 : 404)
      .json(
        thread ?? {
          code: "THREAD_NOT_FOUND",
          message: "Thread was not found.",
          retryable: false,
        },
      );
  });
  app.delete(`${RUNTIME_THREADS_PATH}/:threadId`, async (request, response) => {
    setCors(response);
    const status = await host.deleteThread(request.params.threadId);
    response
      .status(status === "completed" ? 200 : status === "partial" ? 409 : 503)
      .json({ status });
  });
  app.delete(RUNTIME_THREADS_PATH, async (_request, response) => {
    setCors(response);
    const result = await host.clearThreads();
    response
      .status(result.failed === 0 && result.partial === 0 ? 200 : 409)
      .json(result);
  });
}
