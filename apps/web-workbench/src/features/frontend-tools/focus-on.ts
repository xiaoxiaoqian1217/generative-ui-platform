import type { MapOperationResult, MapTargetRef } from "../map/map-operation.js";
import { findMapTarget, type MapTarget } from "../map/map-targets.js";

export interface FocusOnInput {
  readonly target: MapTargetRef;
}

export type FocusMapTarget = (target: MapTarget) => void;

export function focusOn(
  input: FocusOnInput,
  focusMapTarget: FocusMapTarget,
): MapOperationResult {
  const target = findMapTarget(input.target);
  if (target === undefined) {
    return {
      affectedFeatureIds: [],
      reason: `Map target not found: ${input.target.featureId}`,
      status: "failed",
    };
  }

  try {
    focusMapTarget(target);
    return {
      affectedFeatureIds: [target.featureId],
      status: "completed",
    };
  } catch (error) {
    return {
      affectedFeatureIds: [],
      reason: `Map focus failed: ${error instanceof Error ? error.message : "unknown error"}`,
      status: "failed",
    };
  }
}
