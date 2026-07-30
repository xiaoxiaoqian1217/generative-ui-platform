import type {
  CatalogContentHash,
  UICompileResult,
} from "@generative-ui/compiler-contract";
import type {
  CatalogSchemaLimits,
  ComponentCatalog,
} from "@generative-ui/component-catalog-schema";
import {
  computeCatalogContentHash,
  validateComponentCatalog,
} from "@generative-ui/component-catalog-schema";
import type {
  CatalogReference,
  PresentationDecision,
  PresentationError,
  PresentationRequest,
  PresentationResult,
} from "@generative-ui/presentation-contract";
import { validatePresentationRequest } from "@generative-ui/presentation-contract";
import type { JsonValue } from "@generative-ui/shared-types";
import {
  type CompileOptions,
  type CoreCompileLimits,
  compileUI,
} from "@generative-ui/ui-compiler-core";
import {
  createCatalogCapabilitySummary,
  createImmutableCatalogSnapshot,
} from "./catalog-capability-summary.js";
import {
  areMarkdownSanitizerLimitsValid,
  type MarkdownSanitizer,
  type MarkdownSanitizerLimits,
  type SanitizedMarkdown,
} from "./markdown-sanitizer.js";
import type {
  PresentationRouteOptions,
  PresentationRouter,
} from "./presentation-router.js";
import {
  isModelAdapterError,
  PresentationDecisionValidationError,
} from "./presentation-router.js";
import {
  failedPresentationResult,
  finalizeSafeMarkdownPresentation,
  routingPresentationError,
  sanitizationPresentationError,
} from "./safe-markdown-presentation.js";
import { areStructuredDataPresentationLimitsCompatible } from "./structured-data-presentation-service.js";
import type { StructuredDataSerializer } from "./structured-data-serializer.js";
import type {
  StructuredDataLimits,
  StructuredDataValidator,
  ValidatedStructuredData,
} from "./structured-data-validator.js";
import { areStructuredDataLimitsValid } from "./structured-data-validator.js";

const catalogFailureMessage =
  "The requested Component Catalog could not be used.";
const candidateFailureMessage =
  "Model output could not be used to generate UI.";
const modelFailureMessage = "Model analysis could not be completed.";
const compilationFailureMessage = "Generated UI could not be compiled.";

const missingOwnProperty = Symbol("missingOwnProperty");
const unsafeOwnProperty = Symbol("unsafeOwnProperty");

export interface CatalogRepository {
  load(reference: CatalogReference): unknown;
}

export interface GenerativeUIPresentationServiceDependencies {
  catalogRepository: CatalogRepository;
  sanitizer: MarkdownSanitizer;
  structuredDataValidator: StructuredDataValidator;
  structuredDataSerializer: StructuredDataSerializer;
  router: PresentationRouter;
  markdownLimits: MarkdownSanitizerLimits;
  structuredDataLimits: StructuredDataLimits;
  catalogSchemaLimits: CatalogSchemaLimits;
  coreLimits: CoreCompileLimits;
  createSurfaceId(request: PresentationRequest): string;
  compile?(input: unknown, options: CompileOptions): UICompileResult;
}

export interface GenerativeUIPresentationService {
  present(
    input: unknown,
    options: PresentationRouteOptions,
  ): Promise<PresentationResult>;
}

export class GenerativeUIPresentationConfigurationError extends Error {
  readonly code = "GENERATIVE_UI_PRESENTATION_CONFIGURATION_INVALID";

  constructor() {
    super("Generative UI presentation service configuration is invalid.");
    this.name = "GenerativeUIPresentationConfigurationError";
  }
}

function error(
  code: string,
  message: string,
  stage: PresentationError["stage"],
): PresentationError {
  return { code, message, stage, retryable: false };
}

function fallbackFor(
  requestId: string,
  markdown: SanitizedMarkdown,
  dependencies: GenerativeUIPresentationServiceDependencies,
  errors: readonly PresentationError[],
): PresentationResult {
  return finalizeSafeMarkdownPresentation({
    requestId,
    markdown,
    sanitizer: dependencies.sanitizer,
    limits: dependencies.markdownLimits,
    errors,
  });
}

function readOwnDataProperty(
  input: object,
  key: string,
): unknown | typeof missingOwnProperty | typeof unsafeOwnProperty {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (descriptor === undefined) {
      return missingOwnProperty;
    }
    if (!descriptor.enumerable || !("value" in descriptor)) {
      return unsafeOwnProperty;
    }
    return descriptor.value;
  } catch {
    return unsafeOwnProperty;
  }
}

function safeRequestId(input: unknown): string {
  if (typeof input !== "object" || input === null) {
    return "unknown";
  }
  const requestId = readOwnDataProperty(input, "requestId");
  return typeof requestId === "string" && requestId.length > 0
    ? requestId
    : "unknown";
}

