import {
  buildA2UIEnvelope,
  DEFAULT_SURFACE_ID,
  prepareA2UIRequest,
  runA2UIGenerationWithRecovery,
} from "@ag-ui/a2ui-toolkit";
import { PLATFORM_A2UI_CATALOG_ID } from "@generative-ui/shared-types";
import {
  dynamicA2uiCatalogSchema,
  dynamicA2uiValidationCatalog,
} from "./dynamic-a2ui.js";
import type { InvokeSubagent } from "./secondary-llm.js";

export const A2UI_GENERATION_ERROR_ACTIVITY_TYPE = "a2ui-generation-error";

export type A2uiGenerationErrorCode =
  | "A2UI_GENERATION_FAILED"
  | "A2UI_GENERATION_UNAVAILABLE";

export interface A2uiGenerationErrorContent {
  readonly code: A2uiGenerationErrorCode;
  readonly errors?: readonly string[];
  readonly message: string;
}

export type A2uiSurfaceGeneration =
  | { readonly ok: true; readonly envelope: string }
  | { readonly ok: false; readonly error: A2uiGenerationErrorContent };

/**
 * The deterministic generation core shared by the Presentation Policy and
 * scenario evaluation (Issue #213): hand the serialized business content to
 * the Secondary LLM through `runA2UIGenerationWithRecovery` and return the
 * catalog-valid envelope, or a structured error. Performs no I/O and emits
 * no AG-UI events, so scenario tests can drive it directly.
 */
export async function generateA2uiSurfaceFromContent(
  businessContent: string,
  invokeSubagent: InvokeSubagent,
): Promise<A2uiSurfaceGeneration> {
  const prepared = prepareA2UIRequest({
    messages: [],
    state: {
      "ag-ui": {
        a2ui_schema: JSON.stringify(dynamicA2uiCatalogSchema),
        context: [
          {
            description:
              "Business content to present as one A2UI surface. Preserve every business fact exactly; do not invent, alter, or drop values.",
            value: businessContent,
          },
        ],
      },
    },
  });
  if (prepared.error !== undefined) {
    return {
      error: { code: "A2UI_GENERATION_FAILED", message: prepared.error },
      ok: false,
    };
  }
  const result = await runA2UIGenerationWithRecovery({
    basePrompt: prepared.prompt,
    buildEnvelope: (args) =>
      buildA2UIEnvelope({
        args,
        defaultCatalogId: PLATFORM_A2UI_CATALOG_ID,
        defaultSurfaceId: DEFAULT_SURFACE_ID,
        isUpdate: prepared.isUpdate,
      }),
    catalog: dynamicA2uiValidationCatalog,
    config: { maxAttempts: 2 },
    invokeSubagent,
  });
  if (!result.ok) {
    return {
      error: {
        code: "A2UI_GENERATION_FAILED",
        errors: result.attempts.flatMap((attempt) =>
          attempt.errors.map(
            (error) => `[${error.code}] ${error.path}: ${error.message}`,
          ),
        ),
        message:
          "Dynamic A2UI generation did not satisfy the catalog boundary.",
      },
      ok: false,
    };
  }
  return { envelope: result.envelope, ok: true };
}
