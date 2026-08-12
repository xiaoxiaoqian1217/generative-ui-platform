import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createAguiMockServer } from "@generative-ui/ag-ui-mock";

const appRoot = fileURLToPath(new URL("../..", import.meta.url));
const distRoot = join(appRoot, "dist");
const port = Number(process.env.WEB_WORKBENCH_E2E_PORT ?? "4173");
const agUiMockPort = Number(process.env.AG_UI_MOCK_E2E_PORT ?? "4174");
const includeAgUiMock = process.env.WEB_WORKBENCH_E2E_MODE !== "platform";
const agUiMock = includeAgUiMock
  ? createAguiMockServer({ scenario: "locate-device" })
  : undefined;
const agUiMockAddress = await agUiMock?.listen({
  host: "127.0.0.1",
  port: agUiMockPort,
});
let runtimeAvailable = true;
let retryableTimeoutRequests = 0;
let threadSequence = 0;
const threads = new Map();
const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function timestamp() {
  return new Date().toISOString();
}

function createThread(title = "New debug conversation") {
  const createdAt = timestamp();
  const thread = {
    contractVersion: "1.0",
    createdAt,
    status: "active",
    threadId: `thread-history-${++threadSequence}`,
    title,
    updatedAt: createdAt,
  };
  threads.set(thread.threadId, { thread, turns: [] });
  return thread;
}

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
                catalogId: "fixture",
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
                    children: ["summary", "continue"],
                  },
                  {
                    id: "summary",
                    component: "Text",
                    text: { path: "/sourceData/summary" },
                  },
                  {
                    id: "continue",
                    component: "Button",
                    label: "继续",
                    action: {
                      event: {
                        name: "fixture.continue",
                        context: {
                          actionId: "continue",
                          destructive: false,
                          requiresApproval: false,
                        },
                      },
                    },
                  },
                ],
              },
            },
            {
              version: "v0.9",
              updateDataModel: {
                surfaceId: "surface-e2e",
                path: "/",
                value: { sourceData: { title: "Ready", summary: "Ready" } },
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

function sse(response, event) {
  response.write(`data: ${JSON.stringify(event)}\n\n`);
}

function copilotRunRequest(body) {
  const message = [...(body.messages ?? [])]
    .reverse()
    .find((item) => item.role === "user")?.content;
  return {
    requestId: `headless-${body.runId ?? "run"}`,
    message: {
      role: "user",
      content: typeof message === "string" ? message : "",
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
  if (request.method === "GET" && url.pathname === "/runtime-config.js") {
    response.writeHead(200, {
      "cache-control": "no-store",
      "content-type": "text/javascript; charset=utf-8",
    });
    response.end(
      `window.__GEN_UI_WORKBENCH_CONFIG__ = ${JSON.stringify({
        ...(agUiMockAddress === undefined
          ? {}
          : { agUiMockUrl: agUiMockAddress.url }),
        environment: "e2e",
      })};`,
    );
    return;
  }
  if (request.method === "GET" && url.pathname === "/health/dependencies") {
    json(response, runtimeAvailable ? 200 : 503, {
      status: runtimeAvailable ? "ok" : "unavailable",
    });
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/threads") {
    json(response, 200, {
      items: [...threads.values()].map((item) => item.thread),
    });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/threads") {
    const body = await readJson(request);
    json(
      response,
      201,
      createThread(typeof body.title === "string" ? body.title : undefined),
    );
    return;
  }
  const threadMatch = url.pathname.match(/^\/api\/threads\/([^/]+)$/);
  if (threadMatch && request.method === "GET") {
    const detail = threads.get(decodeURIComponent(threadMatch[1]));
    json(response, detail ? 200 : 404, detail ?? { code: "THREAD_NOT_FOUND" });
    return;
  }
  if (threadMatch && request.method === "DELETE") {
    threads.delete(decodeURIComponent(threadMatch[1]));
    json(response, 200, { status: "completed" });
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/copilotkit/info") {
    if (!runtimeAvailable) {
      json(response, 503, { status: "unavailable" });
      return;
    }
    json(response, 200, {
      agents: { default: { description: "Workbench E2E agent" } },
      mode: "sse",
      version: "test",
    });
    return;
  }
  if (
    request.method === "POST" &&
    url.pathname === "/api/copilotkit/agent/default/run"
  ) {
    if (!runtimeAvailable) {
      json(response, 503, { status: "unavailable" });
      return;
    }
    const body = await readJson(request);
    const runRequest = copilotRunRequest(body);
    if (runRequest.message.content.includes("缓慢")) await wait(2_000);
    if (
      runRequest.message.content.includes("超时后重试") &&
      retryableTimeoutRequests++ === 0
    )
      await wait(2_000);
    const result = runtimeResult(runRequest);
    response.writeHead(200, {
      "cache-control": "no-store",
      connection: "keep-alive",
      "content-type": "text/event-stream",
    });
    sse(response, {
      type: "RUN_STARTED",
      threadId: body.threadId,
      runId: body.runId,
    });
    sse(response, {
      type: "CUSTOM",
      name: "generative-ui.presentation-result",
      value: { mappingVersion: "1.0", result: result.presentation },
    });
    sse(response, {
      type: "CUSTOM",
      name: "generative-ui.runtime-run-result",
      value: { mappingVersion: "1.0", result },
    });
    sse(response, {
      type: "RUN_FINISHED",
      threadId: body.threadId,
      runId: body.runId,
    });
    response.end();
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/actions") {
    const body = await readJson(request);
    const presentationRequestId = `presentation-action-${body.requestId}`;
    json(response, 200, {
      protocolVersion: "1.0",
      requestId: body.requestId,
      threadId: body.threadId,
      runId: body.runId,
      sourcePresentationRequestId: `presentation-${body.runId.replace(/^run-/u, "")}`,
      presentationRequestId,
      actionId: body.action.actionId,
      status: "completed",
      presentation: {
        requestId: presentationRequestId,
        status: "completed",
        mode: "generative-ui",
        surfaceId: "surface-e2e-resumed",
        operations: [
          {
            version: "v0.9",
            createSurface: {
              surfaceId: "surface-e2e-resumed",
              catalogId: "fixture",
            },
          },
          {
            version: "v0.9",
            updateComponents: {
              surfaceId: "surface-e2e-resumed",
              components: [
                {
                  id: "root",
                  component: "Card",
                  title: "Resumed",
                  children: ["summary"],
                },
                {
                  id: "summary",
                  component: "Text",
                  text: "Action 已原位恢复",
                },
              ],
            },
          },
        ],
      },
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
    runtimeAvailable = false;
    response.writeHead(204).end();
    return;
  }
  if (request.method === "POST" && url.pathname === "/__control__/restore") {
    runtimeAvailable = true;
    retryableTimeoutRequests = 0;
    threads.clear();
    threadSequence = 0;
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

server.listen(port, "127.0.0.1", () => {
  console.log(`Workbench E2E server listening on ${port}`);
});

function shutdown() {
  server.close(() => {
    if (agUiMock === undefined) {
      process.exit(0);
      return;
    }
    void agUiMock.close().finally(() => process.exit(0));
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
