import type { AGUIMock } from "@copilotkit/aimock";
import {
  buildTextResponse,
  buildToolCallResponse,
} from "@copilotkit/aimock/agui";
import {
  acknowledgeToolResult,
  completedMapOperationResult,
  hasCompletedToolResult,
  type MapOperationExpectation,
} from "./tool-result.js";

export const MAP_PATROL_ROUTE_REVIEW_MESSAGE = "帮我想想怎么巡逻北侧通道";
export const MAP_PATROL_ROUTE_REVIEW_RESULT =
  "已展开北侧通道巡逻方案：限制图层已显示，3 个观察点与北坡限制区已高亮，并预览候选路线 A。";

export const MAP_PATROL_ROUTE_REVIEW_STEPS = [
  {
    args: {
      layer: { layerId: "operational-constraints" },
      visible: true,
    },
    expected: { affectedLayerIds: ["operational-constraints"] },
    toolName: "setLayerVisibility",
  },
  {
    args: {
      target: {
        featureId: "north-corridor",
        layerId: "operational-areas",
      },
    },
    expected: { affectedFeatureIds: ["north-corridor"] },
    toolName: "focusOn",
  },
  {
    args: {
      targets: [
        { featureId: "east-ridge", layerId: "operational-points" },
        { featureId: "under-bridge", layerId: "operational-points" },
        { featureId: "checkpoint-b", layerId: "operational-points" },
        {
          featureId: "north-restricted-zone",
          layerId: "operational-constraints",
        },
      ],
    },
    expected: {
      affectedFeatureIds: [
        "east-ridge",
        "under-bridge",
        "checkpoint-b",
        "north-restricted-zone",
      ],
    },
    toolName: "highlight",
  },
  {
    args: {
      target: { featureId: "patrol-path-a", layerId: "patrol-routes" },
    },
    expected: { affectedFeatureIds: ["patrol-path-a"] },
    toolName: "previewPath",
  },
] as const satisfies readonly {
  readonly args: Record<string, unknown>;
  readonly expected: MapOperationExpectation;
  readonly toolName: string;
}[];

const OBSERVATION_DELAY_MS = 120;

export function registerMapPatrolRouteReviewScenario(mock: AGUIMock): void {
  const toolCalls = MAP_PATROL_ROUTE_REVIEW_STEPS.map((step) =>
    buildToolCallResponse(step.toolName, JSON.stringify(step.args)),
  );
  const responses = toolCalls.map((toolCall, index) => {
    if (index === 0) return toolCall;
    const previous = MAP_PATROL_ROUTE_REVIEW_STEPS[index - 1];
    const previousToolCall = toolCalls[index - 1];
    if (previous === undefined || previousToolCall === undefined)
      throw new Error("MAP_PATROL_SCENARIO_STEP_MISSING");
    return acknowledgeToolResult(
      toolCall,
      previousToolCall,
      completedMapOperationResult(previous.expected),
    );
  });
  const finalStep = MAP_PATROL_ROUTE_REVIEW_STEPS.at(-1);
  const finalToolCall = toolCalls.at(-1);
  if (finalStep === undefined || finalToolCall === undefined)
    throw new Error("MAP_PATROL_SCENARIO_FINAL_STEP_MISSING");
  const finalEvents = acknowledgeToolResult(
    buildTextResponse(MAP_PATROL_ROUTE_REVIEW_RESULT),
    finalToolCall,
    completedMapOperationResult(finalStep.expected),
  );

  mock.onPredicate(
    (input) =>
      hasCompletedToolResult(input, finalStep.toolName, finalStep.expected),
    finalEvents,
    OBSERVATION_DELAY_MS,
  );
  for (
    let index = MAP_PATROL_ROUTE_REVIEW_STEPS.length - 2;
    index >= 0;
    index -= 1
  ) {
    const step = MAP_PATROL_ROUTE_REVIEW_STEPS[index];
    const nextResponse = responses[index + 1];
    if (step === undefined || nextResponse === undefined)
      throw new Error("MAP_PATROL_SCENARIO_RESPONSE_MISSING");
    mock.onPredicate(
      (input) => hasCompletedToolResult(input, step.toolName, step.expected),
      nextResponse,
      OBSERVATION_DELAY_MS,
    );
  }
  const firstResponse = responses[0];
  if (firstResponse === undefined)
    throw new Error("MAP_PATROL_SCENARIO_FIRST_RESPONSE_MISSING");
  mock.onRun(
    MAP_PATROL_ROUTE_REVIEW_MESSAGE,
    firstResponse,
    OBSERVATION_DELAY_MS,
  );
}
