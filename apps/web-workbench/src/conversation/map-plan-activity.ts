import type { ActivityMessage, Message } from "@ag-ui/core";
import {
  isMapPlanActivityContent,
  MAP_PLAN_ACTIVITY_TYPE,
  type MapPlanActivityContent,
  type MapPlanActivityStep,
} from "@generative-ui/shared-types";
import type { TurnObservation } from "../inspect/turn-inspection.js";
import type { ConversationTurn } from "./conversation-store.js";

function recordOf(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function planFromActivityMessage(
  message: Message,
): MapPlanActivityContent | undefined {
  if (message.role !== "activity") return undefined;
  const activity = message as ActivityMessage;
  if (activity.activityType !== MAP_PLAN_ACTIVITY_TYPE) return undefined;
  return isMapPlanActivityContent(activity.content)
    ? activity.content
    : undefined;
}

export function mapPlanActivityObservation(
  observations: readonly TurnObservation[],
): TurnObservation | undefined {
  return [...observations].reverse().find((observation) => {
    if (observation.type !== "ACTIVITY_SNAPSHOT") return false;
    const payload = recordOf(observation.payload);
    return (
      payload?.activityType === MAP_PLAN_ACTIVITY_TYPE &&
      isMapPlanActivityContent(payload.content)
    );
  });
}

export function mapPlanFromObservations(
  observations: readonly TurnObservation[],
): MapPlanActivityContent | undefined {
  const payload = recordOf(mapPlanActivityObservation(observations)?.payload);
  return isMapPlanActivityContent(payload?.content)
    ? payload.content
    : undefined;
}

export function mapPlanFromTurn(
  turn: ConversationTurn,
): MapPlanActivityContent | undefined {
  const observed = mapPlanFromObservations(turn.observations ?? []);
  if (observed !== undefined) return observed;
  for (const message of [...turn.responseMessages].reverse()) {
    const plan = planFromActivityMessage(message);
    if (plan !== undefined) return plan;
  }
  return undefined;
}

export function mapPlanStepForOperation(
  plan: MapPlanActivityContent | undefined,
  operationName: string | undefined,
): MapPlanActivityStep | undefined {
  if (operationName === undefined) return undefined;
  return plan?.steps.find((step) =>
    step.operationNames.includes(operationName),
  );
}

export function isMapPlanActivityMessage(message: Message): boolean {
  return planFromActivityMessage(message) !== undefined;
}
