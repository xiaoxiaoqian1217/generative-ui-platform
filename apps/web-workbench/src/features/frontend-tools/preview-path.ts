import type { MapOperationResult, MapTargetRef } from "../map/map-operation.js";
import { findMapTarget, type MapTarget } from "../map/map-targets.js";

export interface PreviewPathInput {
  readonly target: MapTargetRef;
}

export type PreviewMapPath = (target: MapTarget) => Promise<void> | void;

export async function previewPath(
  input: PreviewPathInput,
  previewMapPath: PreviewMapPath,
): Promise<MapOperationResult> {
  const target = findMapTarget(input.target);
  if (target?.pathPreviewable !== true) {
    return {
      affectedFeatureIds: [],
      reason: `Map target is unavailable for path preview: ${input.target.featureId}`,
      status: "failed",
    };
  }

  try {
    await previewMapPath(target);
    return {
      affectedFeatureIds: [target.featureId],
      status: "completed",
    };
  } catch (error) {
    return {
      affectedFeatureIds: [],
      reason: `Map path preview failed: ${error instanceof Error ? error.message : "unknown error"}`,
      status: "failed",
    };
  }
}