type StructuredDataPrevalidation =
  | { attempted: false }
  | {
      attempted: true;
      success: true;
      value: ValidatedStructuredData;
    }
  | {
      attempted: true;
      success: false;
      requestId: string;
      code: string;
    };

function prevalidateStructuredData(
  input: unknown,
  validator: StructuredDataValidator,
  limits: StructuredDataLimits,
): StructuredDataPrevalidation {
  if (typeof input !== "object" || input === null) {
    return { attempted: false };
  }

  const content = readOwnDataProperty(input, "content");
  if (content === missingOwnProperty || content === unsafeOwnProperty) {
    return { attempted: false };
  }
  if (typeof content !== "object" || content === null) {
    return { attempted: false };
  }

  const contentType = readOwnDataProperty(content, "contentType");
  if (contentType !== "structured-data") {
    return { attempted: false };
  }

  const data = readOwnDataProperty(content, "data");
  if (data === missingOwnProperty || data === unsafeOwnProperty) {
    return { attempted: false };
  }

  try {
    const result = validator.validate(data, limits);
    if (!result.success) {
      return {
        attempted: true,
        success: false,
        requestId: safeRequestId(input),
        code: result.error.code,
      };
    }
    return { attempted: true, success: true, value: result.value };
  } catch {
    return {
      attempted: true,
      success: false,
      requestId: safeRequestId(input),
      code: "STRUCTURED_DATA_INVALID",
    };
  }
}

function validatedCatalog(
  reference: CatalogReference,
  repository: CatalogRepository,
  limits: CatalogSchemaLimits,
):
  | {
      success: true;
      catalog: ComponentCatalog;
      contentHash: CatalogContentHash;
    }
  | { success: false; code: string } {
  try {
    const result = validateComponentCatalog(repository.load(reference), limits);
    if (!result.success) {
      return { success: false, code: result.error.code };
    }
    if (
      result.value.catalogId !== reference.catalogId ||
      result.value.catalogVersion !== reference.catalogVersion
    ) {
      return { success: false, code: "CATALOG_REFERENCE_MISMATCH" };
    }
    const catalog = createImmutableCatalogSnapshot(result.value);
    return {
      success: true,
      catalog,
      contentHash: computeCatalogContentHash(catalog),
    };
  } catch {
    return { success: false, code: "COMPONENT_CATALOG_INVALID" };
  }
}

function compileError(result: UICompileResult): PresentationError {
  const first = "errors" in result ? result.errors[0] : undefined;
  return error(
    first?.code ?? "UI_COMPILATION_FAILED",
    compilationFailureMessage,
    "ui-compilation",
  );
}

function modelAnalysisError(caught: unknown): PresentationError | undefined {
  if (!isModelAdapterError(caught)) {
    return undefined;
  }
  return {
    code: caught.code,
    message: modelFailureMessage,
    stage: "model-analysis",
    retryable: caught.retryable,
  };
}

