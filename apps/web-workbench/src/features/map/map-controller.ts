import type { Marker } from "maplibre-gl";
import * as maplibregl from "maplibre-gl";
import type { Device } from "./devices.js";
import {
  DEVICE_LAYER_ID,
  MAP_PATROL_OBSERVATION_POINTS,
  type MapTarget,
  OPERATIONAL_CONTEXT_GEOJSON,
} from "./map-targets.js";

const OPERATIONAL_SOURCE_ID = "operational-context";
const FEATURE_HIGHLIGHT_FILL_LAYER_ID = "map-feature-highlight-fill";
const FEATURE_HIGHLIGHT_POINT_LAYER_ID = "map-feature-highlight-point";
const PATH_PREVIEW_LAYER_ID = "patrol-path-preview";
const CONSULT_CANDIDATES_LAYER_ID = "patrol-route-candidates";
const CONSULT_CANDIDATES_HIT_LAYER_ID = "patrol-route-candidates-hit";

/**
 * One candidate route shown during the patrol-route consultation. Colors and
 * letters are assigned by option order, not by business meaning.
 */
export interface ConsultRouteCandidate {
  readonly color: string;
  readonly featureId: string;
  readonly letter: string;
}

export interface ConsultRouteCandidateHandlers {
  readonly onHover: (featureId: string | undefined) => void;
  readonly onClick: (
    featureId: string,
    point: { readonly x: number; readonly y: number },
    position: { readonly lng: number; readonly lat: number },
  ) => void;
}

/**
 * A map click can pick a consultation revision anchor. The handler receives
 * the lng/lat, the screen point for popup anchoring, and the candidate
 * featureId when the click landed on a route.
 */
export interface ConsultRevisionHandlers {
  readonly onPick: (
    position: { readonly lng: number; readonly lat: number },
    point: { readonly x: number; readonly y: number },
    featureId: string | undefined,
  ) => void;
}

