import type { AGUIMock } from "@copilotkit/aimock";
import type { AGUIRunAgentInput } from "@copilotkit/aimock/agui";
import {
  buildCompositeResponse,
  buildTextResponse,
  buildToolCallResponse,
} from "@copilotkit/aimock/agui";
import {
  PATROL_ROUTE_CONSULT_TOOL,
  PATROL_ROUTE_REVISE_INSTRUCTION,
} from "@generative-ui/shared-types";
import {
  acknowledgeToolResult,
  acknowledgeToolResultContent,
  completedMapOperationResult,
  hasCompletedToolResult,
} from "./tool-result.js";

export const PATROL_ROUTE_CONSULT_MESSAGE = "帮我想想怎么巡逻北侧通道。";
export {
  PATROL_ROUTE_CONSULT_TOOL,
  PATROL_ROUTE_REVISE_INSTRUCTION,
} from "@generative-ui/shared-types";

export const PATROL_ROUTE_CONSULT_REQUEST = {
  question:
    "两条候选路线都已准备好。请选择路线 A、路线 B，取消选择，或提出修改要求。",
  options: [
    {
      id: "route-a",
      label: "路线 A",
      summary: "经过东侧高地，覆盖范围较大、距离较长。",
      target: { featureId: "patrol-path-a", layerId: "patrol-routes" },
    },
    {
      id: "route-b",
      label: "路线 B",
      summary: "优先经过桥下区域，距离较短、东侧覆盖较少。",
      target: { featureId: "patrol-path-b", layerId: "patrol-routes" },
    },
  ],
} as const;

export const PATROL_ROUTE_CONSULT_RESPONSES = {
  cancel: { action: "cancel" },
  reviseA: {
    action: "revise",
    instruction: PATROL_ROUTE_REVISE_INSTRUCTION,
    selectedOptionId: "route-a",
  },
  reviseB: {
    action: "revise",
    instruction: PATROL_ROUTE_REVISE_INSTRUCTION,
    selectedOptionId: "route-b",
  },
  selectA: { action: "select", selectedOptionId: "route-a" },
  selectB: { action: "select", selectedOptionId: "route-b" },
} as const;

const HUMAN_RESPONSE_CONTINUATION_DELAY_MS = 160;
// AG-UI tool call IDs are conversation-global. Preallocate a small sequence
// so repeated deterministic consultations never reuse the same identity.
const CONSULTATION_OCCURRENCE_LIMIT = 8;

function consultationToolCallId(
  toolCallEvents: ReturnType<typeof buildToolCallResponse>,
): string {
  const start = toolCallEvents.find(
    (event) => event.type === "TOOL_CALL_START",
  );
  if (start?.type !== "TOOL_CALL_START")
    throw new Error("PATROL_ROUTE_CONSULT_TOOL_CALL_START_MISSING");
  return start.toolCallId;
}

function currentConsultMessages(input: AGUIRunAgentInput) {
  const messages = input.messages ?? [];
  let consultationStart = -1;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (
      message?.role === "user" &&
      message.content === PATROL_ROUTE_CONSULT_MESSAGE
    ) {
      consultationStart = index;
      break;
    }
  }
  return consultationStart < 0
    ? messages
    : messages.slice(consultationStart + 1);
}

function currentConsultInput(input: AGUIRunAgentInput): AGUIRunAgentInput {
  return { ...input, messages: currentConsultMessages(input) };
}

function consultationOccurrence(input: AGUIRunAgentInput): number {
  return (input.messages ?? []).filter(
    (message) =>
      message.role === "user" &&
      message.content === PATROL_ROUTE_CONSULT_MESSAGE,
  ).length;
}

function hasCurrentConsultToolCall(input: AGUIRunAgentInput): boolean {
  return currentConsultMessages(input).some((message) =>
    message.toolCalls?.some(
      (toolCall) => toolCall.function.name === PATROL_ROUTE_CONSULT_TOOL,
    ),
  );
}

function hasConsultResponse(
  input: AGUIRunAgentInput,
  toolCallId: string,
  expected: object,
): boolean {
  const messages = currentConsultMessages(input);
  const result = [...messages]
    .reverse()
    .find(
      (message) => message.role === "tool" && message.toolCallId === toolCallId,
    );
  if (result?.role !== "tool" || typeof result.content !== "string")
    return false;
  const sourceCall = [...messages]
    .reverse()
    .flatMap((message) => message.toolCalls ?? [])
    .find((toolCall) => toolCall.id === toolCallId);
  if (sourceCall?.function.name !== PATROL_ROUTE_CONSULT_TOOL) return false;
  try {
    return (
      JSON.stringify(JSON.parse(result.content)) === JSON.stringify(expected)
    );
  } catch {
    return false;
  }
}

