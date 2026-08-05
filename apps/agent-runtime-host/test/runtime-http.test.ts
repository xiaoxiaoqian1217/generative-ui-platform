import { once } from "node:events";
import { createServer } from "node:http";
import { MockBusinessAgentAdapter } from "@generative-ui/business-agent-adapter";
import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import { createRuntimeHost } from "../src/runtime.js";
import {
  attachRuntimeHttp,
  RUNTIME_DEPENDENCIES_HEALTH_PATH,
  RUNTIME_RUNS_PATH,
  RUNTIME_THREADS_PATH,
} from "../src/runtime-http.js";
import {
  createTestPresentationPipeline,
  testRuntimeHostConfig,
} from "./test-runtime-dependencies.js";

const servers = new Set<ReturnType<typeof createServer>>();
afterEach(async () => {
  await Promise.all(
    [...servers].map(
      (server) => new Promise<void>((resolve) => server.close(() => resolve())),
    ),
  );
  servers.clear();
});

describe("Runtime HTTP transport", () => {
  it("delegates runs to the shared application orchestrator and exposes separated health", async () => {
    const configuration = testRuntimeHostConfig();
    const host = createRuntimeHost(configuration, {
      businessAgentAdapter: new MockBusinessAgentAdapter({
        run: async (request) => ({
          protocolVersion: request.protocolVersion,
          requestId: request.requestId,
          threadId: request.threadId,
          runId: request.runId,
          status: "completed",
          content: { contentType: "markdown", markdown: "# Runtime" },
        }),
        resumeAction: async () => {
          throw new Error("not used");
        },
      }),
      presentationPipeline: createTestPresentationPipeline(),
    });
    const app = express();
    app.use(express.json());
    attachRuntimeHttp(app, host, configuration);
    const server = createServer(app);
    servers.add(server);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (address === null || typeof address === "string")
      throw new Error("Expected TCP address.");
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const [run, health] = await Promise.all([
      fetch(`${baseUrl}${RUNTIME_RUNS_PATH}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          protocolVersion: "1.0",
          requestId: "http-1",
          threadId: "thread-1",
          runId: "run-1",
          message: { role: "user", content: "status" },
        }),
      }).then((response) => response.json()),
      fetch(`${baseUrl}${RUNTIME_DEPENDENCIES_HEALTH_PATH}`).then((response) =>
        response.json(),
      ),
    ]);
    expect(run).toMatchObject({
      status: "completed",
      presentation: { mode: "markdown", markdown: "# Runtime\n" },
    });
    expect(health).toMatchObject({
      status: "degraded",
      dependencies: {
        businessAgent: {
          kind: "remote",
          status: "unreachable",
          code: "BUSINESS_AGENT_UNREACHABLE",
        },
        presentationPipeline: { kind: "in-process", status: "ready" },
        modelProvider: { kind: "in-process", status: "ready" },
        catalog: { kind: "in-process", status: "ready" },
      },
    });
  });

  it("validates and exposes the Runtime-owned thread history boundary", async () => {
    const configuration = testRuntimeHostConfig();
    const host = createRuntimeHost(configuration, {
      businessAgentAdapter: new MockBusinessAgentAdapter({
        run: async () => {
          throw new Error("not used");
        },
        resumeAction: async () => {
          throw new Error("not used");
        },
      }),
      presentationPipeline: createTestPresentationPipeline(),
    });
    const app = express();
    app.use(express.json());
    attachRuntimeHttp(app, host, configuration);
    const server = createServer(app);
    servers.add(server);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (address === null || typeof address === "string")
      throw new Error("Expected TCP address.");
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const invalid = await fetch(`${baseUrl}${RUNTIME_THREADS_PATH}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "" }),
    });
    expect(invalid.status).toBe(400);
    const created = await fetch(`${baseUrl}${RUNTIME_THREADS_PATH}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "History" }),
    }).then(
      (response) =>
        response.json() as Promise<{ threadId: string; title: string }>,
    );
    const listed = await fetch(`${baseUrl}${RUNTIME_THREADS_PATH}`).then(
      (response) =>
        response.json() as Promise<{ items: readonly { threadId: string }[] }>,
    );
    const loaded = await fetch(
      `${baseUrl}${RUNTIME_THREADS_PATH}/${created.threadId}`,
    ).then(
      (response) => response.json() as Promise<{ thread: { title: string } }>,
    );

    expect(created.title).toBe("History");
    expect(listed.items.map((thread) => thread.threadId)).toContain(
      created.threadId,
    );
    expect(loaded.thread.title).toBe("History");
  });
});
