import type { Device } from "./devices.js";
import { TEST_DEVICES } from "./devices.js";
import type { MapLayerRef, MapTargetRef } from "./map-operation.js";

export interface MapTarget {
  readonly coordinates: readonly [longitude: number, latitude: number];
  readonly featureId: string;
  readonly highlightable: boolean;
  readonly layerId: string;
  readonly pathPreviewable: boolean;
  readonly zoom: number;
}

export const DEVICE_LAYER_ID = "devices";

export const MAP_PATROL_SCENARIO = {
  constraintsLayer: {
    layerId: "operational-constraints",
  },
  corridor: {
    featureId: "north-corridor",
    layerId: "operational-areas",
  },
  observationTargets: [
    { featureId: "east-ridge", layerId: "operational-points" },
    { featureId: "under-bridge", layerId: "operational-points" },
    { featureId: "checkpoint-b", layerId: "operational-points" },
    {
      featureId: "north-restricted-zone",
      layerId: "operational-constraints",
    },
  ],
  pathA: { featureId: "patrol-path-a", layerId: "patrol-routes" },
  pathB: { featureId: "patrol-path-b", layerId: "patrol-routes" },
} as const satisfies {
  readonly constraintsLayer: MapLayerRef;
  readonly corridor: MapTargetRef;
  readonly observationTargets: readonly MapTargetRef[];
  readonly pathA: MapTargetRef;
  readonly pathB: MapTargetRef;
};

export const MAP_PATROL_OBSERVATION_POINTS = [
  {
    coordinates: [116.463, 39.928] as const,
    label: "东侧高地",
    target: MAP_PATROL_SCENARIO.observationTargets[0],
  },
  {
    coordinates: [116.45, 39.919] as const,
    label: "桥下区域",
    target: MAP_PATROL_SCENARIO.observationTargets[1],
  },
  {
    coordinates: [116.438, 39.924] as const,
    label: "检查点 B",
    target: MAP_PATROL_SCENARIO.observationTargets[2],
  },
] as const;

const NAVIGATION_TARGETS: readonly MapTarget[] = [
  {
    ...MAP_PATROL_SCENARIO.corridor,
    coordinates: [116.452, 39.923],
    highlightable: true,
    pathPreviewable: false,
    zoom: 12.8,
  },
  ...MAP_PATROL_OBSERVATION_POINTS.map((point) => ({
    ...point.target,
    coordinates: point.coordinates,
    highlightable: true,
    pathPreviewable: false,
    zoom: 14,
  })),
  {
    ...MAP_PATROL_SCENARIO.observationTargets[3],
    coordinates: [116.4515, 39.932],
    highlightable: true,
    pathPreviewable: false,
    zoom: 13.5,
  },
  {
    ...MAP_PATROL_SCENARIO.pathA,
    coordinates: [116.4515, 39.923],
    highlightable: false,
    pathPreviewable: true,
    zoom: 13,
  },
  {
    ...MAP_PATROL_SCENARIO.pathB,
    coordinates: [116.4495, 39.92],
    highlightable: false,
    pathPreviewable: true,
    zoom: 13,
  },
];

function deviceMapTarget(device: Device): MapTarget {
  return {
    coordinates: device.coordinates,
    featureId: device.deviceId,
    highlightable: true,
    layerId: DEVICE_LAYER_ID,
    pathPreviewable: false,
    zoom: 14,
  };
}

const MAP_TARGETS: readonly MapTarget[] = [
  ...TEST_DEVICES.map(deviceMapTarget),
  ...NAVIGATION_TARGETS,
];

export function mapTargetRefForDevice(device: Device): MapTargetRef {
  return { featureId: device.deviceId, layerId: DEVICE_LAYER_ID };
}

export function findMapTargetIn(
  targets: readonly MapTarget[],
  target: MapTargetRef,
): MapTarget | undefined {
  const matches = targets.filter(
    (candidate) =>
      candidate.featureId === target.featureId &&
      (target.layerId === undefined || candidate.layerId === target.layerId),
  );
  return matches.length === 1 ? matches[0] : undefined;
}

export function findMapTarget(target: MapTargetRef): MapTarget | undefined {
  return findMapTargetIn(MAP_TARGETS, target);
}

const CONTROLLABLE_LAYER_IDS = new Set<string>([
  MAP_PATROL_SCENARIO.constraintsLayer.layerId,
]);

export function isControllableMapLayer(layer: MapLayerRef): boolean {
  return CONTROLLABLE_LAYER_IDS.has(layer.layerId);
}

interface OperationalFeatureCollection {
  type: "FeatureCollection";
  features: OperationalFeature[];
}

interface OperationalFeature {
  type: "Feature";
  properties: {
    featureId: string;
    layerId: string;
  };
  geometry:
    | { type: "Point"; coordinates: [number, number] }
    | { type: "LineString"; coordinates: [number, number][] }
    | { type: "Polygon"; coordinates: [number, number][][] };
}

export const OPERATIONAL_CONTEXT_GEOJSON: OperationalFeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        featureId: MAP_PATROL_SCENARIO.corridor.featureId,
        layerId: MAP_PATROL_SCENARIO.corridor.layerId,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [116.432, 39.914],
            [116.469, 39.914],
            [116.469, 39.935],
            [116.432, 39.935],
            [116.432, 39.914],
          ],
        ],
      },
    },
    ...MAP_PATROL_OBSERVATION_POINTS.map(
      (point): OperationalFeature => ({
        type: "Feature",
        properties: {
          featureId: point.target.featureId,
          layerId: point.target.layerId,
        },
        geometry: {
          type: "Point",
          coordinates: [...point.coordinates],
        },
      }),
    ),
    {
      type: "Feature",
      properties: {
        featureId: MAP_PATROL_SCENARIO.observationTargets[3].featureId,
        layerId: MAP_PATROL_SCENARIO.constraintsLayer.layerId,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [116.444, 39.929],
            [116.459, 39.929],
            [116.459, 39.936],
            [116.444, 39.936],
            [116.444, 39.929],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        featureId: MAP_PATROL_SCENARIO.pathA.featureId,
        layerId: MAP_PATROL_SCENARIO.pathA.layerId ?? "patrol-routes",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [116.434, 39.916],
          [116.445, 39.923],
          [116.463, 39.928],
          [116.468, 39.918],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        featureId: MAP_PATROL_SCENARIO.pathB.featureId,
        layerId: MAP_PATROL_SCENARIO.pathB.layerId ?? "patrol-routes",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [116.434, 39.916],
          [116.45, 39.919],
          [116.438, 39.924],
          [116.466, 39.916],
        ],
      },
    },
  ],
};
