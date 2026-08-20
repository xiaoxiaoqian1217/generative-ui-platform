// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MapView from "../../src/features/map/MapView.vue";
import { TEST_DEVICES } from "../../src/features/map/devices.js";
import type { MapTarget } from "../../src/features/map/map-targets.js";

const controller = vi.hoisted(() => ({
  destroy: vi.fn(),
  focusOn: vi.fn(() => ({ center: [116.455, 39.925], zoom: 13.5 })),
  highlight: vi.fn(),
  previewPath: vi.fn(async () => undefined),
  resize: vi.fn(),
  selectDevice: vi.fn(),
  setLayerVisibility: vi.fn(async () => undefined),
}));

vi.mock("../../src/features/map/map-controller.js", () => ({
  createMapController: () => controller,
}));

class ResizeObserverStub {
  disconnect = vi.fn();
  observe = vi.fn();
}

describe("MapView operation application", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  });

  it("does not repeat operations when parent props publish an imperatively applied state", async () => {
    const wrapper = mount(MapView, {
      props: {
        focusedTarget: undefined,
        highlightedTargets: [],
        previewedPath: undefined,
        selectedDevice: undefined,
        visibleLayerIds: [],
      },
    });
    const view = wrapper.vm as unknown as {
      focusOn(target: MapTarget): void;
      highlight(targets: readonly MapTarget[]): void;
      previewPath(target: MapTarget): Promise<void>;
      selectDevice(device: (typeof TEST_DEVICES)[number]): void;
      setLayerVisibility(layerId: string, visible: boolean): Promise<void>;
    };
    const target: MapTarget = {
      coordinates: [116.455, 39.925],
      featureId: "north-corridor",
      highlightable: true,
      layerId: "operational-areas",
      pathPreviewable: false,
      zoom: 12.8,
    };
    const highlightTargets: readonly MapTarget[] = [
      {
        coordinates: [116.463, 39.928],
        featureId: "east-ridge",
        highlightable: true,
        layerId: "operational-points",
        pathPreviewable: false,
        zoom: 14,
      },
    ];
    const pathTarget: MapTarget = {
      coordinates: [116.4515, 39.923],
      featureId: "patrol-path-a",
      highlightable: false,
      layerId: "patrol-routes",
      pathPreviewable: true,
      zoom: 13,
    };
    const device = TEST_DEVICES[0];
    if (device === undefined) throw new Error("test device is missing");

    view.focusOn(target);
    view.highlight(highlightTargets);
    await view.previewPath(pathTarget);
    view.selectDevice(device);
    await view.setLayerVisibility("operational-constraints", true);
    await wrapper.setProps({
      focusedTarget: target,
      highlightedTargets: highlightTargets,
      previewedPath: pathTarget,
      selectedDevice: device,
      visibleLayerIds: ["operational-constraints"],
    });

    expect(controller.focusOn).toHaveBeenCalledTimes(1);
    expect(controller.highlight).toHaveBeenCalledTimes(2);
    expect(controller.highlight).toHaveBeenLastCalledWith(highlightTargets);
    expect(controller.previewPath).toHaveBeenCalledTimes(1);
    expect(controller.selectDevice).toHaveBeenCalledTimes(2);
    expect(controller.selectDevice).toHaveBeenLastCalledWith(device);
    expect(controller.setLayerVisibility).toHaveBeenCalledTimes(1);
  });
});
