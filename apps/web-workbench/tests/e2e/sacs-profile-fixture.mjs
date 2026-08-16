import { createHmac, timingSafeEqual } from "node:crypto";
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

function verifyUserJwt(token, secret, principalId) {
  if (typeof token !== "string") return undefined;
  const parts = token.split(".");
  if (parts.length !== 3) return undefined;
  const [header, payload, signature] = parts;
  const expected = createHmac("sha256", secret)
    .update(`${header}.${payload}`, "ascii")
    .digest();
  const provided = Buffer.from(signature, "base64url");
  if (
    expected.length !== provided.length ||
    !timingSafeEqual(expected, provided)
  ) {
    return undefined;
  }
  try {
    const parsedHeader = JSON.parse(
      Buffer.from(header, "base64url").toString("utf8"),
    );
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );
    const now = Math.floor(Date.now() / 1000);
    if (
      parsedHeader.alg !== "HS256" ||
      claims.iss !== "open-webui" ||
      claims.sub !== principalId ||
      claims.role !== "user" ||
      !Number.isInteger(claims.iat) ||
      !Number.isInteger(claims.exp) ||
      claims.exp <= now ||
      claims.exp - claims.iat !== 300
    ) {
      return undefined;
    }
    return claims;
  } catch {
    return undefined;
  }
}

export async function createSacsProfileFixture({
  host,
  jwtSecret,
  port,
  principalId,
  serviceKey,
}) {
  const observations = [];
  let available = true;
  const server = createServer(async (request, response) => {
    const userJwtClaims = verifyUserJwt(
      request.headers["x-openwebui-user-jwt"],
      jwtSecret,
      principalId,
    );
    if (
      request.headers.authorization !== `Bearer ${serviceKey}` ||
      userJwtClaims === undefined
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
      userJwtClaims,
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

    // Issue #205：resume run —— AG-UI RunAgentInput.resume 到达 SACS 后
    // 继续执行并结束，echo 公开 resume payload 便于断言真实关联。
    if (Array.isArray(body.resume) && body.resume.length > 0) {
      const entry = body.resume[0];
      const messageId = `sacs-${body.runId}`;
      const text =
        entry.status === "cancelled"
          ? "Task interrupted and cancelled by user."
          : `Task resumed after confirmation: ${String(entry.payload)}.`;
      sse(response, {
        type: "TEXT_MESSAGE_START",
        messageId,
        role: "assistant",
      });
      sse(response, { type: "TEXT_MESSAGE_CONTENT", messageId, delta: text });
      sse(response, { type: "TEXT_MESSAGE_END", messageId });
      sse(response, {
        type: "RUN_FINISHED",
        threadId: body.threadId,
        runId: body.runId,
        result: { resumed: true, interruptId: entry.interruptId },
      });
      response.end();
      return;
    }

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

    // Issue #205：durable run 公开冲突事实（如 run_id_conflict）。
    if (String(lastUserMessage).includes("durable conflict")) {
      sse(response, {
        type: "RUN_ERROR",
        code: "run_id_conflict",
        message: "a durable run already exists for this thread",
      });
      response.end();
      return;
    }

    // Issue #205：Interrupt / Resume —— RUN_FINISHED 携带 interrupt outcome。
    if (String(lastUserMessage).includes("confirm task")) {
      const messageId = `sacs-${body.runId}`;
      sse(response, {
        type: "TEXT_MESSAGE_START",
        messageId,
        role: "assistant",
      });
      sse(response, {
        type: "TEXT_MESSAGE_CONTENT",
        messageId,
        delta: "Task requires user confirmation before continuing.",
      });
      sse(response, { type: "TEXT_MESSAGE_END", messageId });
      sse(response, {
        type: "RUN_FINISHED",
        threadId: body.threadId,
        runId: body.runId,
        outcome: {
          type: "interrupt",
          interrupts: [
            {
              id: `interrupt-${body.runId}`,
              reason: "need_confirmation",
              message: "请确认是否继续执行任务",
            },
          ],
        },
      });
      response.end();
      return;
    }

    const messageId = `sacs-${body.runId}`;
    // Issue #205：大 payload 场景，验证 JSON viewer 折叠 / lazy rendering。
    const largePayload = String(lastUserMessage).includes("large payload");
    sse(response, {
      type: "STATE_SNAPSHOT",
      snapshot: largePayload
        ? {
            items: Array.from({ length: 120 }, (_, index) => ({
              id: `item-${index}`,
              value: index,
            })),
            task: { progress: 25, status: "running" },
          }
        : { task: { progress: 25, status: "running" } },
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
