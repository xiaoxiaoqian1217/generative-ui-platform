import type {
  CatalogContentHash,
  CompileError,
  CompileMetadata,
  CompileStage,
  UICompileRequest,
  UICompileResult,
} from "@generative-ui/compiler-contract";
import { validateUICompileResult } from "@generative-ui/compiler-contract";
import { compileA2UI } from "./a2ui-compiler.js";
import { validateInjectedCatalog } from "./catalog-validation.js";
import { selectSummaryComponent } from "./component-selection.js";
import { CoreCompileFailure } from "./failure.js";
import { validateCompileInput } from "./input-validation.js";
import type { CompileOptions } from "./types.js";
import { buildSummaryUIIR } from "./ui-ir-builder.js";

const compilerVersion = "0.1.0";
const unknownCatalog = {
  catalogId: "unknown",
  catalogVersion: "unknown",
};
const unknownCatalogHash =
  "sha256:0000000000000000000000000000000000000000000000000000000000000000" as const;

function correlationFrom(input: unknown): {
  requestId: string;
  threadId?: string;
  runId?: string;
} {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { requestId: "unknown" };
  }
  const candidate = input as Record<string, unknown>;
  return {
    requestId:
      typeof candidate.requestId === "string" && candidate.requestId.length > 0
        ? candidate.requestId
        : "unknown",
    ...(typeof candidate.threadId === "string" && candidate.threadId.length > 0
      ? { threadId: candidate.threadId }
      : {}),
    ...(typeof candidate.runId === "string" && candidate.runId.length > 0
      ? { runId: candidate.runId }
      : {}),
  };
}

function fallbackFrom(input: unknown): string | undefined {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return undefined;
  }
  const fallbackMarkdown = (input as Record<string, unknown>).fallbackMarkdown;
  return typeof fallbackMarkdown === "string" && fallbackMarkdown.length > 0
    ? fallbackMarkdown
    : undefined;
}

function metadata(
  request: UICompileRequest | undefined,
  contentHash: CatalogContentHash,
  completedStages: CompileStage[],
): CompileMetadata {
  return {
    compilerVersion,
    catalog: request?.catalog ?? unknownCatalog,
    catalogContentHash: contentHash,
    durationMs: 0,
    completedStages,
  };
}

function ensureValidResult(result: UICompileResult): UICompileResult {
  const validation = validateUICompileResult(result);
  if (!validation.success) {
    throw new Error("UI Compiler Core produced an invalid compile result.");
  }
  return validation.value;
}

export function compileUI(
  input: unknown,
  options: CompileOptions,
): UICompileResult {
  const completedStages: CompileStage[] = [];
  let request: UICompileRequest | undefined;
  let contentHash: CatalogContentHash = unknownCatalogHash;

  try {
    request = validateCompileInput(input, options.limits);
    completedStages.push("input-validation", "ui-plan-validation");

    const validatedCatalog = validateInjectedCatalog(request, options);
    contentHash = validatedCatalog.contentHash;
    completedStages.push("catalog-validation");

    const selection = selectSummaryComponent(request, validatedCatalog.catalog);
    completedStages.push(
      "semantic-resolution",
      "composition-planning",
      "component-selection",
      "props-resolution",
      "action-binding",
    );

    const surface = buildSummaryUIIR(
      request,
      selection,
      validatedCatalog.catalog,
      options,
    );
    completedStages.push("ui-ir-building", "schema-validation");

    const operations = compileA2UI(surface);
    completedStages.push("a2ui-compilation", "a2ui-validation");

    return ensureValidResult({
      ...correlationFrom(request),
      success: true,
      degraded: false,
      surfaceId: surface.surfaceId,
      operations,
      metadata: metadata(request, contentHash, completedStages),
    });
  } catch (error) {
    const compileError: CompileError =
      error instanceof CoreCompileFailure
        ? error.compileError
        : {
            code: "INTERNAL_ERROR",
            message: "UI Compiler Core failed unexpectedly.",
            stage: "schema-validation",
            retryable: false,
          };
    const correlation = correlationFrom(request ?? input);
    const fallback = fallbackFrom(request ?? input);
    const resultMetadata = metadata(request, contentHash, completedStages);

    if (fallback) {
      return ensureValidResult({
        ...correlation,
        success: true,
        degraded: true,
        fallback: {
          format: "markdown",
          markdown: fallback,
        },
        errors: [compileError],
        metadata: resultMetadata,
      });
    }

    return ensureValidResult({
      ...correlation,
      success: false,
      degraded: false,
      errors: [compileError],
      metadata: resultMetadata,
    });
  }
}
