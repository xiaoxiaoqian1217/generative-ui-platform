import { z } from "zod";

export const presentationIntentSchema = z.enum([
  "summary",
  "status",
  "comparison",
  "timeline",
  "confirmation",
  "form",
  "detail",
]);

export const actionIntentSchema = z.object({
  actionId: z.string().min(1),
  actionType: z.string().min(1),
  label: z.string().min(1),
  ownerAgentId: z.string().min(1).optional(),
  resourceId: z.string().min(1).optional(),
  payload: z.record(z.unknown()).optional(),
  requiresApproval: z.boolean().optional(),
  destructive: z.boolean().optional(),
});

const metadataSchema = z.object({
  sourceAgentId: z.string().optional(),
  resultId: z.string().optional(),
  domain: z.string().optional(),
  timestamp: z.string().datetime().optional(),
});

export const agentPresentationResultSchema = z
  .object({
    contentType: z.enum(["markdown", "structured-data"]),
    content: z.string().optional(),
    data: z.unknown().optional(),
    presentationIntent: presentationIntentSchema.optional(),
    actions: z.array(actionIntentSchema).optional(),
    metadata: metadataSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.contentType === "markdown" && !value.content?.trim()) {
      context.addIssue({ code: "custom", path: ["content"], message: "Markdown content is required" });
    }
    if (value.contentType === "structured-data" && value.data === undefined) {
      context.addIssue({ code: "custom", path: ["data"], message: "Structured data is required" });
    }
  });

export type PresentationIntent = z.infer<typeof presentationIntentSchema>;
export type ActionIntent = z.infer<typeof actionIntentSchema>;
export type AgentPresentationResult = z.infer<typeof agentPresentationResultSchema>;
