import type { AGUIMock } from "@copilotkit/aimock";
import {
  buildActivityResponse,
  buildCompositeResponse,
  buildTextResponse,
  buildToolCallResponse,
} from "@copilotkit/aimock/agui";
import {
  MAP_PLAN_ACTIVITY_SCHEMA_VERSION,
  MAP_PLAN_ACTIVITY_TYPE,
  type MapPlanActivityContent,
  type MapPlanActivityStep,
} from "@generative-ui/shared-types";
import {
  acknowledgeToolResult,
  completedMapOperationResult,
  hasCompletedToolResult,
  type MapOperationExpectation,
} from "./tool-result.js";

export const MAP_PATROL_ROUTE_REVIEW_MESSAGE = "帮我想想怎么巡逻北侧通道";
export const MAP_PATROL_ROUTE_REVIEW_RESULT =
  "已展开北侧通道巡逻方案：限制图层已显示，3 个观察点与北坡限制区已高亮，并预览候选路线 A。";
export const MAP_PATROL_ROUTE_REVIEW_PLAN_MESSAGE_ID =
  "map-patrol-route-review-plan";

const MAP_PATROL_ROUTE_REVIEW_PLAN_STEPS = [
  {
    detail: "显示任务限制图层，并将地图聚焦到北侧通道。",
    id: "establish-scope",
    label: "确认任务范围与限制",
    operationNames: ["setLayerVisibility", "focusOn"],
  },
  {
    detail: "在地图上标出 3 个观察点和北坡限制区。",
    id: "mark-observations",
    label: "标记关键观察位置",
    operationNames: ["highlight"],
  },
  {
    detail: "展示已有候选路线 A，供后续检查和比较。",
    id: "preview-candidate",
    label: "预览候选路线",
    operationNames: ["previewPath"],
  },
] as const;

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

function planStepStatus(
  step: (typeof MAP_PATROL_ROUTE_REVIEW_PLAN_STEPS)[number],
  completedOperationCount: number,
): MapPlanActivityStep["status"] {
  const operationIndexes = step.operationNames.map((operationName) =>
    MAP_PATROL_ROUTE_REVIEW_STEPS.findIndex(
      (candidate) => candidate.toolName === operationName,
    ),
  );
  if (operationIndexes.every((index) => index < completedOperationCount))
    return "completed";
  if (operationIndexes.some((index) => index === completedOperationCount))
    return "running";
  return "pending";
}

export function mapPatrolRouteReviewPlan(
  completedOperationCount: number,
): MapPlanActivityContent {
  const steps = MAP_PATROL_ROUTE_REVIEW_PLAN_STEPS.map((step) => ({
    ...step,
    status: planStepStatus(step, completedOperationCount),
  }));
  return {
    goal: "形成一条覆盖关键观察点并避开限制区的北侧通道巡逻候选方案。",
    schemaVersion: MAP_PLAN_ACTIVITY_SCHEMA_VERSION,
    status:
      completedOperationCount >= MAP_PATROL_ROUTE_REVIEW_STEPS.length
        ? "completed"
        : "running",
    steps,
  };
}

function planActivity(completedOperationCount: number) {
  return buildActivityResponse(
    MAP_PATROL_ROUTE_REVIEW_PLAN_MESSAGE_ID,
    MAP_PLAN_ACTIVITY_TYPE,
    { ...mapPatrolRouteReviewPlan(completedOperationCount) },
  );
}

export function registerMapPatrolRouteReviewScenario(mock: AGUIMock): void {
  const toolCalls = MAP_PATROL_ROUTE_REVIEW_STEPS.map((step) =>
    buildToolCallResponse(step.toolName, JSON.stringify(step.args)),
  );
  const responses = toolCalls.map((toolCall, index) => {
    const response = buildCompositeResponse([planActivity(index), toolCall]);
    if (index === 0) return response;
    const previous = MAP_PATROL_ROUTE_REVIEW_STEPS[index - 1];
    const previousToolCall = toolCalls[index - 1];
    if (previous === undefined || previousToolCall === undefined)
      throw new Error("MAP_PATROL_SCENARIO_STEP_MISSING");
    return acknowledgeToolResult(
      response,
      previousToolCall,
      completedMapOperationResult(previous.expected),
    );
  });
  const finalStep = MAP_PATROL_ROUTE_REVIEW_STEPS.at(-1);
  const finalToolCall = toolCalls.at(-1);
  if (finalStep === undefined || finalToolCall === undefined)
    throw new Error("MAP_PATROL_SCENARIO_FINAL_STEP_MISSING");
  const finalEvents = acknowledgeToolResult(
    buildCompositeResponse([
      planActivity(MAP_PATROL_ROUTE_REVIEW_STEPS.length),
      buildTextResponse(MAP_PATROL_ROUTE_REVIEW_RESULT),
    ]),
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
