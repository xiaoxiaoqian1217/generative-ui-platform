import {
  type CatalogSchemaLimits,
  defaultCatalogSchemaLimits,
} from "@generative-ui/component-catalog-schema";
import type {
  PresentationRequest,
  PresentationResult,
} from "@generative-ui/presentation-contract";
import type { CoreCompileLimits } from "@generative-ui/ui-compiler-core";
import {
  type CatalogRepository,
  createGenerativeUIPresentationService,
  GenerativeUIPresentationConfigurationError,
} from "./generative-ui-presentation-service.js";
import {
  DEFAULT_MARKDOWN_SANITIZER_LIMITS,
  type MarkdownSanitizerLimits,
} from "./markdown-sanitizer.js";
import { createMarkdownSanitizer } from "./markdown-sanitizer-definition-aware.js";
import type { PresentationPipelineObservabilityPort } from "./observability.js";
import {
  createModelPresentationRouter,
  type ModelAdapter,
  type ModelInvocationPolicy,
} from "./presentation-router.js";
import { createStructuredDataSerializer } from "./structured-data-serializer.js";
import {
  createStructuredDataValidator,
  DEFAULT_STRUCTURED_DATA_LIMITS,
  type StructuredDataLimits,
} from "./structured-data-validator.js";

export interface PresentationPipelineConfiguration {
  readonly markdownLimits: Readonly<MarkdownSanitizerLimits>;
  readonly structuredDataLimits: Readonly<StructuredDataLimits>;
  readonly catalogSchemaLimits: Readonly<CatalogSchemaLimits>;
  readonly coreLimits: Readonly<CoreCompileLimits> & {
    readonly catalogSchema: Readonly<CatalogSchemaLimits>;
  };
  readonly modelInvocation: Readonly<ModelInvocationPolicy>;
  readonly compileTimeoutMs: number;
}

export const DEFAULT_PRESENTATION_PIPELINE_CONFIGURATION: Readonly<PresentationPipelineConfiguration> =
  Object.freeze({
    markdownLimits: Object.freeze({ ...DEFAULT_MARKDOWN_SANITIZER_LIMITS }),
    structuredDataLimits: Object.freeze({ ...DEFAULT_STRUCTURED_DATA_LIMITS }),
    catalogSchemaLimits: Object.freeze({ ...defaultCatalogSchemaLimits }),
    coreLimits: Object.freeze({
      maxDataDepth: DEFAULT_STRUCTURED_DATA_LIMITS.maxDataDepth,
      maxDataItems: DEFAULT_STRUCTURED_DATA_LIMITS.maxDataItems,
      catalogSchema: Object.freeze({ ...defaultCatalogSchemaLimits }),
    }),
    modelInvocation: Object.freeze({
      modelTimeoutMs: 10_000,
      modelRetryCount: 0,
    }),
    compileTimeoutMs: 10_000,
  });

export interface PresentationPipelineDependencies {
  readonly catalogRepository: CatalogRepository;
  readonly modelAdapter: ModelAdapter;
  readonly createSurfaceId: (request: PresentationRequest) => string;
  readonly configuration?: PresentationPipelineConfiguration;
}

export interface PresentationPipelineRunOptions {
  readonly signal?: AbortSignal;
  readonly observability?: PresentationPipelineObservabilityPort;
}

export interface PresentationPipeline {
  present(
    request: PresentationRequest,
    options?: PresentationPipelineRunOptions,
  ): Promise<PresentationResult>;
}

function createConfigurationSnapshot(
  configuration: PresentationPipelineConfiguration,
): Readonly<PresentationPipelineConfiguration> {
  try {
    const catalogSchemaLimits = Object.freeze({
      maxCatalogBytes: configuration.catalogSchemaLimits.maxCatalogBytes,
      maxEmbeddedSchemaBytes:
        configuration.catalogSchemaLimits.maxEmbeddedSchemaBytes,
      maxEmbeddedSchemaDepth:
        configuration.catalogSchemaLimits.maxEmbeddedSchemaDepth,
      maxEmbeddedSchemaNodes:
        configuration.catalogSchemaLimits.maxEmbeddedSchemaNodes,
    });

    return Object.freeze({
      markdownLimits: Object.freeze({
        maxInputBytes: configuration.markdownLimits.maxInputBytes,
        maxOutputBytes: configuration.markdownLimits.maxOutputBytes,
        maxAstDepth: configuration.markdownLimits.maxAstDepth,
        maxAstNodes: configuration.markdownLimits.maxAstNodes,
      }),
      structuredDataLimits: Object.freeze({
        maxDataDepth: configuration.structuredDataLimits.maxDataDepth,
        maxDataItems: configuration.structuredDataLimits.maxDataItems,
        maxSerializedBytes:
          configuration.structuredDataLimits.maxSerializedBytes,
      }),
      catalogSchemaLimits,
      coreLimits: Object.freeze({
        maxDataDepth: configuration.coreLimits.maxDataDepth,
        maxDataItems: configuration.coreLimits.maxDataItems,
        catalogSchema: Object.freeze({
          maxCatalogBytes:
            configuration.coreLimits.catalogSchema.maxCatalogBytes,
          maxEmbeddedSchemaBytes:
            configuration.coreLimits.catalogSchema.maxEmbeddedSchemaBytes,
          maxEmbeddedSchemaDepth:
            configuration.coreLimits.catalogSchema.maxEmbeddedSchemaDepth,
          maxEmbeddedSchemaNodes:
            configuration.coreLimits.catalogSchema.maxEmbeddedSchemaNodes,
        }),
      }),
      modelInvocation: Object.freeze({
        modelTimeoutMs: configuration.modelInvocation.modelTimeoutMs,
        modelRetryCount: configuration.modelInvocation.modelRetryCount,
      }),
      compileTimeoutMs: configuration.compileTimeoutMs,
    });
  } catch {
    throw new GenerativeUIPresentationConfigurationError();
  }
}

export function createPresentationPipeline(
  dependencies: PresentationPipelineDependencies,
): PresentationPipeline {
  const configuration = createConfigurationSnapshot(
    dependencies.configuration ?? DEFAULT_PRESENTATION_PIPELINE_CONFIGURATION,
  );
  const service = createGenerativeUIPresentationService({
    catalogRepository: dependencies.catalogRepository,
    sanitizer: createMarkdownSanitizer(),
    structuredDataValidator: createStructuredDataValidator(),
    structuredDataSerializer: createStructuredDataSerializer(),
    router: createModelPresentationRouter(
      dependencies.modelAdapter,
      configuration.modelInvocation,
    ),
    markdownLimits: configuration.markdownLimits,
    structuredDataLimits: configuration.structuredDataLimits,
    catalogSchemaLimits: configuration.catalogSchemaLimits,
    coreLimits: configuration.coreLimits,
    compileTimeoutMs: configuration.compileTimeoutMs,
    createSurfaceId: dependencies.createSurfaceId,
  });

  return Object.freeze({
    present(request: unknown, options: PresentationPipelineRunOptions = {}) {
      return service.present(request, {
        signal: options.signal ?? new AbortController().signal,
        ...(options.observability === undefined
          ? {}
          : { observation: options.observability }),
      });
    },
  });
}
