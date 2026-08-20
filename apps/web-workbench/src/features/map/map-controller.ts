import type { Marker } from "maplibre-gl";
import * as maplibregl from "maplibre-gl";
import type { Device } from "./devices.js";
import {
  DEVICE_LAYER_ID,
  MAP_PATROL_OBSERVATION_POINTS,
  OPERATIONAL_CONTEXT_GEOJSON,
  type MapTarget,
} from "./map-targets.js";

const OPERATIONAL_SOURCE_ID = "operational-context";
const FEATURE_HIGHLIGHT_FILL_LAYER_ID = "map-feature-highlight-fill";
const FEATURE_HIGHLIGHT_POINT_LAYER_ID = "map-feature-highlight-point";
const PATH_PREVIEW_LAYER_ID = "patrol-path-preview";

export interface MapController {
  destroy(): void;
  focusOn(target: MapTarget): MapViewportState;
  highlight(targets: readonly MapTarget[]): void;
  previewPath(target: MapTarget): Promise<void>;
  resize(): void;
  selectDevice(device: Device | undefined): void;
  setLayerVisibility(layerId: string, visible: boolean): Promise<void>;
}

export interface MapViewportState {
  readonly center: readonly [longitude: number, latitude: number];
  readonly zoom: number;
}

interface MapCamera {
  getCenter(): { readonly lat: number; readonly lng: number };
  getZoom(): number;
  jumpTo(options: {
    readonly center: [longitude: number, latitude: number];
    readonly zoom: number;
  }): unknown;
}

const OPEN_STREET_MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    openStreetMap: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
    [OPERATIONAL_SOURCE_ID]: {
      type: "geojson",
      data: OPERATIONAL_CONTEXT_GEOJSON,
    },
  },
  layers: [
    {
      id: "open-street-map",
      type: "raster",
      source: "openStreetMap",
    },
    {
      id: "operational-areas",
      type: "fill",
      source: OPERATIONAL_SOURCE_ID,
      filter: ["==", ["get", "layerId"], "operational-areas"],
      paint: {
        "fill-color": "#28678b",
        "fill-opacity": 0.12,
        "fill-outline-color": "#28678b",
      },
    },
    {
      id: "operational-constraints",
      type: "fill",
      source: OPERATIONAL_SOURCE_ID,
      filter: ["==", ["get", "layerId"], "operational-constraints"],
      layout: { visibility: "none" },
      paint: {
        "fill-color": "#bb3e32",
        "fill-opacity": 0.26,
        "fill-outline-color": "#8f2922",
      },
    },
    {
      id: "operational-points",
      type: "circle",
      source: OPERATIONAL_SOURCE_ID,
      filter: ["==", ["get", "layerId"], "operational-points"],
      paint: {
        "circle-color": "#f2c14e",
        "circle-radius": 7,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
      },
    },
    {
      id: FEATURE_HIGHLIGHT_FILL_LAYER_ID,
      type: "line",
      source: OPERATIONAL_SOURCE_ID,
      filter: [
        "all",
        ["==", ["geometry-type"], "Polygon"],
        ["==", ["get", "featureId"], ""],
      ],
      paint: {
        "line-color": "#f08a24",
        "line-opacity": 0.95,
        "line-width": 5,
      },
    },
    {
      id: FEATURE_HIGHLIGHT_POINT_LAYER_ID,
      type: "circle",
      source: OPERATIONAL_SOURCE_ID,
      filter: [
        "all",
        ["==", ["geometry-type"], "Point"],
        ["==", ["get", "featureId"], ""],
      ],
      paint: {
        "circle-color": "#f08a24",
        "circle-opacity": 0.45,
        "circle-radius": 15,
        "circle-stroke-color": "#f08a24",
        "circle-stroke-width": 3,
      },
    },
    {
      id: PATH_PREVIEW_LAYER_ID,
      type: "line",
      source: OPERATIONAL_SOURCE_ID,
      filter: ["==", ["get", "featureId"], ""],
      layout: {
        "line-cap": "round",
        "line-join": "round",
        visibility: "none",
      },
      paint: {
        "line-color": "#7c4dff",
        "line-opacity": 0.92,
        "line-width": 6,
      },
    },
  ],
};

function featureIdFilter(
  featureIds: readonly string[],
): maplibregl.FilterSpecification {
  return ["in", ["get", "featureId"], ["literal", [...featureIds]]];
}

function createMarkerElement(device: Device): HTMLElement {
  const marker = document.createElement("button");
  marker.type = "button";
  marker.className = "device-marker";
  marker.dataset.testid = `device-marker-${device.deviceId}`;
  marker.dataset.highlighted = "false";
  marker.dataset.selected = "false";
  marker.setAttribute("aria-label", device.name);
  marker.innerHTML = '<span aria-hidden="true">✦</span>';
  return marker;
}

