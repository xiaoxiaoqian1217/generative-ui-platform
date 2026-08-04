import {
  createFixtureModelAdapter,
  createPresentationPipeline,
  FIXTURE_COMPONENT_CATALOG,
} from "@generative-ui/presentation-pipeline";
import type { RuntimeHostConfig } from "../src/config.js";

export function testRuntimeHostConfig(
  overrides: Partial<RuntimeHostConfig> = {},
): RuntimeHostConfig {
  return {
    host: "127.0.0.1",
    port: 8200,
    endpoint: "/api/copilotkit",
    agentId: "business-agent",
    businessAgentContractUrl: "http://127.0.0.1:1",
    presentationModel: {
      mode: "provider",
      registration: {
        registrationId: "test-provider",
        provider: "qwen",
        modelName: "test-model",
        apiKey: "test-only-key",
      },
      modelInvocation: { modelTimeoutMs: 1_000, modelRetryCount: 0 },
    },
    ...overrides,
  };
}

export function createTestPresentationPipeline() {
  return createPresentationPipeline({
    catalogRepository: { load: () => FIXTURE_COMPONENT_CATALOG },
    modelAdapter: createFixtureModelAdapter(),
    createSurfaceId: (request) => `surface-${request.requestId}`,
  });
}
