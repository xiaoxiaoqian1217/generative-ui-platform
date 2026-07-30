import { createServer, type ServerResponse } from "node:http";
import { loadRuntimeHostConfig } from "./config.js";
import { createAgentRuntimeHost } from "./runtime.js";

const config = loadRuntimeHostConfig();
const { nodeHandler } = createAgentRuntimeHost(config);

function writeJson(
  response: ServerResponse,
  statusCode: number,
  body: Record<string, unknown>,
): void {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

const server = createServer((request, response) => {
  const requestUrl = new URL(
    request.url ?? "/",
    `http://${request.headers.host ?? "localhost"}`,
  );

  if (request.method === "GET" && requestUrl.pathname === "/health") {
    writeJson(response, 200, {
      status: "ok",
      service: "agent-runtime-host",
      runtimePath: config.basePath,
      defaultAgent: "default",
      model: config.model,
    });
    return;
  }

  if (requestUrl.pathname.startsWith(config.basePath)) {
    Promise.resolve(nodeHandler(request, response)).catch(() => {
      console.error("[agent-runtime-host] runtime request failed");

      if (!response.headersSent) {
        writeJson(response, 500, {
          status: "error",
          code: "RUNTIME_REQUEST_FAILED",
        });
        return;
      }

      if (!response.writableEnded) {
        response.end();
      }
    });
    return;
  }

  writeJson(response, 404, {
    status: "not_found",
    code: "ROUTE_NOT_FOUND",
    message: `请访问 ${config.basePath} 或 /health。`,
  });
});

server.listen(config.port, config.host, () => {
  console.log(
    `[agent-runtime-host] listening on http://${config.host}:${config.port}${config.basePath}`,
  );
});

function shutdown(signal: NodeJS.Signals): void {
  console.log(`[agent-runtime-host] received ${signal}, shutting down`);
  server.close((error) => {
    if (error) {
      console.error("[agent-runtime-host] shutdown failed");
      process.exitCode = 1;
      return;
    }

    process.exitCode = 0;
  });
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
