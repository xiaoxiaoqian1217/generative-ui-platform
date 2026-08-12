import type { Marker } from "maplibre-gl";
import * as maplibregl from "maplibre-gl";
import type { Device } from "./devices.js";

export interface MapController {
  destroy(): void;
  resize(): void;
  selectDevice(device: Device | undefined): void;
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
  },
  layers: [
    {
      id: "open-street-map",
      type: "raster",
      source: "openStreetMap",
    },
  ],
};

function createMarkerElement(device: Device): HTMLElement {
  const marker = document.createElement("button");
  marker.type = "button";
  marker.className = "device-marker";
  marker.dataset.testid = `device-marker-${device.deviceId}`;
  marker.dataset.selected = "false";
  marker.setAttribute("aria-label", device.name);
  marker.innerHTML = '<span aria-hidden="true">✦</span>';
  return marker;
}

function mutableCoordinates(
  coordinates: Device["coordinates"],
): [longitude: number, latitude: number] {
  return [coordinates[0], coordinates[1]];
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

  const markers = new Map<string, Marker>();
  for (const device of devices) {
    const element = createMarkerElement(device);
    const marker = new maplibregl.Marker({ element })
      .setLngLat(mutableCoordinates(device.coordinates))
      .addTo(map);
    markers.set(device.deviceId, marker);
  }

  return {
    destroy() {
      map.remove();
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
      if (device !== undefined) {
        map.flyTo({
          center: mutableCoordinates(device.coordinates),
          zoom: 14,
          essential: true,
        });
      }
    },
  };
}
