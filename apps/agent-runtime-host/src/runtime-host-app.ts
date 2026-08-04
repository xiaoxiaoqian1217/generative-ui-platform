import express, { type Express } from "express";
import type { RuntimeHostConfig } from "./config.js";
import { RUNTIME_SOCKET_PATH } from "./demo-socket.js";
import type { RuntimeHost } from "./runtime.js";
import {
  attachRuntimeHttp,
  RUNTIME_ACTIONS_PATH,
  RUNTIME_CATALOG_PATH,
  RUNTIME_DEPENDENCIES_HEALTH_PATH,
  RUNTIME_RUNS_PATH,
  RUNTIME_SCENARIOS_PATH,
} from "./runtime-http.js";

export function createRuntimeHostApp(
  host: RuntimeHost,
  config: RuntimeHostConfig,
): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_request, response) => {
    response.set("Access-Control-Allow-Origin", "*");
    response.json({
      status: "ok",
      service: "agent-runtime-host",
      runtimeContract: {
        runsPath: RUNTIME_RUNS_PATH,
        actionsPath: RUNTIME_ACTIONS_PATH,
        catalogPath: RUNTIME_CATALOG_PATH,
        scenariosPath: RUNTIME_SCENARIOS_PATH,
        socketPath: RUNTIME_SOCKET_PATH,
        copilotKitPath: config.endpoint,
      },
      dependenciesPath: RUNTIME_DEPENDENCIES_HEALTH_PATH,
    });
  });

  attachRuntimeHttp(app, host, config);
  app.use(config.endpoint, host.handler);

  app.use(
    (
      error: unknown,
      _request: express.Request,
      response: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error(error);
      response.status(500).json({
        error: "runtime_host_error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    },
  );

  return app;
}