export interface MapController {
  clearPreviewPath(): Promise<void>;
  destroy(): void;
  emphasizeConsultRouteCandidate(featureId: string | undefined): void;
  focusOn(target: MapTarget): MapViewportState;
  hideConsultRouteCandidates(): Promise<void>;
  highlight(targets: readonly MapTarget[]): void;
  previewPath(target: MapTarget): Promise<void>;
  resize(): void;
  selectDevice(device: Device | undefined): void;
  setConsultRevisionAnchor(
    position: { readonly lng: number; readonly lat: number } | undefined,
  ): void;
  setConsultRevisionHandlers(
    handlers: ConsultRevisionHandlers | undefined,
  ): void;
  setConsultRouteCandidateHandlers(
    handlers: ConsultRouteCandidateHandlers | undefined,
  ): void;
  setLayerVisibility(layerId: string, visible: boolean): Promise<void>;
  showConsultRouteCandidates(
    candidates: readonly ConsultRouteCandidate[],
  ): Promise<void>;
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
      layout: { visibility: "none" },
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
      layout: { visibility: "none" },
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
    {
      id: CONSULT_CANDIDATES_LAYER_ID,
      type: "line",
      source: OPERATIONAL_SOURCE_ID,
      filter: ["==", ["get", "featureId"], ""],
      layout: {
        "line-cap": "round",
        "line-join": "round",
        visibility: "none",
      },
      paint: {
        "line-color": "#3451d1",
        "line-opacity": 0.7,
        "line-width": 4.5,
      },
    },
    {
      id: CONSULT_CANDIDATES_HIT_LAYER_ID,
      type: "line",
      source: OPERATIONAL_SOURCE_ID,
      filter: ["==", ["get", "featureId"], ""],
      layout: {
        "line-cap": "round",
        "line-join": "round",
        visibility: "none",
      },
      paint: {
        "line-color": "#3451d1",
        "line-opacity": 0,
        "line-width": 18,
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
  marker.hidden = true;
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

  // Candidate routes are shown together during the patrol-route consultation,
  // with hover emphasis, letter badges and optional click handling.
  const consultCandidateMarkers: Marker[] = [];
  let consultCandidates: readonly ConsultRouteCandidate[] = [];
  let consultEmphasizedFeatureId: string | undefined;
  let consultCandidateHandlers: ConsultRouteCandidateHandlers | undefined;
  let consultCandidateEventsBound = false;

  function consultBadgePosition(
    featureId: string,
  ): [number, number] | undefined {
    const feature = OPERATIONAL_CONTEXT_GEOJSON.features.find(
      (candidate) =>
        candidate.properties.featureId === featureId &&
        candidate.geometry.type === "LineString",
    );
    if (feature?.geometry.type !== "LineString") return undefined;
    const coordinates = feature.geometry.coordinates;
    let total = 0;
    const segments: number[] = [];
    for (let index = 1; index < coordinates.length; index += 1) {
      const from = coordinates[index - 1];
      const to = coordinates[index];
      if (from === undefined || to === undefined) continue;
      const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
      segments.push(length);
      total += length;
    }
    let remaining = total * 0.55;
    for (let index = 0; index < segments.length; index += 1) {
      const length = segments[index] ?? 0;
      const from = coordinates[index];
      const to = coordinates[index + 1];
      if (from === undefined || to === undefined) continue;
      if (remaining <= length) {
        const ratio = length === 0 ? 0 : remaining / length;
        return [from[0] + (to[0] - from[0]) * ratio, from[1] + (to[1] - from[1]) * ratio];
      }
      remaining -= length;
    }
    const last = coordinates[coordinates.length - 1];
    return last === undefined ? undefined : [last[0], last[1]];
  }

  function applyConsultCandidatePaint(): void {
    if (map.getLayer(CONSULT_CANDIDATES_LAYER_ID) === undefined) return;
    const colorExpression = [
      "match",
      ["get", "featureId"],
      ...consultCandidates.flatMap((candidate) => [
        candidate.featureId,
        candidate.color,
      ]),
      "#3451d1",
    ] as unknown as maplibregl.ExpressionSpecification;
    const emphasized = consultEmphasizedFeatureId;
    const widthExpression = (
      emphasized === undefined
        ? 4.5
        : ["match", ["get", "featureId"], emphasized, 7, 4]
    ) as unknown as maplibregl.ExpressionSpecification;
    const opacityExpression = (
      emphasized === undefined
        ? 0.7
        : ["match", ["get", "featureId"], emphasized, 0.95, 0.22]
    ) as unknown as maplibregl.ExpressionSpecification;
    map.setPaintProperty(
      CONSULT_CANDIDATES_LAYER_ID,
      "line-color",
      colorExpression,
    );
    map.setPaintProperty(
      CONSULT_CANDIDATES_LAYER_ID,
      "line-width",
      widthExpression,
    );
    map.setPaintProperty(
      CONSULT_CANDIDATES_LAYER_ID,
      "line-opacity",
      opacityExpression,
    );
  }

  function bindConsultCandidateEvents(): void {
    if (consultCandidateEventsBound) return;
    consultCandidateEventsBound = true;
    map.on("mousemove", CONSULT_CANDIDATES_HIT_LAYER_ID, (event) => {
      const featureId = event.features?.[0]?.properties?.featureId as
        | string
        | undefined;
      map.getCanvas().style.cursor =
        consultCandidateHandlers === undefined || featureId === undefined
          ? ""
          : "pointer";
      consultCandidateHandlers?.onHover(featureId);
    });
    map.on("mouseleave", CONSULT_CANDIDATES_HIT_LAYER_ID, () => {
      map.getCanvas().style.cursor = "";
      consultCandidateHandlers?.onHover(undefined);
    });
    map.on("click", CONSULT_CANDIDATES_HIT_LAYER_ID, (event) => {
      const featureId = event.features?.[0]?.properties?.featureId as
        | string
        | undefined;
      if (featureId === undefined) return;
      consultCandidateHandlers?.onClick(
        featureId,
        { x: event.point.x, y: event.point.y },
        { lat: event.lngLat.lat, lng: event.lngLat.lng },
      );
    });
  }

  function createConsultBadgeElement(
    candidate: ConsultRouteCandidate,
  ): HTMLElement {
    const badge = document.createElement("div");
    badge.className = "consult-route-badge";
    badge.dataset.testid = `consult-route-badge-${candidate.featureId}`;
    badge.style.background = candidate.color;
    badge.textContent = candidate.letter;
    return badge;
  }

  /**
   * PROTOTYPE: showing candidates frames the decision, like Felt's
   * selectFeature({ fitViewport }): fit the viewport to the candidate
   * geometries so both routes are clearly visible when the consult starts,
   * regardless of where the previous map operation left the camera.
   */
  function fitConsultCandidates(
    candidates: readonly ConsultRouteCandidate[],
  ): void {
    const bounds = new maplibregl.LngLatBounds();
    for (const candidate of candidates) {
      const feature = OPERATIONAL_CONTEXT_GEOJSON.features.find(
        (item) =>
          item.properties.featureId === candidate.featureId &&
          item.geometry.type === "LineString",
      );
      if (feature?.geometry.type !== "LineString") continue;
      for (const coordinate of feature.geometry.coordinates) {
        bounds.extend([coordinate[0], coordinate[1]]);
      }
    }
    if (bounds.isEmpty()) return;
    map.fitBounds(bounds, { duration: 500, maxZoom: 14, padding: 90 });
  }

  // A single user-owned revision marker plus a general click handler that
  // picks anchor positions, attaching the candidate featureId when the click
  // landed on a route.
  let consultRevisionAnchorMarker: Marker | undefined;
  let consultRevisionHandlers: ConsultRevisionHandlers | undefined;

  function createRevisionAnchorElement(): HTMLElement {
    const pin = document.createElement("div");
    pin.className = "consult-revision-pin";
    pin.dataset.testid = "consult-revision-pin";
    return pin;
  }

  map.on("click", (event) => {
    if (consultRevisionHandlers === undefined) return;
    let featureId: string | undefined;
    if (map.getLayer(CONSULT_CANDIDATES_HIT_LAYER_ID) !== undefined) {
      const features = map.queryRenderedFeatures(event.point, {
        layers: [CONSULT_CANDIDATES_HIT_LAYER_ID],
      });
      const candidate = features[0]?.properties?.featureId;
      featureId = typeof candidate === "string" ? candidate : undefined;
    }
    consultRevisionHandlers.onPick(
      { lat: event.lngLat.lat, lng: event.lngLat.lng },
      { x: event.point.x, y: event.point.y },
      featureId,
    );
  });

  return {
    async clearPreviewPath() {
      await styleReady;
      if (map.getLayer(PATH_PREVIEW_LAYER_ID) === undefined)
        throw new Error("Path preview layer is unavailable.");
      map.setFilter(PATH_PREVIEW_LAYER_ID, featureIdFilter([]));
      map.setLayoutProperty(PATH_PREVIEW_LAYER_ID, "visibility", "none");
    },
    destroy() {
      map.remove();
    },
    emphasizeConsultRouteCandidate(featureId) {
      consultEmphasizedFeatureId = featureId;
      applyConsultCandidatePaint();
    },
    focusOn(target) {
      return applyMapFocus(map, target);
    },
    async hideConsultRouteCandidates() {
      await styleReady;
      consultCandidates = [];
      consultEmphasizedFeatureId = undefined;
      if (map.getLayer(CONSULT_CANDIDATES_LAYER_ID) === undefined) return;
      map.setFilter(CONSULT_CANDIDATES_LAYER_ID, featureIdFilter([]));
      map.setFilter(CONSULT_CANDIDATES_HIT_LAYER_ID, featureIdFilter([]));
      map.setLayoutProperty(CONSULT_CANDIDATES_LAYER_ID, "visibility", "none");
      map.setLayoutProperty(
        CONSULT_CANDIDATES_HIT_LAYER_ID,
        "visibility",
        "none",
      );
      for (const marker of consultCandidateMarkers) marker.remove();
      consultCandidateMarkers.length = 0;
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
        const element = marker.getElement();
        const isHighlighted = highlightedFeatureIds.has(featureId);
        element.dataset.highlighted = String(isHighlighted);
        element.hidden = !isHighlighted;
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
    setConsultRevisionAnchor(position) {
      consultRevisionAnchorMarker?.remove();
      consultRevisionAnchorMarker = undefined;
      if (position === undefined) return;
      consultRevisionAnchorMarker = new maplibregl.Marker({
        element: createRevisionAnchorElement(),
      })
        .setLngLat([position.lng, position.lat])
        .addTo(map);
    },
    setConsultRevisionHandlers(handlers) {
      consultRevisionHandlers = handlers;
      map.getCanvas().style.cursor = handlers === undefined ? "" : "crosshair";
    },
    setConsultRouteCandidateHandlers(handlers) {
      consultCandidateHandlers = handlers;
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
    async showConsultRouteCandidates(candidates) {
      await styleReady;
      if (
        map.getLayer(CONSULT_CANDIDATES_LAYER_ID) === undefined ||
        map.getLayer(CONSULT_CANDIDATES_HIT_LAYER_ID) === undefined
      )
        throw new Error("Consult candidate layers are unavailable.");
      consultCandidates = candidates;
      consultEmphasizedFeatureId = undefined;
      const filter = featureIdFilter(
        candidates.map((candidate) => candidate.featureId),
      );
      map.setFilter(CONSULT_CANDIDATES_LAYER_ID, filter);
      map.setFilter(CONSULT_CANDIDATES_HIT_LAYER_ID, filter);
      applyConsultCandidatePaint();
      map.setLayoutProperty(
        CONSULT_CANDIDATES_LAYER_ID,
        "visibility",
        "visible",
      );
      map.setLayoutProperty(
        CONSULT_CANDIDATES_HIT_LAYER_ID,
        "visibility",
        "visible",
      );
      for (const marker of consultCandidateMarkers) marker.remove();
      consultCandidateMarkers.length = 0;
      for (const candidate of candidates) {
        const position = consultBadgePosition(candidate.featureId);
        if (position === undefined) continue;
        const marker = new maplibregl.Marker({
          element: createConsultBadgeElement(candidate),
        })
          .setLngLat(position)
          .addTo(map);
        consultCandidateMarkers.push(marker);
      }
      bindConsultCandidateEvents();
      fitConsultCandidates(candidates);
    },
  };
}
