import { randomUUID } from "node:crypto";
import {
  createInitialState,
  dispatchLabAction,
  getNextPlannedStepId,
  type LabAction,
  type LabRequest,
} from "../model.js";
import type {
  InterventionAgentState,
  InterventionScenarioId,
} from "./contract.js";

/** This service owns the simulation task. It never accepts client execution facts. */
export function createInterventionTask(
  scenarioId: InterventionScenarioId,
): InterventionAgentState {
  const taskId = `task:${randomUUID()}`;
  let envelope: InterventionAgentState = {
    schemaVersion: "intervention-agent/v1",
    revision: 0,
    scenarioId,
    task: createInitialState(
      taskId,
      scenarioId === "observation-cooperation"
        ? "observation-input"
        : "priority-order",
    ),
    inputActions: [],
    openInterrupts: [],
    cursor: 0,
  };
  envelope = applyTaskAction(
    envelope,
    {
      type: "start-task",
      actionId: `${taskId}:start`,
      provenance: "interactive",
    },
    true,
  );
  return applyTaskAction(
    envelope,
    {
      type: "start-next-step",
      actionId: `${taskId}:initial-step`,
      provenance: "fixture-event",
    },
    true,
  );
}

export function pendingTaskRequests(
  envelope: InterventionAgentState,
): LabRequest[] {
  return envelope.task.requests.filter(
    (request) => request.status === "pending",
  );
}

/** Produces a candidate, allowing resume batches to validate before committing. */
export function applyTaskAction(
  previous: InterventionAgentState,
  action: LabAction,
  schedulerAction = false,
): InterventionAgentState {
  const task = dispatchLabAction(previous.task, action);
  const entry = task.logs.at(-1);
  if (!entry?.accepted) throw new Error(entry?.detail ?? "任务动作未被接受。");
  return {
    ...previous,
    revision: previous.revision + 1,
    task,
    inputActions: [...previous.inputActions, action],
    cursor: previous.cursor + (schedulerAction ? 1 : 0),
  };
}

/** Selects the next actual simulation action from current authoritative state. */
export function nextTaskAction(
  envelope: InterventionAgentState,
  actionId = `${envelope.task.runId}:tick:${envelope.cursor + 1}`,
): LabAction | undefined {
  const task = envelope.task;
  if (task.phase === "ended" || pendingTaskRequests(envelope).length > 0)
    return;
  const base = { actionId, provenance: "fixture-event" as const };
  const current = task.steps.find((step) => step.status === "running");
  if (current) {
    const input = task.collaboration?.observationInput;
    if (input?.stepId === current.id && input.status === "missing") {
      return {
        ...base,
        type: "request-observation-point",
        stepId: current.id,
        requestId: `${task.runId}:observation:${current.id}`,
      };
    }
    const road = task.roads.find((item) => item.id === current.roadId);
    if (road?.status === "unchecked") {
      return {
        ...base,
        type: "observe-current-road",
        condition: "passable",
        detail:
          "服务端模拟观测：该模拟UGV所需通道可通过；不代表真实设备或其他车型。",
      };
    }
    return { ...base, type: "complete-current-step" };
  }
  if (getNextPlannedStepId(task)) return { ...base, type: "start-next-step" };
  return { ...base, type: "finish-task" };
}
