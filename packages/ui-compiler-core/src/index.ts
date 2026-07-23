import type { ComponentCatalog } from "@generative-ui/component-catalog-schema";
import {
  type UICompileRequest,
  type UICompileResult,
  uiCompileRequestSchema,
} from "@generative-ui/compiler-contract";

export interface CompileOptions {
  catalog: ComponentCatalog;
}

export async function compileUI(
  input: UICompileRequest,
  options: CompileOptions,
): Promise<UICompileResult> {
  const startedAt = performance.now();
  const parsed = uiCompileRequestSchema.safeParse(input);
  const metadata = {
    catalogId: input.catalog.catalogId,
    catalogVersion: input.catalog.catalogVersion,
    compilerVersion: "0.1.0",
    compileDurationMs: 0,
    degraded: false,
  };

  if (!parsed.success) {
    return {
      requestId: input.requestId,
      success: false,
      fallback: {
        type: input.presentation.content ? "markdown" : "text",
        content: input.presentation.content ?? "Invalid compile request",
      },
      metadata: { ...metadata, compileDurationMs: performance.now() - startedAt, degraded: true },
      errors: [
        {
          code: "COMPILE_INPUT_INVALID",
          message: "Compile request validation failed",
          stage: "input-validation",
          retryable: false,
          details: parsed.error.flatten(),
        },
      ],
    };
  }

  const markdownComponent = options.catalog.components.find((component) => component.type === "Markdown");
  if (!markdownComponent) {
    return {
      requestId: input.requestId,
      success: false,
      fallback: { type: "markdown", content: input.presentation.content ?? input.presentation.data },
      metadata: { ...metadata, compileDurationMs: performance.now() - startedAt, degraded: true },
      errors: [
        {
          code: "CATALOG_MARKDOWN_COMPONENT_MISSING",
          message: "The MVP compiler requires a Markdown component in the catalog",
          stage: "catalog-selection",
          retryable: false,
        },
      ],
    };
  }

  const surfaceId = `surface-${input.requestId}`;
  return {
    requestId: input.requestId,
    success: true,
    surfaceId,
    operations: [
      {
        type: "createSurface",
        payload: {
          surfaceId,
          component: markdownComponent.type,
          props: {
            content:
              input.presentation.content ?? JSON.stringify(input.presentation.data, null, 2),
          },
        },
      },
    ],
    metadata: { ...metadata, compileDurationMs: performance.now() - startedAt },
  };
}
