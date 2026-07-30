import express from "express";
import { loadConfig } from "./config.js";
import { createRuntimeHost } from "./runtime.js";

const config = loadConfig();
const app = express();
const { handler } = createRuntimeHost(config);

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "agent-runtime-host",
    agentId: config.agentId,
    endpoint: config.endpoint,
  });
});

app.use(config.endpoint, handler);

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

app.listen(config.port, config.host, () => {
  console.log(
    `Agent Runtime Host listening at http://${config.host}:${config.port}${config.endpoint}`,
  );
});
