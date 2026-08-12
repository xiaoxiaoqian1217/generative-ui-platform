import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL("../..", import.meta.url));
const distRoot = join(appRoot, "dist");
const port = Number(process.env.WEB_WORKBENCH_E2E_PORT ?? "4173");
let agentAvailable = true;
let retryableTimeoutRequests = 0;
let frontendToolProbe = {
  advertised: false,
  continuations: 0,
  result: null,
};
const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

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

function frontendToolResult(body, toolCallId) {
  return (body.messages ?? []).find(
    (item) =>
      item.role === "tool" &&
      (item.toolCallId === toolCallId || item.tool_call_id === toolCallId),
  );
}

function hasFrontendTool(body, toolName) {
  return (body.tools ?? []).some((tool) => tool.name === toolName);
}

function streamFrontendToolCall(response, body) {
  const toolCallId = "e2e-show-workbench-status";
  sse(response, {
    type: "RUN_STARTED",
    threadId: body.threadId,
    runId: body.runId,
  });
  sse(response, {
    type: "TOOL_CALL_START",
    toolCallId,
    toolCallName: "show_workbench_status",
  });
  sse(response, {
    type: "TOOL_CALL_ARGS",
    toolCallId,
    delta: "{}",
  });
  sse(response, {
    type: "TOOL_CALL_END",
    toolCallId,
  });
  sse(response, {
    type: "RUN_FINISHED",
    threadId: body.threadId,
    runId: body.runId,
  });
  response.end();
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
  if (
    request.method === "GET" &&
    url.pathname === "/__control__/frontend-tool-probe"
  ) {
    json(response, 200, frontendToolProbe);
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/copilotkit/info") {
    if (!agentAvailable) {
      json(response, 503, { status: "unavailable" });
      return;
    }
    json(response, 200, {
      agents: { default: { description: "Business Agent E2E" } },
      mode: "sse",
      version: "test",
    });
    return;
  }
  if (
    request.method === "POST" &&
    url.pathname === "/api/copilotkit/agent/default/run"
  ) {
    if (!agentAvailable) {
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

    if (runRequest.message.content.includes("调用前端状态工具")) {
      const toolCallId = "e2e-show-workbench-status";
      const toolResult = frontendToolResult(body, toolCallId);
      frontendToolProbe = {
        ...frontendToolProbe,
        advertised: hasFrontendTool(body, "show_workbench_status"),
      };

      if (!toolResult) {
        response.writeHead(200, {
          "cache-control": "no-store",
          connection: "keep-alive",
          "content-type": "text/event-stream",
        });
        if (!frontendToolProbe.advertised) {
          sse(response, {
            type: "RUN_STARTED",
            threadId: body.threadId,
            runId: body.runId,
          });
          sse(response, {
            type: "RUN_ERROR",
            message: "show_workbench_status was not advertised by the client",
            code: "FRONTEND_TOOL_NOT_ADVERTISED",
          });
          response.end();
          return;
        }
        streamFrontendToolCall(response, body);
        return;
      }

      frontendToolProbe = {
        advertised: frontendToolProbe.advertised,
        continuations: frontendToolProbe.continuations + 1,
        result:
          typeof toolResult.content === "string"
            ? toolResult.content
            : JSON.stringify(toolResult.content),
      };
    }

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
  if (request.method === "POST" && url.pathname === "/__control__/restore") {
    agentAvailable = true;
    retryableTimeoutRequests = 0;
    frontendToolProbe = {
      advertised: false,
      continuations: 0,
      result: null,
    };
    response.writeHead(204).end();
    return;
  }
  if (request.method === "POST" && url.pathname === "/__control__/agent-down") {
    agentAvailable = false;
    response.writeHead(204).end();
    return;
  }
  if (request.method === "POST" && url.pathname === "/__control__/agent-up") {
    agentAvailable = true;
    response.writeHead(204).end();
    return;
  }
  await serveStatic(request, response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Workbench E2E server listening on ${port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
