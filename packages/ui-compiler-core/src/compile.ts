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
import { indexTargetActions } from "./action-targets.js";
import { validateInjectedCatalog } from "./catalog-validation.js";
import { selectComponents } from "./component-selection.js";
import { CoreCompileFailure } from "./failure.js";
import { validateCompileInput } from "./input-validation.js";
import type { CompileOptions } from "./types.js";
import { buildUIIR } from "./ui-ir-builder.js";

const compilerVersion = "0.1.0";
const unknownCatalog = {
  catalogId: "unknown",
  catalogVersion: "unknown",
};
const unknownCatalogHash =
  "sha256:0000000000000000000000000000000000000000000000000000000000000000" as const;

function stringFieldFrom(input: unknown, key: string): string | undefined {
  try {
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      return undefined;
    }
    const value = Reflect.get(input, key);
    return typeof value === "string" && value.length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

function correlationFrom(input: unknown): {
  requestId: string;
  threadId?: string;
  runId?: string;
} {
  const requestId = stringFieldFrom(input, "requestId") ?? "unknown";
  const threadId = stringFieldFrom(input, "threadId");
  const runId = stringFieldFrom(input, "runId");
  return {
    requestId,
    ...(threadId ? { threadId } : {}),
    ...(runId ? { runId } : {}),
  };
}

function fallbackFrom(input: unknown): string | undefined {
  return stringFieldFrom(input, "fallbackMarkdown");
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

    const targetedActions = indexTargetActions(request);
    const selections = selectComponents(
      request,
      validatedCatalog.catalog,
      targetedActions,
    );
    completedStages.push(
      "semantic-resolution",
      "composition-planning",
      "component-selection",
    );

    const surface = buildUIIR(
      request,
      selections,
      validatedCatalog.catalog,
      options,
      targetedActions,
    );
    completedStages.push(
      "props-resolution",
      "action-binding",
      "ui-ir-building",
      "schema-validation",
    );

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
