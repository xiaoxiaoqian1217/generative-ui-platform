import {
  type UICompileRequest,
  type UICompileResult,
  uiCompileRequestSchema,
  uiCompileResultSchema,
} from "@generative-ui/compiler-contract";
import type { ComponentCatalog } from "@generative-ui/component-catalog-schema";

export interface CompileOptions {
  catalog: ComponentCatalog;
}

function readNonEmptyString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

export async function compileUI(
  input: UICompileRequest,
  options: CompileOptions,
): Promise<UICompileResult> {
  const startedAt = performance.now();
  const parsed = uiCompileRequestSchema.safeParse(input);

  if (!parsed.success) {
    const invalidInput = input as {
      requestId?: unknown;
      catalog?: { catalogId?: unknown; catalogVersion?: unknown };
    };

    return uiCompileResultSchema.parse({
      requestId: readNonEmptyString(invalidInput.requestId, "unknown-request"),
      success: false,
      degraded: false,
      metadata: {
        catalogId: readNonEmptyString(
          invalidInput.catalog?.catalogId,
          "unknown-catalog",
        ),
        catalogVersion: readNonEmptyString(
          invalidInput.catalog?.catalogVersion,
          "unknown-version",
        ),
        compilerVersion: "0.1.0",
        compileDurationMs: performance.now() - startedAt,
      },
      errors: [
        {
          code: "COMPILE_INPUT_INVALID",
          message: "Compile request validation failed",
          stage: "input-validation",
          retryable: false,
          details: parsed.error.flatten(),
        },
      ],
    });
  }

  const request = parsed.data;
  const metadata = {
    catalogId: request.catalog.catalogId,
    catalogVersion: request.catalog.catalogVersion,
    compilerVersion: "0.1.0",
    compileDurationMs: 0,
  };

  const markdownComponent = options.catalog.components.find(
    (component) => component.type === "Markdown",
  );
  if (!markdownComponent) {
    return uiCompileResultSchema.parse({
      requestId: request.requestId,
      success: true,
      degraded: true,
      fallback: {
        type: request.presentation.content ? "markdown" : "text",
        content: request.presentation.content ?? request.presentation.data,
        reason: "The requested catalog cannot render Markdown",
        errorCode: "CATALOG_MARKDOWN_COMPONENT_MISSING",
      },
      metadata: {
        ...metadata,
        compileDurationMs: performance.now() - startedAt,
      },
      errors: [
        {
          code: "CATALOG_MARKDOWN_COMPONENT_MISSING",
          message:
            "The MVP compiler requires a Markdown component in the catalog",
          stage: "component-selection",
          retryable: false,
        },
      ],
    });
  }

  const surfaceId = `surface-${request.requestId}`;
  return uiCompileResultSchema.parse({
    requestId: request.requestId,
    success: true,
    degraded: false,
    surfaceId,
    operations: [
      {
        type: "createSurface",
        payload: {
          surfaceId,
          component: markdownComponent.type,
          props: {
            content:
              request.presentation.content ??
              JSON.stringify(request.presentation.data, null, 2),
          },
        },
      },
    ],
    metadata: { ...metadata, compileDurationMs: performance.now() - startedAt },
  });
}