function registerSelectionBranch(
  mock: AGUIMock,
  consultToolCall: ReturnType<typeof buildToolCallResponse>,
  response: (typeof PATROL_ROUTE_CONSULT_RESPONSES)["selectA" | "selectB"],
  pathFeatureId: "patrol-path-a" | "patrol-path-b",
  resultText: string,
): void {
  const previewArgs = {
    target: { featureId: pathFeatureId, layerId: "patrol-routes" },
  };
  const previewToolCall = buildToolCallResponse(
    "previewPath",
    JSON.stringify(previewArgs),
  );
  const branch = acknowledgeToolResultContent(
    previewToolCall,
    consultToolCall,
    JSON.stringify(response),
  );
  const final = acknowledgeToolResult(
    buildTextResponse(resultText),
    previewToolCall,
    completedMapOperationResult({ affectedFeatureIds: [pathFeatureId] }),
  );

  mock.onPredicate(
    (input) =>
      hasCompletedToolResult(currentConsultInput(input), "previewPath", {
        affectedFeatureIds: [pathFeatureId],
      }) &&
      hasConsultResponse(
        input,
        consultationToolCallId(consultToolCall),
        response,
      ),
    final,
  );
  mock.onPredicate(
    (input) =>
      hasConsultResponse(
        input,
        consultationToolCallId(consultToolCall),
        response,
      ),
    branch,
    HUMAN_RESPONSE_CONTINUATION_DELAY_MS,
  );
}

function registerRevisionBranch(
  mock: AGUIMock,
  consultToolCall: ReturnType<typeof buildToolCallResponse>,
  response: (typeof PATROL_ROUTE_CONSULT_RESPONSES)["reviseA" | "reviseB"],
  pathFeatureId: "patrol-path-a" | "patrol-path-b",
  resultText: string,
): void {
  const highlightToolCall = buildToolCallResponse(
    "highlight",
    JSON.stringify({
      targets: [{ featureId: "under-bridge", layerId: "operational-points" }],
    }),
  );
  const previewToolCall = buildToolCallResponse(
    "previewPath",
    JSON.stringify({
      target: { featureId: pathFeatureId, layerId: "patrol-routes" },
    }),
  );
  const reviseStart = acknowledgeToolResultContent(
    highlightToolCall,
    consultToolCall,
    JSON.stringify(response),
  );
  const revisePreview = acknowledgeToolResult(
    previewToolCall,
    highlightToolCall,
    completedMapOperationResult({ affectedFeatureIds: ["under-bridge"] }),
  );
  const reviseFinal = acknowledgeToolResult(
    buildTextResponse(resultText),
    previewToolCall,
    completedMapOperationResult({ affectedFeatureIds: [pathFeatureId] }),
  );
  const consultToolCallId = consultationToolCallId(consultToolCall);

  mock.onPredicate(
    (input) =>
      hasCompletedToolResult(currentConsultInput(input), "previewPath", {
        affectedFeatureIds: [pathFeatureId],
      }) && hasConsultResponse(input, consultToolCallId, response),
    reviseFinal,
  );
  mock.onPredicate(
    (input) =>
      hasCompletedToolResult(currentConsultInput(input), "highlight", {
        affectedFeatureIds: ["under-bridge"],
      }) && hasConsultResponse(input, consultToolCallId, response),
    revisePreview,
  );
  mock.onPredicate(
    (input) => hasConsultResponse(input, consultToolCallId, response),
    reviseStart,
    HUMAN_RESPONSE_CONTINUATION_DELAY_MS,
  );
}

export function registerConsultPatrolRouteSelectionScenario(
  mock: AGUIMock,
): void {
  const consultations = Array.from(
    { length: CONSULTATION_OCCURRENCE_LIMIT },
    () =>
      buildToolCallResponse(
        PATROL_ROUTE_CONSULT_TOOL,
        JSON.stringify(PATROL_ROUTE_CONSULT_REQUEST),
      ),
  );

  for (const consultToolCall of consultations) {
    const consultToolCallId = consultationToolCallId(consultToolCall);
    registerSelectionBranch(
      mock,
      consultToolCall,
      PATROL_ROUTE_CONSULT_RESPONSES.selectA,
      "patrol-path-a",
      "已记录路线 A，但尚未提交或执行巡逻任务。",
    );
    registerRevisionBranch(
      mock,
      consultToolCall,
      PATROL_ROUTE_CONSULT_RESPONSES.reviseA,
      "patrol-path-a",
      "已记录路线 A 的修改要求并继续预览既有路线 A；没有生成新路线，也未执行巡逻任务。",
    );
    registerRevisionBranch(
      mock,
      consultToolCall,
      PATROL_ROUTE_CONSULT_RESPONSES.reviseB,
      "patrol-path-b",
      "已按修改要求使用既有路线 B，重点覆盖桥下区域；没有生成新路线，也未执行巡逻任务。",
    );
    registerSelectionBranch(
      mock,
      consultToolCall,
      PATROL_ROUTE_CONSULT_RESPONSES.selectB,
      "patrol-path-b",
      "已记录路线 B，但尚未提交或执行巡逻任务。",
    );

    const cancelEvents = acknowledgeToolResultContent(
      buildTextResponse("没有选择巡逻路线，本次征询已取消。"),
      consultToolCall,
      JSON.stringify(PATROL_ROUTE_CONSULT_RESPONSES.cancel),
    );
    mock.onPredicate(
      (input) =>
        hasConsultResponse(
          input,
          consultToolCallId,
          PATROL_ROUTE_CONSULT_RESPONSES.cancel,
        ),
      cancelEvents,
      HUMAN_RESPONSE_CONTINUATION_DELAY_MS,
    );
  }

  consultations.forEach((consultToolCall, index) => {
    mock.onPredicate(
      (input) =>
        consultationOccurrence(input) === index + 1 &&
        !hasCurrentConsultToolCall(input),
      buildCompositeResponse([
        buildTextResponse(
          "两条候选路线都已准备好。请在地图上比较后选择、取消或提出修改要求。",
        ),
        consultToolCall,
      ]),
    );
  });
}