function createObservationMarkerElement(
  featureId: string,
  label: string,
): HTMLElement {
  const marker = document.createElement("button");
  marker.type = "button";
  marker.className = "map-observation-marker";
  marker.dataset.testid = `map-feature-${featureId}`;
  marker.dataset.highlighted = "false";
  marker.setAttribute("aria-label", label);
  const dot = document.createElement("span");
  dot.setAttribute("aria-hidden", "true");
  const text = document.createElement("strong");
  text.textContent = label;
  marker.append(dot, text);
  return marker;
}

function mutableCoordinates(
  coordinates: Device["coordinates"],
): [longitude: number, latitude: number] {
  return [coordinates[0], coordinates[1]];
}

export function applyMapFocus(
  map: MapCamera,
  target: MapTarget,
): MapViewportState {
  map.jumpTo({
    center: mutableCoordinates(target.coordinates),
    zoom: target.zoom,
  });
  const center = map.getCenter();
  return {
    center: [center.lng, center.lat],
    zoom: map.getZoom(),
  };
}

export function createMapController(
  container: HTMLElement,
  devices: readonly Device[],
): MapController {
  const initialCoordinates = devices[0]?.coordinates ?? [116.3974, 39.9093];
  const map = new maplibregl.Map({
    center: mutableCoordinates(initialCoordinates),
    container,
    style: OPEN_STREET_MAP_STYLE,
    zoom: 11,
  });
  map.addControl(
    new maplibregl.NavigationControl({ showCompass: false }),
    "top-right",
  );

  const styleReady =
    map.getLayer("operational-constraints") !== undefined
      ? Promise.resolve()
      : new Promise<void>((resolve) => map.once("styledata", () => resolve()));

  const markers = new Map<string, Marker>();
  for (const device of devices) {
    const element = createMarkerElement(device);
    const marker = new maplibregl.Marker({ element })
      .setLngLat(mutableCoordinates(device.coordinates))
      .addTo(map);
    markers.set(device.deviceId, marker);
  }
  const observationMarkers = new Map<string, Marker>();
  for (const point of MAP_PATROL_OBSERVATION_POINTS) {
    const element = createObservationMarkerElement(
      point.target.featureId,
      point.label,
    );
    const marker = new maplibregl.Marker({ element })
      .setLngLat(mutableCoordinates(point.coordinates))
      .addTo(map);
    observationMarkers.set(point.target.featureId, marker);
  }

  return {
    destroy() {
      map.remove();
    },
    focusOn(target) {
      return applyMapFocus(map, target);
    },
    highlight(targets) {
      const highlightedFeatureIds = new Set(
        targets.map((target) => target.featureId),
      );
      for (const [featureId, marker] of markers) {
        marker.getElement().dataset.highlighted = String(
          highlightedFeatureIds.has(featureId),
        );
      }
      for (const [featureId, marker] of observationMarkers) {
        marker.getElement().dataset.highlighted = String(
          highlightedFeatureIds.has(featureId),
        );
      }

      const operationalFeatureIds = targets
        .filter((target) => target.layerId !== DEVICE_LAYER_ID)
        .map((target) => target.featureId);
      const highlightLayersAvailable =
        map.getLayer(FEATURE_HIGHLIGHT_FILL_LAYER_ID) !== undefined &&
        map.getLayer(FEATURE_HIGHLIGHT_POINT_LAYER_ID) !== undefined;
      if (operationalFeatureIds.length === 0 && !highlightLayersAvailable)
        return;
      if (!highlightLayersAvailable)
        throw new Error("Map feature highlight layers are unavailable.");
      const filter = featureIdFilter(operationalFeatureIds);
      map.setFilter(FEATURE_HIGHLIGHT_FILL_LAYER_ID, filter);
      map.setFilter(FEATURE_HIGHLIGHT_POINT_LAYER_ID, filter);
    },
    async previewPath(target) {
      await styleReady;
      if (map.getLayer(PATH_PREVIEW_LAYER_ID) === undefined)
        throw new Error("Path preview layer is unavailable.");
      map.setFilter(PATH_PREVIEW_LAYER_ID, featureIdFilter([target.featureId]));
      map.setLayoutProperty(PATH_PREVIEW_LAYER_ID, "visibility", "visible");
    },
    resize() {
      map.resize();
    },
    selectDevice(device) {
      for (const [deviceId, marker] of markers) {
        marker.getElement().dataset.selected = String(
          deviceId === device?.deviceId,
        );
      }
    },
    async setLayerVisibility(layerId, visible) {
      await styleReady;
      if (map.getLayer(layerId) === undefined)
        throw new Error(`Map layer not found: ${layerId}`);
      map.setLayoutProperty(
        layerId,
        "visibility",
        visible ? "visible" : "none",
      );
    },
  };
}
