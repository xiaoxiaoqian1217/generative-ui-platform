import { createServer } from "node:http";
import express from "express";
import { loadConfig } from "./config.js";
import { attachDemoHttp, DEMO_HTTP_PATH } from "./demo-http.js";
import { attachDemoSocket, DEMO_SOCKET_PATH } from "./demo-socket.js";
import { createRuntimeHost } from "./runtime.js";

const config = loadConfig();
const app = express();
const { handler } = createRuntimeHost(config);

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  response.json({
    status: "ok",
    service: "agent-runtime-host",
    agentId: config.agentId,
    endpoint: config.endpoint,
    demoHttpPath: DEMO_HTTP_PATH,
    demoSocketPath: DEMO_SOCKET_PATH,
    businessAgentConnected: false,
  });
});

attachDemoHttp(app);
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

const server = createServer(app);
attachDemoSocket(server);

server.listen(config.port, config.host, () => {
  console.log(
    `Agent Runtime Host listening at http://${config.host}:${config.port}${config.endpoint}`,
  );
  console.log(
    `Mock HTTP demo listening at http://${config.host}:${config.port}${DEMO_HTTP_PATH}`,
  );
  console.log(
    `Mock WebSocket demo listening at ws://${config.host}:${config.port}${DEMO_SOCKET_PATH}`,
  );
});
