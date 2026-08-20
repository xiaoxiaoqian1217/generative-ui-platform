import type { MapLayerRef, MapOperationResult } from "../map/map-operation.js";
import { isControllableMapLayer } from "../map/map-targets.js";

export interface SetLayerVisibilityInput {
  readonly layer: MapLayerRef;
  readonly visible: boolean;
}

export type SetMapLayerVisibility = (
  layerId: string,
  visible: boolean,
) => Promise<void> | void;

export async function setLayerVisibility(
  input: SetLayerVisibilityInput,
  setMapLayerVisibility: SetMapLayerVisibility,
): Promise<MapOperationResult> {
  if (!isControllableMapLayer(input.layer)) {
    return {
      affectedLayerIds: [],
      reason: `Map layer is unavailable for visibility control: ${input.layer.layerId}`,
      status: "failed",
    };
  }

  try {
    await setMapLayerVisibility(input.layer.layerId, input.visible);
    return {
      affectedLayerIds: [input.layer.layerId],
      status: "completed",
    };
  } catch (error) {
    return {
      affectedLayerIds: [],
      reason: `Map layer visibility failed: ${error instanceof Error ? error.message : "unknown error"}`,
      status: "failed",
    };
  }
}
