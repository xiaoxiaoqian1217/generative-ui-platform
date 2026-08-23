// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { TEST_DEVICES } from "../../src/features/map/devices.js";
import {
  applyMapFocus,
  createMapController,
} from "../../src/features/map/map-controller.js";
import {
  findMapTarget,
  MAP_PATROL_SCENARIO,
  type MapTarget,
} from "../../src/features/map/map-targets.js";

const maplibreMock = vi.hoisted(() => ({
  mapOptions: [] as Array<{
    style: {
      layers: Array<{
        id: string;
        layout?: { visibility?: string };
      }>;
    };
  }>,
  markerElements: [] as HTMLElement[],
}));

vi.mock("maplibre-gl", () => ({
  Map: class {
    constructor(options: (typeof maplibreMock.mapOptions)[number]) {
      maplibreMock.mapOptions.push(options);
    }

    addControl() {}

    getLayer() {
      return {};
    }

    on() {}

    remove() {}

    setFilter() {}

    setLayoutProperty() {}
  },
  Marker: class {
    readonly element: HTMLElement;

    constructor(options: { element: HTMLElement }) {
      this.element = options.element;
      maplibreMock.markerElements.push(options.element);
    }

    addTo() {
      return this;
    }

    getElement() {
      return this.element;
    }

    setLngLat() {
      return this;
    }
  },
  NavigationControl: class {},
}));

beforeEach(() => {
  maplibreMock.mapOptions.length = 0;
  maplibreMock.markerElements.length = 0;
});

describe("map controller focus", () => {
  it("returns the viewport actually applied by the MapLibre camera", () => {
    const target: MapTarget = {
      coordinates: [116.455, 39.925],
      featureId: "north-corridor",
      highlightable: true,
      layerId: "operational-areas",
      pathPreviewable: false,
      zoom: 12.8,
    };
    const jumpTo = vi.fn();
    const camera = {
      getCenter: () => ({ lat: 39.925, lng: 116.455 }),
      getZoom: () => 12.8,
      jumpTo,
    };

    expect(applyMapFocus(camera, target)).toEqual({
      center: [116.455, 39.925],
      zoom: 12.8,
    });
    expect(jumpTo).toHaveBeenCalledWith({
      center: [116.455, 39.925],
      zoom: 12.8,
    });
  });
});

describe("map controller initial presentation", () => {
  it("keeps patrol context hidden until the Agent highlights it", () => {
    const controller = createMapController(
      document.createElement("div"),
      TEST_DEVICES,
    );
    const style = maplibreMock.mapOptions[0]?.style;
    const observationMarker = (featureId: string) =>
      maplibreMock.markerElements.find(
        (element) => element.dataset.testid === `map-feature-${featureId}`,
      );

    expect(style).toBeDefined();
    for (const layerId of ["operational-areas", "operational-points"])
      expect(
        style?.layers.find((layer) => layer.id === layerId)?.layout,
      ).toEqual({ visibility: "none" });
    for (const featureId of ["east-ridge", "under-bridge", "checkpoint-b"])
      expect(observationMarker(featureId)?.hidden).toBe(true);

    const eastRidge = findMapTarget(MAP_PATROL_SCENARIO.observationTargets[0]);
    if (eastRidge === undefined)
      throw new Error("east ridge target is missing");
    controller.highlight([eastRidge]);

    expect(observationMarker("east-ridge")?.hidden).toBe(false);
    expect(observationMarker("under-bridge")?.hidden).toBe(true);
    expect(observationMarker("checkpoint-b")?.hidden).toBe(true);

    controller.highlight([]);
    expect(observationMarker("east-ridge")?.hidden).toBe(true);
  });
});
