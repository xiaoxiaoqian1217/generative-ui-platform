import { createServer } from "node:http";

function json(response, status, value) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(value));
}

function sse(response, event) {
  response.write(`data: ${JSON.stringify(event)}\n\n`);
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export async function createSacsProfileFixture({ host, port }) {
  const observations = [];
  let available = true;
  const server = createServer(async (request, response) => {
    if (
      request.headers.authorization !== "Bearer e2e-sacs-key" ||
      request.headers["x-openwebui-user-jwt"] !== "e2e-signed-user"
    ) {
      json(response, 401, { error: "unauthorized" });
      return;
    }
    if (request.method === "GET" && request.url === "/ag-ui/capabilities") {
      json(response, 200, {
        identity: { name: "single-agent-chat-server", version: "0.2" },
        state: { deltas: true, snapshots: true },
        tools: { clientProvided: false, supported: false },
        transport: { streaming: true },
      });
      return;
    }
    if (request.method !== "POST" || request.url !== "/ag-ui") {
      json(response, 404, { error: "not_found" });
      return;
    }

    if (!available) {
      json(response, 503, { error: "sacs_unavailable" });
      return;
    }

    const body = await readJson(request);
    observations.push({
      authorization: request.headers.authorization,
      body,
      userJwt: request.headers["x-openwebui-user-jwt"],
    });
    response.writeHead(200, {
      "cache-control": "no-store",
      "content-type": "text/event-stream",
    });
    sse(response, {
      type: "RUN_STARTED",
      threadId: body.threadId,
      runId: body.runId,
    });

    const lastUserMessage = [...(body.messages ?? [])]
      .reverse()
      .find((message) => message.role === "user")?.content;
    if (String(lastUserMessage).includes("SACS error")) {
      sse(response, {
        type: "RUN_ERROR",
        code: "sacs_fixture_error",
        message: "bounded fixture failure",
      });
      response.end();
      return;
    }

    const messageId = `sacs-${body.runId}`;
    sse(response, {
      type: "STATE_SNAPSHOT",
      snapshot: { task: { progress: 25, status: "running" } },
    });
    sse(response, {
      type: "STATE_DELTA",
      delta: [{ op: "replace", path: "/task/progress", value: 100 }],
    });
    sse(response, {
      type: "ACTIVITY_SNAPSHOT",
      messageId: `activity-${body.runId}`,
      activityType: "task-progress",
      content: { progress: 25, status: "running" },
      replace: true,
    });
    sse(response, {
      type: "ACTIVITY_DELTA",
      messageId: `activity-${body.runId}`,
      activityType: "task-progress",
      patch: [{ op: "replace", path: "/progress", value: 100 }],
    });
    const structuredOnly = String(lastUserMessage).includes(
      "structured result only",
    );
    if (!structuredOnly) {
      sse(response, {
        type: "TEXT_MESSAGE_START",
        messageId,
        role: "assistant",
      });
      sse(response, {
        type: "TEXT_MESSAGE_CONTENT",
        messageId,
        delta: "SACS business task completed with artifact report-42.",
      });
      sse(response, { type: "TEXT_MESSAGE_END", messageId });
    }
    sse(response, {
      type: "RUN_FINISHED",
      threadId: body.threadId,
      runId: body.runId,
      result: { artifact: { id: "report-42", kind: "business-report" } },
    });
    response.end();
  });

  await new Promise((resolve) => server.listen(port, host, resolve));
  const address = server.address();
  if (typeof address !== "object" || address === null)
    throw new Error("SACS_FIXTURE_ADDRESS_UNAVAILABLE");
  return {
    observations,
    setAvailable(value) {
      available = value;
    },
    stop: () => new Promise((resolve) => server.close(resolve)),
    url: `http://${host}:${address.port}/ag-ui`,
  };
}
