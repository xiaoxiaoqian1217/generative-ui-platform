import { describe, expect, it, vi } from "vitest";
import { applyMapFocus } from "../../src/features/map/map-controller.js";
import type { MapTarget } from "../../src/features/map/map-targets.js";

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
