import type { TurnObservation } from "../inspect/turn-inspection.js";

const MAP_TOOL_NAMES = [
  "setLayerVisibility",
  "focusOn",
  "highlight",
  "previewPath",
] as const;

type MapToolName = (typeof MAP_TOOL_NAMES)[number];

export type MapOperationStepStatus =
  | "cancelled"
  | "completed"
  | "failed"
  | "running"
  | "superseded";

export interface MapOperationStep {
  readonly label: string;
  readonly status: MapOperationStepStatus;
  readonly toolCallId: string;
  readonly toolName: MapToolName;
}

function recordOf(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function mapToolNameOf(value: unknown): MapToolName | undefined {
  return typeof value === "string" &&
    MAP_TOOL_NAMES.includes(value as MapToolName)
    ? (value as MapToolName)
    : undefined;
}

function featureIdOf(value: unknown): string | undefined {
  const featureId = recordOf(value)?.featureId;
  return typeof featureId === "string" ? featureId : undefined;
}

function targetFeatureIdsOf(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(featureIdOf)
    .filter((featureId): featureId is string => featureId !== undefined);
}

function operationLabel(
  toolName: MapToolName,
  args: Record<string, unknown>,
): string {
  if (toolName === "setLayerVisibility")
    return args.visible === false ? "隐藏任务限制图层" : "显示任务限制图层";

  if (toolName === "focusOn") {
    const featureId = featureIdOf(args.target);
    if (featureId === "north-corridor") return "聚焦北侧通道";
    if (featureId !== undefined) return `聚焦地图目标 ${featureId}`;
    return "聚焦地图目标";
  }

  if (toolName === "highlight") {
    const featureIds = targetFeatureIdsOf(args.targets);
    const patrolTargetIds = new Set([
      "checkpoint-b",
      "east-ridge",
      "north-restricted-zone",
      "under-bridge",
    ]);
    if (
      featureIds.length === patrolTargetIds.size &&
      featureIds.every((featureId) => patrolTargetIds.has(featureId))
    )
      return "标记观察点和限制区";
    if (featureIds.length > 0) return `高亮 ${featureIds.length} 个地图目标`;
    return "高亮地图目标";
  }

  const featureId = featureIdOf(args.target);
  if (featureId === "patrol-path-a") return "预览候选路线 A";
  if (featureId === "patrol-path-b") return "预览候选路线 B";
  return "预览候选路线";
}

function contractStatusOf(value: unknown): string | undefined {
  let decoded = value;
  if (typeof value === "string") {
    try {
      decoded = JSON.parse(value) as unknown;
    } catch {
      return undefined;
    }
  }
  const status = recordOf(decoded)?.status;
  return typeof status === "string" ? status : undefined;
}

function stepStatusOf(
  result: TurnObservation | undefined,
): MapOperationStepStatus {
  if (result === undefined) return "running";
  if (result.status === "failed") return "failed";
  if (result.status === "cancelled") return "cancelled";

  const resultPayload = recordOf(result.payload);
  const contractStatus = contractStatusOf(resultPayload?.result);
  if (contractStatus === "failed") return "failed";
  if (contractStatus === "cancelled") return "cancelled";
  if (contractStatus === "superseded") return "superseded";
  return "completed";
}

export function mapOperationSteps(
  observations: readonly TurnObservation[],
): readonly MapOperationStep[] {
  const results = new Map<string, TurnObservation>();
  for (const observation of observations) {
    if (
      observation.type === "FRONTEND_TOOL_RESULT" &&
      observation.toolCallId !== undefined
    )
      results.set(observation.toolCallId, observation);
  }

  const steps: MapOperationStep[] = [];
  for (const observation of observations) {
    if (
      observation.type !== "FRONTEND_TOOL_INVOCATION" ||
      observation.toolCallId === undefined
    )
      continue;
    const payload = recordOf(observation.payload);
    const toolName = mapToolNameOf(payload?.name);
    if (toolName === undefined) continue;
    const args = recordOf(payload?.args) ?? {};
    steps.push({
      label: operationLabel(toolName, args),
      status: stepStatusOf(results.get(observation.toolCallId)),
      toolCallId: observation.toolCallId,
      toolName,
    });
  }
  return steps;
}
