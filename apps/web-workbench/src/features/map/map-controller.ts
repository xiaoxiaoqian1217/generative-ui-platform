import maplibregl, { type StyleSpecification } from "maplibre-gl";
import type { Device } from "./devices.js";

export interface MapController {
  destroy(): void;
  locateDevice(device: Device): void;
}

export interface CreateMapControllerOptions {
  readonly container: HTMLElement;
  readonly devices: readonly Device[];
}

const localMapStyle: StyleSpecification = {
  version: 8,
  sources: {
    districts: {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [121.456, 31.218],
                  [121.491, 31.218],
                  [121.491, 31.243],
                  [121.456, 31.243],
                  [121.456, 31.218],
                ],
              ],
            },
          },
        ],
      },
    },
    river: {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [121.484, 31.214],
              [121.493, 31.214],
              [121.49, 31.247],
              [121.482, 31.247],
              [121.484, 31.214],
            ],
          ],
        },
      },
    },
    routes: {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { kind: "primary" },
            geometry: {
              type: "LineString",
              coordinates: [
                [121.458, 31.225],
                [121.468, 31.231],
                [121.479, 31.235],
                [121.488, 31.238],
              ],
            },
          },
          {
            type: "Feature",
            properties: { kind: "secondary" },
            geometry: {
              type: "LineString",
              coordinates: [
                [121.463, 31.242],
                [121.47, 31.233],
                [121.474, 31.22],
              ],
            },
          },
        ],
      },
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#e5ebe3" },
    },
    {
      id: "districts",
      type: "fill",
      source: "districts",
      paint: {
        "fill-color": "#f3f5ef",
        "fill-outline-color": "#b7c2b8",
      },
    },
    {
      id: "river",
      type: "fill",
      source: "river",
      paint: { "fill-color": "#bfd5d2", "fill-opacity": 0.86 },
    },
    {
      id: "route-secondary",
      type: "line",
      source: "routes",
      filter: ["==", ["get", "kind"], "secondary"],
      paint: { "line-color": "#aeb9b0", "line-width": 4 },
    },
    {
      id: "route-primary-casing",
      type: "line",
      source: "routes",
      filter: ["==", ["get", "kind"], "primary"],
      paint: { "line-color": "#ffffff", "line-width": 8 },
    },
    {
      id: "route-primary",
      type: "line",
      source: "routes",
      filter: ["==", ["get", "kind"], "primary"],
      paint: { "line-color": "#d89a65", "line-width": 4 },
    },
  ],
};

function markerElement(device: Device): HTMLElement {
  const marker = document.createElement("div");
  marker.className = "device-marker";
  marker.dataset.highlighted = "false";
  marker.dataset.testid = `device-marker-${device.id}`;
  marker.setAttribute("aria-label", `${device.name} marker`);
  const pulse = document.createElement("span");
  pulse.setAttribute("aria-hidden", "true");
  const label = document.createElement("strong");
  label.textContent = device.id;
  marker.append(pulse, label);
  return marker;
}

export function createMapController(
  options: CreateMapControllerOptions,
): MapController {
  const map = new maplibregl.Map({
    center: [121.4737, 31.2304],
    container: options.container,
    pitch: 20,
    style: localMapStyle,
    zoom: 12.4,
  });
  map.addControl(
    new maplibregl.NavigationControl({ showCompass: false }),
    "top-right",
  );

  const markers = new Map(
    options.devices.map((device) => {
      const element = markerElement(device);
      const marker = new maplibregl.Marker({ element })
        .setLngLat([device.coordinates[0], device.coordinates[1]])
        .addTo(map);
      return [device.id, { element, marker }] as const;
    }),
  );

  return {
    destroy() {
      for (const { marker } of markers.values()) marker.remove();
      map.remove();
    },
    locateDevice(device) {
      for (const [deviceId, { element }] of markers) {
        const highlighted = deviceId === device.id;
        element.classList.toggle("is-highlighted", highlighted);
        element.dataset.highlighted = String(highlighted);
      }
      map.flyTo({
        center: [device.coordinates[0], device.coordinates[1]],
        duration: 700,
        essential: true,
        pitch: 35,
        zoom: 15,
      });
    },
  };
}
