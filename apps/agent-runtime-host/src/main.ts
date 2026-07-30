import { existsSync } from "node:fs";
import { createServer, type ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import { loadRuntimeHostConfig } from "./config.js";
import {
  createAgentRuntimeHost,
  isRuntimeRequestPath,
} from "./runtime.js";

const envFilePath = fileURLToPath(new URL("../.env", import.meta.url));

if (existsSync(envFilePath)) {
  process.loadEnvFile(envFilePath);
}

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
    });
    return;
  }

  if (isRuntimeRequestPath(requestUrl.pathname, config.basePath)) {
    void nodeHandler(request, response);
    return;
  }

  writeJson(response, 404, {
    status: "not_found",
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
      console.error("[agent-runtime-host] shutdown failed", error);
      process.exitCode = 1;
      return;
    }

    process.exitCode = 0;
  });
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
