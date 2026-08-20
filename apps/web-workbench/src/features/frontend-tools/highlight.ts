import type { MapOperationResult, MapTargetRef } from "../map/map-operation.js";
import { findMapTarget, type MapTarget } from "../map/map-targets.js";

export interface HighlightInput {
  readonly targets: readonly MapTargetRef[];
}

export type HighlightMapTargets = (targets: readonly MapTarget[]) => void;

export function highlight(
  input: HighlightInput,
  highlightMapTargets: HighlightMapTargets,
): MapOperationResult {
  const resolvedTargets: MapTarget[] = [];
  const missingFeatureIds: string[] = [];
  for (const targetRef of input.targets) {
    const target = findMapTarget(targetRef);
    if (target?.highlightable !== true)
      missingFeatureIds.push(targetRef.featureId);
    else resolvedTargets.push(target);
  }
  if (missingFeatureIds.length > 0) {
    return {
      affectedFeatureIds: [],
      reason: `Map targets unavailable for highlight: ${missingFeatureIds.join(", ")}`,
      status: "failed",
    };
  }

  try {
    highlightMapTargets(resolvedTargets);
    return {
      affectedFeatureIds: resolvedTargets.map((target) => target.featureId),
      status: "completed",
    };
  } catch (error) {
    return {
      affectedFeatureIds: [],
      reason: `Map highlight failed: ${error instanceof Error ? error.message : "unknown error"}`,
      status: "failed",
    };
  }
}
