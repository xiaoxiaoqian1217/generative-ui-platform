import { once } from "node:events";
import { createServer } from "node:http";
import { MockBusinessAgentAdapter } from "@generative-ui/business-agent-adapter";
import { afterEach, describe, expect, it } from "vitest";
import type { RuntimeHostConfig } from "../src/config.js";
import { RUNTIME_SOCKET_PATH } from "../src/demo-socket.js";
import { createRuntimeHost } from "../src/runtime.js";
import { createRuntimeHostApp } from "../src/runtime-host-app.js";

const servers = new Set<ReturnType<typeof createServer>>();

afterEach(async () => {
  await Promise.all(
    [...servers].map(
      (server) => new Promise<void>((resolve) => server.close(() => resolve())),
    ),
  );
  servers.clear();
});

describe("Runtime Host application", () => {
  it("advertises only the Runtime Contract routes and dependency health", async () => {
    const configuration: RuntimeHostConfig = {
      host: "127.0.0.1",
      port: 8200,
      endpoint: "/api/copilotkit",
      agentId: "business-agent",
      businessAgentContractUrl: "http://127.0.0.1:1",
      presentationModel: { mode: "fixture" },
    };
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
    });
    const server = createServer(createRuntimeHostApp(host, configuration));
    servers.add(server);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (address === null || typeof address === "string")
      throw new Error("Expected TCP address.");

    const baseUrl = `http://127.0.0.1:${address.port}`;
    const response = await fetch(`${baseUrl}/health`);
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      service: "agent-runtime-host",
      runtimeContract: {
        runsPath: "/api/runs",
        actionsPath: "/api/actions",
        socketPath: RUNTIME_SOCKET_PATH,
        copilotKitPath: "/api/copilotkit",
      },
      dependenciesPath: "/health/dependencies",
    });
  });
});
