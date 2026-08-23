import { z } from "zod";
import { PATROL_ROUTE_REVISE_INSTRUCTION } from "@generative-ui/shared-types";
import type { MapTargetRef } from "../features/map/map-operation.js";
import { MAP_PATROL_SCENARIO } from "../features/map/map-targets.js";

export {
  PATROL_ROUTE_CONSULT_TOOL,
  PATROL_ROUTE_REVISE_INSTRUCTION,
} from "@generative-ui/shared-types";

const mapTargetRefSchema = z
  .object({
    featureId: z.string().min(1),
    layerId: z.string().min(1).optional(),
  })
  .strict();

const patrolRouteOptionSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    summary: z.string().min(1),
    target: mapTargetRefSchema,
  })
  .strict();

const EXPECTED_ROUTE_TARGETS: ReadonlyMap<string, MapTargetRef> = new Map<
  string,
  MapTargetRef
>([
  ["route-a", MAP_PATROL_SCENARIO.pathA],
  ["route-b", MAP_PATROL_SCENARIO.pathB],
]);

export const patrolRouteConsultRequestSchema = z
  .object({
    question: z.string().trim().min(1),
    options: z.array(patrolRouteOptionSchema).length(2),
  })
  .strict()
  .superRefine((request, context) => {
    const optionIds = new Set(request.options.map((option) => option.id));
    if (optionIds.size !== request.options.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Route option ids must be unique.",
        path: ["options"],
      });
    }
    for (const option of request.options) {
      const expectedTarget = EXPECTED_ROUTE_TARGETS.get(option.id);
      if (
        expectedTarget === undefined ||
        option.target.featureId !== expectedTarget.featureId ||
        option.target.layerId !== expectedTarget.layerId
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Each route option must reference its existing path.",
          path: ["options"],
        });
      }
    }
  });

export type PatrolRouteConsultRequest = z.infer<
  typeof patrolRouteConsultRequestSchema
>;
export type PatrolRouteOption = PatrolRouteConsultRequest["options"][number];

export const patrolRouteConsultResponseSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("select"),
      selectedOptionId: z.string().min(1),
    })
    .strict(),
  z.object({ action: z.literal("cancel") }).strict(),
  z
    .object({
      action: z.literal("revise"),
      instruction: z.literal(PATROL_ROUTE_REVISE_INSTRUCTION),
      selectedOptionId: z.string().min(1),
    })
    .strict(),
]);

export type PatrolRouteConsultResponse = z.infer<
  typeof patrolRouteConsultResponseSchema
>;

export interface PatrolRouteConsultController {
  cancelPreview(toolCallId: string): Promise<void>;
  complete(toolCallId: string): void;
  invalidate(toolCallId: string): void;
  isActive(toolCallId: string): boolean;
  markActive(toolCallId: string): void;
  previewOption(toolCallId: string, option: PatrolRouteOption): Promise<void>;
}

export function parsePatrolRouteConsultResponse(
  request: PatrolRouteConsultRequest,
  response: unknown,
): PatrolRouteConsultResponse {
  const parsed = patrolRouteConsultResponseSchema.parse(response);
  if (
    (parsed.action === "select" || parsed.action === "revise") &&
    !request.options.some((option) => option.id === parsed.selectedOptionId)
  ) {
    throw new Error("Selected route option is not part of this consultation.");
  }
  return parsed;
}

export function patrolRouteConsultResult(
  value: string | undefined,
): PatrolRouteConsultResponse | undefined {
  if (value === undefined) return undefined;
  try {
    return patrolRouteConsultResponseSchema.parse(JSON.parse(value));
  } catch {
    return undefined;
  }
}
