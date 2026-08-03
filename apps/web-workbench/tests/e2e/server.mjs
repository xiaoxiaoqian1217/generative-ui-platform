import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";

const appRoot = fileURLToPath(new URL("../..", import.meta.url));
const distRoot = join(appRoot, "dist");
const port = Number(process.env.WEB_WORKBENCH_E2E_PORT ?? "4173");
const sockets = new Set();
let acceptWebSockets = true;
let runtimeAvailable = true;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function json(response, status, value) {
  response.writeHead(status, { "content-type": contentTypes[".json"] });
  response.end(JSON.stringify(value));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function runtimeResult(request) {
  const wantsA2UI = request.message.content.includes("A2UI");
  const presentationRequestId = `presentation-${request.requestId}`;
  return {
    protocolVersion: "1.0",
    requestId: request.requestId,
    threadId: "thread-e2e",
    runId: `run-${request.requestId}`,
    presentationRequestId,
    status: "completed",
    presentation: wantsA2UI
      ? {
          requestId: presentationRequestId,
          status: "completed",
          mode: "generative-ui",
          surfaceId: "surface-e2e",
          operations: [
            {
              version: "v0.9",
              createSurface: {
                surfaceId: "surface-e2e",
                catalogId: "workbench-fixture",
              },
            },
            {
              version: "v0.9",
              updateComponents: {
                surfaceId: "surface-e2e",
                components: [
                  {
                    id: "root",
                    component: "Card",
                    title: { path: "/sourceData/title" },
                    children: ["confirm"],
                  },
                  {
                    id: "confirm",
                    component: "Button",
                    label: "Confirm",
                  },
                ],
              },
            },
            {
              version: "v0.9",
              updateDataModel: {
                surfaceId: "surface-e2e",
                path: "/",
                value: { sourceData: { title: "Ready" } },
              },
            },
          ],
        }
      : {
          requestId: presentationRequestId,
          status: "completed",
          mode: "markdown",
          markdown:
            "## Runtime 在线\n\n**Markdown 已安全渲染。** <script>window.__unsafe = true</script>",
        },
    diagnostics: {
      stages: [
        { name: "runtime", status: "completed", durationMs: 3 },
        { name: "business-agent", status: "completed", durationMs: 12 },
        { name: "presentation-pipeline", status: "completed", durationMs: 8 },
      ],
    },
  };
}

async function serveStatic(request, response) {
  const requestUrl = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
  const relativePath =
    requestUrl.pathname === "/" ? "index.html" : requestUrl.pathname.slice(1);
  const candidate = resolve(distRoot, relativePath);
  const candidateRelativePath = relative(distRoot, candidate);
  if (
    candidateRelativePath.startsWith("..") ||
    isAbsolute(candidateRelativePath)
  ) {
    response.writeHead(404).end();
    return;
  }

  let filePath = candidate;
  try {
    if (!(await stat(filePath)).isFile()) {
      filePath = join(distRoot, "index.html");
    }
  } catch {
    filePath = join(distRoot, "index.html");
  }
  const content = await readFile(filePath);
  response.writeHead(200, {
    "cache-control": "no-store",
    "content-type":
      contentTypes[extname(filePath)] ?? "application/octet-stream",
  });
  response.end(content);
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
  if (request.method === "GET" && url.pathname === "/workbench-health") {
    response.writeHead(204).end();
    return;
  }
  if (request.method === "GET" && url.pathname === "/health/dependencies") {
    json(response, runtimeAvailable ? 200 : 503, {
      status: runtimeAvailable ? "ok" : "unavailable",
    });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/runs") {
    if (!runtimeAvailable) {
      json(response, 503, { status: "unavailable" });
      return;
    }
    const body = await readJson(request);
    json(response, 200, runtimeResult(body));
    return;
  }
  if (request.method === "POST" && url.pathname === "/__control__/disconnect") {
    acceptWebSockets = false;
    for (const socket of sockets) {
      socket.terminate();
    }
    response.writeHead(204).end();
    return;
  }
  if (request.method === "POST" && url.pathname === "/__control__/restore") {
    acceptWebSockets = true;
    response.writeHead(204).end();
    return;
  }
  if (
    request.method === "POST" &&
    url.pathname === "/__control__/runtime-down"
  ) {
    runtimeAvailable = false;
    response.writeHead(204).end();
    return;
  }
  if (request.method === "POST" && url.pathname === "/__control__/runtime-up") {
    runtimeAvailable = true;
    response.writeHead(204).end();
    return;
  }
  await serveStatic(request, response);
});

const webSockets = new WebSocketServer({ noServer: true });
webSockets.on("connection", (socket) => {
  sockets.add(socket);
  socket.on("close", () => sockets.delete(socket));
  socket.on("message", (data) => {
    const message = JSON.parse(data.toString("utf8"));
    if (message.type === "runtime.run.request") {
      socket.send(
        JSON.stringify({
          type: "runtime.run.result",
          payload: runtimeResult(message.payload),
        }),
      );
    }
  });
});

server.on("upgrade", (request, socket, head) => {
  if (request.url !== "/ws/runs" || !acceptWebSockets) {
    socket.destroy();
    return;
  }
  webSockets.handleUpgrade(request, socket, head, (webSocket) => {
    webSockets.emit("connection", webSocket, request);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Workbench E2E server listening on ${port}`);
});

function shutdown() {
  for (const socket of sockets) {
    socket.terminate();
  }
  webSockets.close();
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
