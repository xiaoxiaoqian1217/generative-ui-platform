import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import type { RuntimeHostConfig } from "../src/config.js";
import { createRuntimeDependenciesHealth } from "../src/dependency-health.js";

const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map(
        (server) =>
          new Promise<void>((resolve) => server.close(() => resolve())),
      ),
  );
});

function configuration(contractUrl: string): RuntimeHostConfig {
  return {
    host: "127.0.0.1",
    port: 8200,
    endpoint: "/api/copilotkit",
    agentId: "business-agent",
    businessAgentContractUrl: contractUrl,
    presentationModel: {
      mode: "provider",
      registration: {
        registrationId: "test-provider",
        provider: "qwen",
        modelName: "test-model",
        apiKey: "test-only-key",
      },
      modelInvocation: {
        modelTimeoutMs: 1000,
        modelRetryCount: 0,
      },
    },
  };
}

async function healthServer(status: number, body: unknown): Promise<string> {
  const server = createServer((_request, response) => {
    response.writeHead(status, { "content-type": "application/json" });
    response.end(JSON.stringify(body));
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string")
    throw new Error("TEST_SERVER_ADDRESS_INVALID");
  return `http://127.0.0.1:${address.port}`;
}

describe("Runtime dependency health", () => {
  it("reports a reachable remote agent separately from embedded capabilities", async () => {
    const baseUrl = await healthServer(200, { status: "ok" });
    await expect(
      createRuntimeDependenciesHealth(configuration(baseUrl)),
    ).resolves.toEqual({
      status: "ok",
      dependencies: {
        businessAgent: { kind: "remote", status: "ready" },
        presentationPipeline: { kind: "in-process", status: "ready" },
        modelProvider: { kind: "in-process", status: "ready" },
        catalog: { kind: "in-process", status: "ready" },
      },
    });
  });

  it("reports an unreachable remote agent without marking embedded capabilities unavailable", async () => {
    await expect(
      createRuntimeDependenciesHealth(configuration("http://127.0.0.1:1")),
    ).resolves.toEqual({
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

  it("reports a responding but unhealthy remote agent with a distinct stable code", async () => {
    const baseUrl = await healthServer(200, { status: "closing" });
    const health = await createRuntimeDependenciesHealth(
      configuration(baseUrl),
    );
    expect(health.dependencies.businessAgent).toEqual({
      kind: "remote",
      status: "unreachable",
      code: "BUSINESS_AGENT_UNHEALTHY",
    });
  });
});
