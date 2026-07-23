import { agentPresentationResultSchema } from "@generative-ui/presentation-contract";
import { z } from "zod";

export const compileStageSchema = z.enum([
  "input-validation",
  "markdown-parse",
  "presentation-analysis",
  "catalog-loading",
  "catalog-selection",
  "ui-ir",
  "a2ui-compile",
  "schema-validation",
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
        "ui-compiler-agent",
        "interaction-gateway",
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
  catalog: z.object({ catalogId: z.string().min(1), catalogVersion: z.string().min(1) }),
  context: z
    .object({
      locale: z.string().optional(),
      theme: z.string().optional(),
      viewport: z.object({ width: z.number().positive(), height: z.number().positive() }).optional(),
      userPreferences: z.record(z.unknown()).optional(),
    })
    .optional(),
});

export interface A2UIOperation {
  type: string;
  payload: Record<string, unknown>;
}

export interface UICompileResult {
  requestId: string;
  success: boolean;
  surfaceId?: string;
  operations?: A2UIOperation[];
  fallback?: { type: "template" | "markdown" | "text"; content: unknown };
  metadata: {
    catalogId: string;
    catalogVersion: string;
    compilerVersion: string;
    compileDurationMs: number;
    degraded: boolean;
  };
  errors?: CompileError[];
}

export type CompileStage = z.infer<typeof compileStageSchema>;
export type CompileError = z.infer<typeof compileErrorSchema>;
export type UICompileRequest = z.infer<typeof uiCompileRequestSchema>;
