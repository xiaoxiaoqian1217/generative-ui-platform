import { randomUUID } from "node:crypto";
import {
  type BusinessAgentEvent,
  type PlatformError,
  validateBusinessAgentResumeActionRequest,
  validateBusinessAgentRunRequest,
} from "@generative-ui/runtime-contract";
import fastify, { type FastifyInstance } from "fastify";
import { WebSocketServer } from "ws";
import type { BusinessAgentApplication } from "./agent.js";
import { ReferenceBusinessAgent } from "./agent.js";

const MAX_REQUEST_BYTES = 65_536;

function optionalCorrelation(input: unknown): Partial<PlatformError> {
  if (typeof input !== "object" || input === null) return {};
  const record = input as Record<string, unknown>;
  const result: Partial<PlatformError> = {};
  for (const key of ["requestId", "threadId", "runId"] as const) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) result[key] = value;
  }
  return result;
}

function invalidRequest(
  input: unknown,
  validation?: { path: string; constraint: string },
): PlatformError {
  return {
    code: "REQUEST_INVALID",
    message: "The request does not match the Business Agent contract.",
    retryable: false,
    ...optionalCorrelation(input),
    ...(validation === undefined
      ? {}
      : { path: validation.path, constraint: validation.constraint }),
  };
}

export interface ManagedBusinessAgentServer extends FastifyInstance {
  closeGracefully(): Promise<void>;
}

export function createBusinessAgentServer(
  agent: BusinessAgentApplication = new ReferenceBusinessAgent(),
): ManagedBusinessAgentServer {
  const app = fastify({
    bodyLimit: MAX_REQUEST_BYTES,
    logger: false,
    onConstructorPoisoning: "error",
    onProtoPoisoning: "error",
  });
  let closing = false;
  const webSockets = new WebSocketServer({ noServer: true });

  app.server.on("upgrade", (request, socket, head) => {
    if (request.url !== "/ws/business-agent" || closing) {
      socket.destroy();
      return;
    }
    webSockets.handleUpgrade(request, socket, head, (webSocket) => {
      webSockets.emit("connection", webSocket, request);
    });
  });

  function acceptsEventStream(accept: string | undefined): boolean {
    return accept?.toLowerCase().includes("text/event-stream") === true;
  }

  function streamResult(
    reply: { raw: { write(chunk: string): void; end(): void } },
    result: Awaited<ReturnType<BusinessAgentApplication["run"]>>,
  ): void {
    const event: BusinessAgentEvent = {
      protocolVersion: result.protocolVersion,
      eventId: randomUUID(),
      requestId: result.requestId,
      threadId: result.threadId,
      runId: result.runId,
      type: "business-agent.started",
    };
    reply.raw.write(
      `event: business-agent.event\ndata: ${JSON.stringify(event)}\n\n`,
    );
    reply.raw.write(
      `event: business-agent.result\ndata: ${JSON.stringify(result)}\n\n`,
    );
    reply.raw.end();
  }

  webSockets.on("connection", (socket) => {
    socket.on("message", async (frame) => {
      let message: unknown;
      try {
        message = JSON.parse(frame.toString()) as unknown;
      } catch {
        socket.close(1003, "invalid-json");
        return;
      }
      if (typeof message !== "object" || message === null) {
        socket.close(1003, "invalid-message");
        return;
      }
      const record = message as { type?: unknown; payload?: unknown };
      let result: Awaited<ReturnType<BusinessAgentApplication["run"]>>;
      if (record.type === "business-agent.run") {
        const validation = validateBusinessAgentRunRequest(record.payload);
        if (!validation.success) {
          socket.close(1003, "invalid-contract");
          return;
        }
        result = await agent.run(validation.value);
      } else if (record.type === "business-agent.resume-action") {
        const validation = validateBusinessAgentResumeActionRequest(
          record.payload,
        );
        if (!validation.success) {
          socket.close(1003, "invalid-contract");
          return;
        }
        result = await agent.resume(validation.value);
      } else {
        socket.close(1003, "invalid-contract");
        return;
      }
      const event: BusinessAgentEvent = {
        protocolVersion: result.protocolVersion,
        eventId: randomUUID(),
        requestId: result.requestId,
        threadId: result.threadId,
        runId: result.runId,
        type: "business-agent.started",
      };
      socket.send(
        JSON.stringify({ type: "business-agent.event", payload: event }),
      );
      socket.send(
        JSON.stringify({ type: "business-agent.result", payload: result }),
      );
    });
  });

  app.get("/health", async () => ({
    status: closing ? "closing" : "ok",
    service: "business-agent-langgraph",
    checkpoint: "memory",
  }));

  app.post("/api/runs", async (request, reply) => {
    const validation = validateBusinessAgentRunRequest(request.body);
    if (!validation.success) {
      return reply
        .code(400)
        .send(invalidRequest(request.body, validation.error));
    }
    const result = await agent.run(validation.value);
    if (acceptsEventStream(request.headers.accept)) {
      reply.hijack();
      reply.raw.writeHead(200, {
        "cache-control": "no-cache",
        connection: "keep-alive",
        "content-type": "text/event-stream",
      });
      streamResult(reply, result);
      return;
    }
    return reply.header("x-request-id", result.requestId).send(result);
  });

  app.post("/api/actions", async (request, reply) => {
    const validation = validateBusinessAgentResumeActionRequest(request.body);
    if (!validation.success) {
      return reply
        .code(400)
        .send(invalidRequest(request.body, validation.error));
    }
    const result = await agent.resume(validation.value);
    if (acceptsEventStream(request.headers.accept)) {
      reply.hijack();
      reply.raw.writeHead(200, {
        "cache-control": "no-cache",
        connection: "keep-alive",
        "content-type": "text/event-stream",
      });
      streamResult(reply, result);
      return;
    }
    return reply.header("x-request-id", result.requestId).send(result);
  });

  app.delete("/api/threads/:threadId", async (request, reply) => {
    const params = request.params as { threadId?: unknown };
    if (typeof params.threadId !== "string" || params.threadId.length === 0)
      return reply.code(400).send(invalidRequest(params));
    if (!(agent instanceof ReferenceBusinessAgent))
      return reply
        .code(501)
        .send({
          code: "REQUEST_INVALID",
          message: "Checkpoint deletion is unavailable.",
          retryable: false,
        });
    await agent.deleteThread(params.threadId);
    return reply.code(204).send();
  });

  app.setNotFoundHandler((_request, reply) => {
    return reply.code(404).send({
      code: "REQUEST_INVALID",
      message: "The requested Business Agent endpoint does not exist.",
      retryable: false,
    } satisfies PlatformError);
  });

  app.setErrorHandler((caught, request, reply) => {
    const caughtStatusCode = (caught as { statusCode?: number }).statusCode;
    const statusCode = caughtStatusCode === 413 ? 413 : 400;
    return reply.code(statusCode).send(invalidRequest(request.body));
  });

  const managed = app as unknown as ManagedBusinessAgentServer;
  managed.closeGracefully = async () => {
    if (closing) return;
    closing = true;
    await new Promise<void>((resolve) => webSockets.close(() => resolve()));
    await app.close();
  };
  return managed;
}
