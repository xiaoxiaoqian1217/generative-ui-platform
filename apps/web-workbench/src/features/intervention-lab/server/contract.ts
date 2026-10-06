import type { Interrupt } from "@ag-ui/core";
import { z } from "zod";
import type { LabAction, LabState } from "../model.js";

export const INTERVENTION_AGENT_PATH = "/api/intervention-agent";
export const interventionScenarioSchema = z.enum([
  "observation-cooperation",
  "priority-cooperation",
]);
export type InterventionScenarioId = z.infer<typeof interventionScenarioSchema>;

export interface InterventionAgentState {
  schemaVersion: "intervention-agent/v1";
  revision: number;
  scenarioId: InterventionScenarioId;
  task: LabState;
  inputActions: LabAction[];
  /** Server-owned checkpoint interrupts, also available after transport loss. */
  openInterrupts: Interrupt[];
  /** Number of task scheduling actions; human responses are recorded separately. */
  cursor: number;
}

export interface InterventionCommandResult {
  accepted: boolean;
  revision: number;
  detail: string;
}

const identifier = z.string().trim().min(1).max(200);
const provenance = z
  .enum(["interactive", "fixture-event", "fixture-script"])
  .optional();

export const interventionRunPropsSchema = z.discriminatedUnion("operation", [
  z
    .object({
      operation: z.literal("start"),
      scenarioId: interventionScenarioSchema,
      manual: z.boolean().optional(),
    })
    .strict(),
  z
    .object({
      operation: z.literal("continue"),
      taskId: identifier,
    })
    .strict(),
]);

export const interventionResponseSchema = z
  .object({
    type: z.literal("respond"),
    actionId: identifier,
    runId: identifier,
    requestId: identifier,
    requestVersion: z.number().int().positive(),
    optionId: identifier,
    values: z.record(z.string().max(2_000)).optional(),
    provenance,
  })
  .strict();

export const interventionCommandSchema = z
  .object({
    expectedRevision: z.number().int().nonnegative(),
    action: z.discriminatedUnion("type", [
      z
        .object({
          type: z.literal("advance"),
          actionId: identifier,
        })
        .strict(),
      z
        .object({
          type: z.literal("prioritize-step"),
          actionId: identifier,
          runId: identifier,
          planVersion: z.number().int().positive(),
          stepId: identifier,
          provenance,
        })
        .strict(),
    ]),
  })
  .strict();
