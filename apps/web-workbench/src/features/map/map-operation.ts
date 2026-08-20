export interface MapTargetRef {
  readonly featureId: string;
  readonly layerId?: string;
}

export interface MapLayerRef {
  readonly layerId: string;
}

export interface MapOperationResult {
  readonly status: "completed" | "cancelled" | "superseded" | "failed";
  readonly affectedFeatureIds?: string[];
  readonly affectedLayerIds?: string[];
  readonly reason?: string;
}
