import { agentPresentationResultSchema } from "@generative-ui/presentation-contract";
import { z } from "zod";

export const compileStageSchema = z.enum([
  "input-validation",
  "markdown-parse",
  "presentation-analysis",
  "catalog-loading",
  "component-selection",
  "ui-ir",
  "a2ui-compile",
  "schema-validation",
  "fallback",
  "output-adapter",
]);

export const compileErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  stage: compileStageSchema,
  retryable: z.boolean(),
  details: z.unknown().optional(),
});

export const uiCompileRequestSchema = z.object({
  requestId: z.string().min(1),
  threadId: z.string().optional(),
  runId: z.string().optional(),
  source: z
    .object({
      sourceType: z.enum([
        "ui-compiler-service",
        "business-agent",
        "http",
        "sdk",
        "mcp",
      ]),
      sourceId: z.string().optional(),
      domain: z.string().optional(),
    })
    .optional(),
  presentation: agentPresentationResultSchema,
  catalog: z.object({
    catalogId: z.string().min(1),
    catalogVersion: z.string().min(1),
  }),
  context: z
    .object({
      locale: z.string().optional(),
      theme: z.string().optional(),
      viewport: z
        .object({ width: z.number().positive(), height: z.number().positive() })
        .optional(),
      userPreferences: z.record(z.unknown()).optional(),
    })
    .optional(),
});

export const a2uiOperationSchema = z
  .object({
    type: z.string().min(1),
    payload: z.record(z.unknown()),
  })
  .strict();

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ]),
);

export const compileFallbackSchema = z
  .object({
    type: z.enum(["template", "markdown", "text"]),
    content: jsonValueSchema,
    reason: z.string().min(1),
    errorCode: z.string().min(1),
  })
  .strict();

export const uiCompileMetadataSchema = z
  .object({
    catalogId: z.string().min(1),
    catalogVersion: z.string().min(1),
    compilerVersion: z.string().min(1),
    compileDurationMs: z.number().nonnegative(),
  })
  .strict();

const successfulCompileResultSchema = z
  .object({
    requestId: z.string().min(1),
    success: z.literal(true),
    degraded: z.literal(false),
    surfaceId: z.string().min(1),
    operations: z.array(a2uiOperationSchema).min(1),
    fallback: z.never().optional(),
    metadata: uiCompileMetadataSchema,
    errors: z.never().optional(),
  })
  .strict();

const degradedCompileResultSchema = z
  .object({
    requestId: z.string().min(1),
    success: z.literal(true),
    degraded: z.literal(true),
    surfaceId: z.never().optional(),
    operations: z.never().optional(),
    fallback: compileFallbackSchema,
    metadata: uiCompileMetadataSchema,
    errors: z.array(compileErrorSchema).min(1),
  })
  .strict();

const failedCompileResultSchema = z
  .object({
    requestId: z.string().min(1),
    success: z.literal(false),
    degraded: z.literal(false),
    surfaceId: z.never().optional(),
    operations: z.never().optional(),
    fallback: z.never().optional(),
    metadata: uiCompileMetadataSchema,
    errors: z.array(compileErrorSchema).min(1),
  })
  .strict();

export const uiCompileResultSchema = z.union([
  successfulCompileResultSchema,
  degradedCompileResultSchema,
  failedCompileResultSchema,
]);

export type CompileStage = z.infer<typeof compileStageSchema>;
export type CompileError = z.infer<typeof compileErrorSchema>;
export type UICompileRequest = z.infer<typeof uiCompileRequestSchema>;
export type A2UIOperation = z.infer<typeof a2uiOperationSchema>;
export type CompileFallback = z.infer<typeof compileFallbackSchema>;
export type UICompileMetadata = z.infer<typeof uiCompileMetadataSchema>;
export type UICompileResult = z.infer<typeof uiCompileResultSchema>;
