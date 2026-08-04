import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { LangGraphHttpBusinessAgentAdapter } from "../src/index.js";

const servers: Array<ReturnType<typeof createServer>> = [];

async function startServer(
  handler: (request: IncomingMessage, response: ServerResponse) => void,
): Promise<string> {
  const server = createServer(handler);
  servers.push(server);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map(
        (server) =>
          new Promise<void>((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve())),
          ),
      ),
  );
});

describe("LangGraphHttpBusinessAgentAdapter", () => {
  it("sends Run using the concrete HTTP protocol and preserves correlation", async () => {
    let observedRequest:
      | { body: unknown; headers: IncomingMessage["headers"]; url?: string }
      | undefined;
    const baseUrl = await startServer((request, response) => {
      void readJson(request).then((body) => {
        observedRequest = {
          body,
          headers: request.headers,
          ...(request.url === undefined ? {} : { url: request.url }),
        };
        response.writeHead(200, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            protocolVersion: "1.0",
            requestId: "request-http-run",
            threadId: "thread-http",
            runId: "run-http",
            status: "completed",
            content: { contentType: "markdown", markdown: "HTTP result." },
          }),
        );
      });
    });
    const adapter = new LangGraphHttpBusinessAgentAdapter({ baseUrl });
    const request = {
      protocolVersion: "1.0" as const,
      requestId: "request-http-run",
      threadId: "thread-http",
      runId: "run-http",
      input: { message: "Query device status" },
    };

    await expect(adapter.run(request)).resolves.toMatchObject({
      requestId: "request-http-run",
      threadId: "thread-http",
      runId: "run-http",
      status: "completed",
    });
    expect(observedRequest).toEqual({
      url: "/api/runs",
      headers: expect.objectContaining({
        "content-type": "application/json",
      }),
      body: request,
    });
  });

  it("sends Resume Action through the interchangeable interface", async () => {
    let observedUrl: string | undefined;
    let observedBody: unknown;
    const baseUrl = await startServer((request, response) => {
      void readJson(request).then((body) => {
        observedUrl = request.url;
        observedBody = body;
        response.writeHead(200, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            protocolVersion: "1.0",
            requestId: "request-http-resume",
            threadId: "thread-http",
            runId: "run-http",
            status: "completed",
            content: {
              contentType: "structured-data",
              data: { kind: "patrol-task", status: "confirmed" },
            },
          }),
        );
      });
    });
    const adapter = new LangGraphHttpBusinessAgentAdapter({ baseUrl });
    const request = {
      protocolVersion: "1.0" as const,
      requestId: "request-http-resume",
      threadId: "thread-http",
      runId: "run-http",
      action: {
        actionId: "confirm-patrol-plan",
        actionType: "patrol.confirm",
        surfaceId: "surface-http",
        approved: true,
      },
    };

    await expect(adapter.resumeAction(request)).resolves.toMatchObject({
      requestId: "request-http-resume",
      threadId: "thread-http",
      runId: "run-http",
      status: "completed",
      content: {
        contentType: "structured-data",
        data: { kind: "patrol-task", status: "confirmed" },
      },
    });
    expect(observedUrl).toBe("/api/actions");
    expect(observedBody).toEqual(request);
  });

  it("accepts complete SSE business events before the terminal Run result", async () => {
    const observedEvents: unknown[] = [];
    const baseUrl = await startServer((_request, response) => {
      response.writeHead(200, { "content-type": "text/event-stream" });
      response.write(
        `event: business-agent.event\ndata: ${JSON.stringify({
          protocolVersion: "1.0",
          eventId: "event-started",
          requestId: "request-sse",
          threadId: "thread-sse",
          runId: "run-sse",
          type: "business-agent.started",
        })}\n\n`,
      );
      response.end(
        `event: business-agent.result\ndata: ${JSON.stringify({
          protocolVersion: "1.0",
          requestId: "request-sse",
          threadId: "thread-sse",
          runId: "run-sse",
          status: "completed",
          content: { contentType: "markdown", markdown: "SSE result." },
        })}\n\n`,
      );
    });
    const adapter = new LangGraphHttpBusinessAgentAdapter({ baseUrl });

    await expect(
      adapter.run(
        {
          protocolVersion: "1.0",
          requestId: "request-sse",
          threadId: "thread-sse",
          runId: "run-sse",
          input: { message: "Query device status" },
        },
        { onEvent: (event) => observedEvents.push(event) },
      ),
    ).resolves.toMatchObject({ status: "completed" });
    expect(observedEvents).toEqual([
      expect.objectContaining({ type: "business-agent.started" }),
    ]);
  });

  it("normalizes an unreachable Agent after a finite number of retries", async () => {
    const adapter = new LangGraphHttpBusinessAgentAdapter({
      baseUrl: "http://127.0.0.1:1",
      requestTimeoutMs: 500,
      maxRetries: 1,
      retryDelayMs: 1,
      retryMode: "agent-idempotent",
    });

    await expect(
      adapter.run({
        protocolVersion: "1.0",
        requestId: "request-unavailable",
        threadId: "thread-unavailable",
        runId: "run-unavailable",
        input: { message: "Query device status" },
      }),
    ).resolves.toMatchObject({
      requestId: "request-unavailable",
      threadId: "thread-unavailable",
      runId: "run-unavailable",
      status: "failed",
      error: {
        code: "BUSINESS_AGENT_UNAVAILABLE",
        retryable: true,
        requestId: "request-unavailable",
        threadId: "thread-unavailable",
        runId: "run-unavailable",
      },
    });
  });

  it("enforces the total request timeout and returns a stable error", async () => {
    const baseUrl = await startServer((_request, response) => {
      setTimeout(() => {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            protocolVersion: "1.0",
            requestId: "request-timeout",
            threadId: "thread-timeout",
            runId: "run-timeout",
            status: "completed",
            content: { contentType: "markdown", markdown: "Too late." },
          }),
        );
      }, 100);
    });
    const adapter = new LangGraphHttpBusinessAgentAdapter({
      baseUrl,
      requestTimeoutMs: 20,
      maxRetries: 0,
    });

    await expect(
      adapter.run({
        protocolVersion: "1.0",
        requestId: "request-timeout",
        threadId: "thread-timeout",
        runId: "run-timeout",
        input: { message: "Query device status" },
      }),
    ).resolves.toMatchObject({
      status: "failed",
      error: {
        code: "BUSINESS_AGENT_TIMEOUT",
        retryable: true,
        requestId: "request-timeout",
        threadId: "thread-timeout",
        runId: "run-timeout",
      },
    });
  });

  it("honors the caller AbortSignal separately from timeout", async () => {
    const baseUrl = await startServer((_request, response) => {
      setTimeout(() => {
        response.writeHead(200, { "content-type": "application/json" });
        response.end("{}");
      }, 100);
    });
    const adapter = new LangGraphHttpBusinessAgentAdapter({
      baseUrl,
      requestTimeoutMs: 500,
      maxRetries: 0,
    });
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 10);

    await expect(
      adapter.run(
        {
          protocolVersion: "1.0",
          requestId: "request-cancelled",
          threadId: "thread-cancelled",
          runId: "run-cancelled",
          input: { message: "Query device status" },
        },
        { signal: controller.signal },
      ),
    ).resolves.toMatchObject({
      status: "failed",
      error: {
        code: "REQUEST_CANCELLED",
        retryable: false,
        requestId: "request-cancelled",
        threadId: "thread-cancelled",
        runId: "run-cancelled",
      },
    });
  });

  it("normalizes malformed JSON as an invalid Agent protocol response", async () => {
    const baseUrl = await startServer((_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end("{not-json");
    });
    const adapter = new LangGraphHttpBusinessAgentAdapter({
      baseUrl,
      maxRetries: 0,
    });

    await expect(
      adapter.run({
        protocolVersion: "1.0",
        requestId: "request-invalid-json",
        threadId: "thread-invalid-json",
        runId: "run-invalid-json",
        input: { message: "Query device status" },
      }),
    ).resolves.toMatchObject({
      status: "failed",
      error: {
        code: "BUSINESS_AGENT_PROTOCOL_INVALID",
        retryable: false,
        requestId: "request-invalid-json",
        threadId: "thread-invalid-json",
        runId: "run-invalid-json",
      },
    });
  });

  it("retries a transient HTTP failure only within the configured limit", async () => {
    let attempts = 0;
    const baseUrl = await startServer((_request, response) => {
      attempts += 1;
      response.setHeader("content-type", "application/json");
      if (attempts === 1) {
        response.statusCode = 503;
        response.end(JSON.stringify({ code: "temporarily-unavailable" }));
        return;
      }
      response.end(
        JSON.stringify({
          protocolVersion: "1.0",
          requestId: "request-retry",
          threadId: "thread-retry",
          runId: "run-retry",
          status: "completed",
          content: { contentType: "markdown", markdown: "Recovered." },
        }),
      );
    });
    const adapter = new LangGraphHttpBusinessAgentAdapter({
      baseUrl,
      maxRetries: 1,
      retryDelayMs: 1,
      retryMode: "agent-idempotent",
    });

    await expect(
      adapter.run({
        protocolVersion: "1.0",
        requestId: "request-retry",
        threadId: "thread-retry",
        runId: "run-retry",
        input: { message: "Query device status" },
      }),
    ).resolves.toMatchObject({ status: "completed" });
    expect(attempts).toBe(2);
  });

  it("rejects retries unless the Agent protocol guarantees idempotency", () => {
    expect(
      () =>
        new LangGraphHttpBusinessAgentAdapter({
          baseUrl: "http://127.0.0.1:8300",
          maxRetries: 1,
        }),
    ).toThrow(
      "retryMode must be agent-idempotent when maxRetries is greater than 0",
    );
  });

  it("validates outgoing requests before crossing the HTTP boundary", async () => {
    let attempts = 0;
    const baseUrl = await startServer((_request, response) => {
      attempts += 1;
      response.end();
    });
    const adapter = new LangGraphHttpBusinessAgentAdapter({ baseUrl });

    await expect(
      adapter.run({
        protocolVersion: "1.0",
        requestId: "request-invalid-input",
        threadId: "thread-invalid-input",
        runId: "run-invalid-input",
        input: { message: "" },
      }),
    ).resolves.toMatchObject({
      status: "failed",
      error: {
        code: "REQUEST_INVALID",
        retryable: false,
        requestId: "request-invalid-input",
        threadId: "thread-invalid-input",
        runId: "run-invalid-input",
        path: "/input/message",
        constraint: "minimum-length",
      },
    });
    expect(attempts).toBe(0);
  });

  it("rejects an oversized Agent response before exposing its content", async () => {
    const baseUrl = await startServer((_request, response) => {
      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          protocolVersion: "1.0",
          requestId: "request-oversized",
          threadId: "thread-oversized",
          runId: "run-oversized",
          status: "completed",
          content: { contentType: "markdown", markdown: "x".repeat(512) },
        }),
      );
    });
    const adapter = new LangGraphHttpBusinessAgentAdapter({
      baseUrl,
      maxResponseBytes: 128,
      maxRetries: 0,
    });

    await expect(
      adapter.run({
        protocolVersion: "1.0",
        requestId: "request-oversized",
        threadId: "thread-oversized",
        runId: "run-oversized",
        input: { message: "Query device status" },
      }),
    ).resolves.toMatchObject({
      status: "failed",
      error: {
        code: "BUSINESS_AGENT_PROTOCOL_INVALID",
        retryable: false,
        requestId: "request-oversized",
        threadId: "thread-oversized",
        runId: "run-oversized",
      },
    });
  });
});
