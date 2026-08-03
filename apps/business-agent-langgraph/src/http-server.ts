import {
  type PlatformError,
  validateBusinessAgentResumeActionRequest,
  validateBusinessAgentRunRequest,
} from "@generative-ui/runtime-contract";
import fastify, { type FastifyInstance } from "fastify";
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
    return reply.header("x-request-id", result.requestId).send(result);
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
    await app.close();
  };
  return managed;
}
