import {
  type ComponentCatalog,
  defaultCatalogSchemaLimits,
} from "@generative-ui/component-catalog-schema";
import type { PresentationRequest } from "@generative-ui/presentation-contract";
import { createGenerativeUIPresentationService } from "./generative-ui-presentation-service.js";
import { createHttpServer } from "./http-server.js";
import { DEFAULT_MARKDOWN_SANITIZER_LIMITS } from "./markdown-sanitizer.js";
import { createMarkdownSanitizer } from "./markdown-sanitizer-definition-aware.js";
import {
  createModelPresentationRouter,
  type ModelAdapter,
  type ModelPresentationRequest,
} from "./presentation-router.js";
import {
  createRuntimeConfiguration,
  type RuntimeConfiguration,
  structuredDataLimitsFrom,
} from "./runtime-configuration.js";
import { createStructuredDataSerializer } from "./structured-data-serializer.js";
import { createStructuredDataValidator } from "./structured-data-validator.js";

const catalogSchema = "http://json-schema.org/draft-07/schema#" as const;

export const TEST_CATALOG = Object.freeze({
  schemaVersion: "1.0",
  catalogId: "test",
  catalogVersion: "1.0.0",
  components: [
    {
      componentType: "Card",
      displayName: "Card",
      description: "Groups test summary content.",
      category: "common",
      domainTags: [],
      propsSchema: {
        $schema: catalogSchema,
        type: "object",
        properties: { title: { type: "string" }, content: { type: "object" } },
        required: ["title", "content"],
        additionalProperties: false,
      },
      allowedActions: [],
      nesting: { canHaveChildren: false },
    },
  ],
  actions: [],
} as const satisfies ComponentCatalog);

const testModelAdapter: ModelAdapter = Object.freeze({
  async generatePresentationDecisionCandidate(
    request: ModelPresentationRequest,
  ) {
    if (request.content.contentType === "markdown")
      return { mode: "markdown", reason: "TEST_MARKDOWN" };
    return {
      mode: "generative-ui",
      reason: "TEST_STRUCTURED_UI",
      plan: {
        version: "1.0",
        scenario: "summary",
        regions: [
          {
            regionId: "summary",
            purpose: "Structured data summary",
            bindings: [{ sourcePointer: "/summary", role: "content" }],
            componentPreferences: [{ componentType: "Card" }],
            layout: { flow: "vertical", density: "comfortable" },
          },
        ],
      },
    };
  },
});

export function createRuntimeServer(
  configuration: RuntimeConfiguration = createRuntimeConfiguration(),
  version = "0.1.0",
) {
  const presentUseCase = createGenerativeUIPresentationService({
    catalogRepository: { load: () => TEST_CATALOG },
    sanitizer: createMarkdownSanitizer(),
    structuredDataValidator: createStructuredDataValidator(),
    structuredDataSerializer: createStructuredDataSerializer(),
    router: createModelPresentationRouter(testModelAdapter, configuration),
    markdownLimits: DEFAULT_MARKDOWN_SANITIZER_LIMITS,
    structuredDataLimits: structuredDataLimitsFrom(configuration),
    catalogSchemaLimits: defaultCatalogSchemaLimits,
    coreLimits: {
      maxDataDepth: configuration.maxDataDepth,
      maxDataItems: configuration.maxDataItems,
      catalogSchema: defaultCatalogSchemaLimits,
    },
    compileTimeoutMs: configuration.compileTimeoutMs,
    createSurfaceId: (request: PresentationRequest) =>
      `surface-${request.requestId}`,
  });
  const {
    host: _host,
    port: _port,
    maxDataDepth: _maxDataDepth,
    maxDataItems: _maxDataItems,
    modelTimeoutMs: _modelTimeoutMs,
    modelRetryCount: _modelRetryCount,
    ...httpConfiguration
  } = configuration;
  return createHttpServer({
    presentUseCase,
    configuration: httpConfiguration,
    version,
  });
}

export async function startRuntime(): Promise<void> {
  const configuration = createRuntimeConfiguration();
  const server = createRuntimeServer(configuration);
  let closing = false;
  const close = async () => {
    if (!closing) {
      closing = true;
      await server.closeGracefully();
    }
  };
  process.once("SIGINT", () => void close());
  process.once("SIGTERM", () => void close());
  await server.listen({ host: configuration.host, port: configuration.port });
}