export function createGenerativeUIPresentationService(
  dependencies: GenerativeUIPresentationServiceDependencies,
): GenerativeUIPresentationService {
  if (
    !areMarkdownSanitizerLimitsValid(dependencies.markdownLimits) ||
    !areStructuredDataLimitsValid(dependencies.structuredDataLimits) ||
    !areStructuredDataPresentationLimitsCompatible({
      markdown: dependencies.markdownLimits,
      structuredData: dependencies.structuredDataLimits,
    })
  ) {
    throw new GenerativeUIPresentationConfigurationError();
  }
  const compile = dependencies.compile ?? compileUI;

  return {
    async present(input, options) {
      const structuredPrevalidation = prevalidateStructuredData(
        input,
        dependencies.structuredDataValidator,
        dependencies.structuredDataLimits,
      );
      if (
        structuredPrevalidation.attempted &&
        !structuredPrevalidation.success
      ) {
        return failedPresentationResult(structuredPrevalidation.requestId, [
          error(
            structuredPrevalidation.code,
            "Structured data could not be safely processed.",
            "input-validation",
          ),
        ]);
      }

      let requestValidation: ReturnType<typeof validatePresentationRequest>;
      try {
        requestValidation = validatePresentationRequest(input);
      } catch {
        return failedPresentationResult(safeRequestId(input), [
          error(
            "PRESENTATION_REQUEST_INVALID",
            "Presentation request does not match its contract.",
            "input-validation",
          ),
        ]);
      }
      if (!requestValidation.success) {
        return failedPresentationResult("unknown", [
          error(
            requestValidation.error.code,
            "Presentation request does not match its contract.",
            "input-validation",
          ),
        ]);
      }
      const request = requestValidation.value;

      let safeMarkdown: SanitizedMarkdown;
      let sourceData: JsonValue;
      if (request.content.contentType === "markdown") {
        const sanitized = dependencies.sanitizer.sanitize(
          request.content.markdown,
          dependencies.markdownLimits,
        );
        if (!sanitized.success) {
          return failedPresentationResult(request.requestId, [
            sanitizationPresentationError(sanitized.error.reason),
          ]);
        }
        safeMarkdown = sanitized.markdown;
        sourceData = { markdown: safeMarkdown };
      } else {
        const prevalidatedData =
          structuredPrevalidation.attempted &&
          structuredPrevalidation.success
            ? structuredPrevalidation.value
            : undefined;
        const structured =
          prevalidatedData === undefined
            ? dependencies.structuredDataValidator.validate(
                request.content.data,
                dependencies.structuredDataLimits,
              )
            : { success: true as const, value: prevalidatedData };
        if (!structured.success) {
          return failedPresentationResult(request.requestId, [
            error(
              structured.error.code,
              "Structured data could not be safely processed.",
              "input-validation",
            ),
          ]);
        }
        const fallbackSource =
          request.content.fallbackMarkdown ??
          dependencies.structuredDataSerializer.serialize(structured.value);
        const fallback = dependencies.sanitizer.sanitize(
          fallbackSource,
          dependencies.markdownLimits,
        );
        if (!fallback.success) {
          if (request.content.fallbackMarkdown !== undefined) {
            const serialized = dependencies.sanitizer.sanitize(
              dependencies.structuredDataSerializer.serialize(structured.value),
              dependencies.markdownLimits,
            );
            if (serialized.success) {
              return fallbackFor(
                request.requestId,
                serialized.markdown,
                dependencies,
                [sanitizationPresentationError(fallback.error.reason)],
              );
            }
          }
          return failedPresentationResult(request.requestId, [
            sanitizationPresentationError(fallback.error.reason),
          ]);
        }
        safeMarkdown = fallback.markdown;
        sourceData = structured.value.data;
      }

      const resolved = validatedCatalog(
        request.catalog,
        dependencies.catalogRepository,
        dependencies.catalogSchemaLimits,
      );
      if (!resolved.success) {
        return fallbackFor(request.requestId, safeMarkdown, dependencies, [
          error(resolved.code, catalogFailureMessage, "input-validation"),
        ]);
      }

      let decision: PresentationDecision;
      try {
        decision = await dependencies.router.route(
          {
            requestId: request.requestId,
            content:
              request.content.contentType === "markdown"
                ? { contentType: "markdown", markdown: safeMarkdown }
                : {
                    contentType: "structured-data",
                    data: sourceData,
                    fallbackMarkdown: safeMarkdown,
                  },
            ...(request.context === undefined
              ? {}
              : { context: request.context }),
            catalog: createCatalogCapabilitySummary(resolved.catalog),
          },
          options,
        );
      } catch (caught) {
        const adapterError = modelAnalysisError(caught);
        return fallbackFor(request.requestId, safeMarkdown, dependencies, [
          caught instanceof PresentationDecisionValidationError
            ? error(
                "PRESENTATION_DECISION_INVALID",
                candidateFailureMessage,
                "ui-plan-validation",
              )
            : (adapterError ?? routingPresentationError()),
        ]);
      }

      if (decision.mode === "markdown") {
        return fallbackFor(request.requestId, safeMarkdown, dependencies, []);
      }

      let result: UICompileResult;
      try {
        result = compile(
          {
            requestId: request.requestId,
            ...(request.threadId === undefined
              ? {}
              : { threadId: request.threadId }),
            ...(request.runId === undefined ? {} : { runId: request.runId }),
            plan: decision.plan,
            sourceKind: request.content.contentType,
            sourceData,
            fallbackMarkdown: safeMarkdown,
            catalog: request.catalog,
            ...(request.context === undefined
              ? {}
              : {
                  context: {
                    ...(request.context.locale === undefined
                      ? {}
                      : { locale: request.context.locale }),
                    ...(request.context.theme === undefined
                      ? {}
                      : { theme: request.context.theme }),
                    ...(request.context.viewport === undefined
                      ? {}
                      : { viewport: request.context.viewport }),
                  },
                }),
          },
          {
            surfaceId: dependencies.createSurfaceId(request),
            catalog: resolved.catalog,
            catalogContentHash: resolved.contentHash,
            limits: dependencies.coreLimits,
          },
        );
      } catch {
        return fallbackFor(request.requestId, safeMarkdown, dependencies, [
          error(
            "UI_COMPILATION_FAILED",
            compilationFailureMessage,
            "ui-compilation",
          ),
        ]);
      }
      if (result.success && !result.degraded) {
        return {
          requestId: request.requestId,
          status: "completed",
          mode: "generative-ui",
          surfaceId: result.surfaceId,
          operations: result.operations,
        };
      }
      return fallbackFor(request.requestId, safeMarkdown, dependencies, [
        compileError(result),
      ]);
    },
  };
}
