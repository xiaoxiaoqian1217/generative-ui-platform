import type { AGUIMock } from "@copilotkit/aimock";
import type { AGUIRunAgentInput } from "@copilotkit/aimock/agui";
import {
  PATROL_ROUTE_CONSULT_TOOL,
  PATROL_ROUTE_REVISE_INSTRUCTION,
} from "@generative-ui/shared-types";
import {
  buildCompositeResponse,
  buildTextResponse,
  buildToolCallResponse,
} from "@copilotkit/aimock/agui";
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
  revise: {
    action: "revise",
    instruction: PATROL_ROUTE_REVISE_INSTRUCTION,
  },
  selectA: { action: "select", selectedOptionId: "route-a" },
  selectB: { action: "select", selectedOptionId: "route-b" },
} as const;

const HUMAN_RESPONSE_CONTINUATION_DELAY_MS = 160;

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

function hasConsultResponse(
  input: AGUIRunAgentInput,
  toolCallId: string,
  expected: object,
): boolean {
  const result = input.messages?.at(-1);
  if (
    result?.role !== "tool" ||
    result.toolCallId !== toolCallId ||
    typeof result.content !== "string"
  )
    return false;
  const sourceCall = [...(input.messages ?? [])]
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
      hasCompletedToolResult(input, "previewPath", {
        affectedFeatureIds: [pathFeatureId],
      }) &&
      input.messages?.some(
        (message) =>
          message.role === "tool" &&
          typeof message.content === "string" &&
          message.content.includes(response.selectedOptionId),
      ) === true,
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

export function registerConsultPatrolRouteSelectionScenario(
  mock: AGUIMock,
): void {
  const consultToolCall = buildToolCallResponse(
    PATROL_ROUTE_CONSULT_TOOL,
    JSON.stringify(PATROL_ROUTE_CONSULT_REQUEST),
  );
  const consultToolCallId = consultationToolCallId(consultToolCall);

  registerSelectionBranch(
    mock,
    consultToolCall,
    PATROL_ROUTE_CONSULT_RESPONSES.selectA,
    "patrol-path-a",
    "已记录路线 A，但尚未提交或执行巡逻任务。",
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

  const highlightArgs = {
    targets: [{ featureId: "under-bridge", layerId: "operational-points" }],
  };
  const highlightToolCall = buildToolCallResponse(
    "highlight",
    JSON.stringify(highlightArgs),
  );
  const reviseStart = acknowledgeToolResultContent(
    highlightToolCall,
    consultToolCall,
    JSON.stringify(PATROL_ROUTE_CONSULT_RESPONSES.revise),
  );
  const previewBArgs = {
    target: { featureId: "patrol-path-b", layerId: "patrol-routes" },
  };
  const previewBToolCall = buildToolCallResponse(
    "previewPath",
    JSON.stringify(previewBArgs),
  );
  const revisePreview = acknowledgeToolResult(
    previewBToolCall,
    highlightToolCall,
    completedMapOperationResult({ affectedFeatureIds: ["under-bridge"] }),
  );
  const reviseFinal = acknowledgeToolResult(
    buildTextResponse(
      "已按修改要求使用既有路线 B，重点覆盖桥下区域；没有生成新路线，也未执行巡逻任务。",
    ),
    previewBToolCall,
    completedMapOperationResult({ affectedFeatureIds: ["patrol-path-b"] }),
  );
  mock.onPredicate(
    (input) =>
      hasCompletedToolResult(input, "previewPath", {
        affectedFeatureIds: ["patrol-path-b"],
      }) &&
      input.messages?.some(
        (message) =>
          message.role === "tool" &&
          typeof message.content === "string" &&
          message.content.includes(PATROL_ROUTE_REVISE_INSTRUCTION),
      ) === true,
    reviseFinal,
  );
  mock.onPredicate(
    (input) =>
      hasCompletedToolResult(input, "highlight", {
        affectedFeatureIds: ["under-bridge"],
      }),
    revisePreview,
  );
  mock.onPredicate(
    (input) =>
      hasConsultResponse(
        input,
        consultToolCallId,
        PATROL_ROUTE_CONSULT_RESPONSES.revise,
      ),
    reviseStart,
    HUMAN_RESPONSE_CONTINUATION_DELAY_MS,
  );

  mock.onRun(
    PATROL_ROUTE_CONSULT_MESSAGE,
    buildCompositeResponse([
      buildTextResponse(
        "两条候选路线都已准备好。请在地图上比较后选择、取消或提出修改要求。",
      ),
      consultToolCall,
    ]),
  );
}
