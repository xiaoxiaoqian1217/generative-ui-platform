import type {
  BusinessAgentRunRequest,
  BusinessAgentRunResult,
} from "@generative-ui/runtime-contract";
import {
  Annotation,
  END,
  interrupt,
  MemorySaver,
  START,
  StateGraph,
} from "@langchain/langgraph";
import {
  classifyScenario,
  confirmPatrolTask,
  createPatrolPlanDraft,
  helpContent,
  type PatrolPlanDraft,
  patrolDraftContent,
  queryDeviceStatus,
  type ReferenceScenario,
} from "./business-tools.js";

type AgentContent = Extract<
  BusinessAgentRunResult,
  { status: "completed" }
>["content"];

export const ReferenceAgentState = Annotation.Root({
  request: Annotation<BusinessAgentRunRequest>(),
  scenario: Annotation<ReferenceScenario | undefined>(),
  draft: Annotation<PatrolPlanDraft | undefined>(),
  approved: Annotation<boolean | undefined>(),
  content: Annotation<AgentContent | undefined>(),
});

export type ReferenceAgentStateValue = typeof ReferenceAgentState.State;
export type ReferenceAgentStateUpdate = typeof ReferenceAgentState.Update;

export function routeRequestNode(
  state: ReferenceAgentStateValue,
): ReferenceAgentStateUpdate {
  return { scenario: classifyScenario(state.request.input.message) };
}

export function deviceStatusNode(
  state: ReferenceAgentStateValue,
): ReferenceAgentStateUpdate {
  return { content: queryDeviceStatus(state.request.input.message) };
}

export function patrolDraftNode(): ReferenceAgentStateUpdate {
  return { draft: createPatrolPlanDraft() };
}

export function awaitPatrolConfirmationNode(
  state: ReferenceAgentStateValue,
): ReferenceAgentStateUpdate {
  if (state.draft === undefined) {
    throw new Error("PATROL_DRAFT_MISSING");
  }
  const approved = interrupt({
    kind: "patrol-confirmation-required",
    planId: state.draft.planId,
  });
  return { approved: approved === true };
}

export function confirmPatrolTaskNode(
  state: ReferenceAgentStateValue,
): ReferenceAgentStateUpdate {
  if (state.draft === undefined || state.approved !== true) {
    throw new Error("PATROL_CONFIRMATION_INVALID");
  }
  return { content: confirmPatrolTask(state.draft) };
}

export function helpNode(): ReferenceAgentStateUpdate {
  return { content: helpContent() };
}

function routeFromState(state: ReferenceAgentStateValue): ReferenceScenario {
  return state.scenario ?? "help";
}

export function createReferenceBusinessGraph(
  checkpointer: MemorySaver = new MemorySaver(),
) {
  return new StateGraph(ReferenceAgentState)
    .addNode("route-request", routeRequestNode)
    .addNode("device-status", deviceStatusNode)
    .addNode("patrol-draft", patrolDraftNode)
    .addNode("await-patrol-confirmation", awaitPatrolConfirmationNode)
    .addNode("confirm-patrol-task", confirmPatrolTaskNode)
    .addNode("help", helpNode)
    .addEdge(START, "route-request")
    .addConditionalEdges("route-request", routeFromState, {
      "device-status": "device-status",
      "patrol-plan": "patrol-draft",
      help: "help",
    })
    .addEdge("device-status", END)
    .addEdge("patrol-draft", "await-patrol-confirmation")
    .addEdge("await-patrol-confirmation", "confirm-patrol-task")
    .addEdge("confirm-patrol-task", END)
    .addEdge("help", END)
    .compile({ checkpointer });
}

export function initialGraphState(
  request: BusinessAgentRunRequest,
): ReferenceAgentStateValue {
  return {
    request,
    scenario: undefined,
    draft: undefined,
    approved: undefined,
    content: undefined,
  };
}

export function interruptedDraftContent(
  state: ReferenceAgentStateValue,
): AgentContent {
  if (state.draft === undefined) throw new Error("PATROL_DRAFT_MISSING");
  return patrolDraftContent(state.draft);
}
