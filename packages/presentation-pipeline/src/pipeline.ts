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
  readonly markdownLimits: MarkdownSanitizerLimits;
  readonly structuredDataLimits: StructuredDataLimits;
  readonly catalogSchemaLimits: CatalogSchemaLimits;
  readonly coreLimits: CoreCompileLimits;
  readonly modelInvocation: ModelInvocationPolicy;
  readonly compileTimeoutMs: number;
}

export const DEFAULT_PRESENTATION_PIPELINE_CONFIGURATION: Readonly<PresentationPipelineConfiguration> =
  Object.freeze({
    markdownLimits: DEFAULT_MARKDOWN_SANITIZER_LIMITS,
    structuredDataLimits: DEFAULT_STRUCTURED_DATA_LIMITS,
    catalogSchemaLimits: defaultCatalogSchemaLimits,
    coreLimits: {
      maxDataDepth: DEFAULT_STRUCTURED_DATA_LIMITS.maxDataDepth,
      maxDataItems: DEFAULT_STRUCTURED_DATA_LIMITS.maxDataItems,
      catalogSchema: defaultCatalogSchemaLimits,
    },
    modelInvocation: { modelTimeoutMs: 10_000, modelRetryCount: 0 },
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
    request: PresentationRequest | unknown,
    options?: PresentationPipelineRunOptions,
  ): Promise<PresentationResult>;
}

export function createPresentationPipeline(
  dependencies: PresentationPipelineDependencies,
): PresentationPipeline {
  const configuration =
    dependencies.configuration ?? DEFAULT_PRESENTATION_PIPELINE_CONFIGURATION;
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
