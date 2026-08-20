import { describe, expect, it, vi } from "vitest";
import { focusOn } from "../../src/features/frontend-tools/focus-on.js";
import { highlight } from "../../src/features/frontend-tools/highlight.js";
import { previewPath } from "../../src/features/frontend-tools/preview-path.js";
import { setLayerVisibility } from "../../src/features/frontend-tools/set-layer-visibility.js";
import {
  findMapTargetIn,
  type MapTarget,
} from "../../src/features/map/map-targets.js";

describe("map operation Frontend Tools", () => {
  it("focuses a feature through a business-independent MapTargetRef", () => {
    const focusMapTarget = vi.fn();

    const result = focusOn({ target: { featureId: "01" } }, focusMapTarget);

    expect(focusMapTarget).toHaveBeenCalledWith(
      expect.objectContaining({
        featureId: "01",
        layerId: "devices",
      }),
    );
    expect(result).toEqual({
      affectedFeatureIds: ["01"],
      status: "completed",
    });
  });

  it("fails focus without changing the viewport when the layer does not match", () => {
    const focusMapTarget = vi.fn();

    const result = focusOn(
      { target: { featureId: "01", layerId: "unknown-layer" } },
      focusMapTarget,
    );

    expect(focusMapTarget).not.toHaveBeenCalled();
    expect(result).toEqual({
      affectedFeatureIds: [],
      reason: "Map target not found: 01",
      status: "failed",
    });
  });

  it("highlights multiple feature references atomically and preserves order", () => {
    const highlightMapTargets = vi.fn();

    const result = highlight(
      {
        targets: [
          { featureId: "east-ridge", layerId: "operational-points" },
          { featureId: "under-bridge", layerId: "operational-points" },
          { featureId: "checkpoint-b", layerId: "operational-points" },
        ],
      },
      highlightMapTargets,
    );

    expect(highlightMapTargets).toHaveBeenCalledOnce();
    expect(
      highlightMapTargets.mock.calls[0]?.[0].map(
        (target: { featureId: string }) => target.featureId,
      ),
    ).toEqual(["east-ridge", "under-bridge", "checkpoint-b"]);
    expect(result).toEqual({
      affectedFeatureIds: ["east-ridge", "under-bridge", "checkpoint-b"],
      status: "completed",
    });
  });

  it("does not partially highlight when any target cannot be resolved", () => {
    const highlightMapTargets = vi.fn();

    const result = highlight(
      {
        targets: [{ featureId: "east-ridge" }, { featureId: "missing" }],
      },
      highlightMapTargets,
    );

    expect(highlightMapTargets).not.toHaveBeenCalled();
    expect(result).toEqual({
      affectedFeatureIds: [],
      reason: "Map targets unavailable for highlight: missing",
      status: "failed",
    });
  });

  it("does not report success for a target without a visible highlight", () => {
    const highlightMapTargets = vi.fn();

    const result = highlight(
      { targets: [{ featureId: "patrol-path-a" }] },
      highlightMapTargets,
    );

    expect(highlightMapTargets).not.toHaveBeenCalled();
    expect(result).toEqual({
      affectedFeatureIds: [],
      reason: "Map targets unavailable for highlight: patrol-path-a",
      status: "failed",
    });
  });

  it("rejects an unqualified feature reference that is ambiguous across layers", () => {
    const duplicateTargets: readonly MapTarget[] = [
      {
        coordinates: [116.4, 39.9],
        featureId: "shared-id",
        highlightable: true,
        layerId: "devices",
        pathPreviewable: false,
        zoom: 12,
      },
      {
        coordinates: [116.5, 39.9],
        featureId: "shared-id",
        highlightable: false,
        layerId: "operational-areas",
        pathPreviewable: false,
        zoom: 11,
      },
    ];

    expect(findMapTargetIn(duplicateTargets, { featureId: "shared-id" })).toBe(
      undefined,
    );
    expect(
      findMapTargetIn(duplicateTargets, {
        featureId: "shared-id",
        layerId: "devices",
      }),
    ).toEqual(duplicateTargets[0]);
  });

  it("returns failed when the resolved map capability cannot apply the operation", () => {
    const focusResult = focusOn({ target: { featureId: "01" } }, () => {
      throw new Error("surface unavailable");
    });
    const highlightResult = highlight(
      { targets: [{ featureId: "east-ridge" }] },
      () => {
        throw new Error("surface unavailable");
      },
    );

    expect(focusResult).toEqual({
      affectedFeatureIds: [],
      reason: "Map focus failed: surface unavailable",
      status: "failed",
    });
    expect(highlightResult).toEqual({
      affectedFeatureIds: [],
      reason: "Map highlight failed: surface unavailable",
      status: "failed",
    });
  });

  it("shows only an allowlisted existing map layer", async () => {
    const setMapLayerVisibility = vi.fn();

    const result = await setLayerVisibility(
      {
        layer: { layerId: "operational-constraints" },
        visible: true,
      },
      setMapLayerVisibility,
    );

    expect(setMapLayerVisibility).toHaveBeenCalledWith(
      "operational-constraints",
      true,
    );
    expect(result).toEqual({
      affectedLayerIds: ["operational-constraints"],
      status: "completed",
    });
  });

  it("rejects visibility control for internal or unknown layers", async () => {
    const setMapLayerVisibility = vi.fn();

    const result = await setLayerVisibility(
      { layer: { layerId: "patrol-path-preview" }, visible: true },
      setMapLayerVisibility,
    );

    expect(setMapLayerVisibility).not.toHaveBeenCalled();
    expect(result).toEqual({
      affectedLayerIds: [],
      reason:
        "Map layer is unavailable for visibility control: patrol-path-preview",
      status: "failed",
    });
  });

  it("previews an existing path without accepting a non-path target", async () => {
    const previewMapPath = vi.fn();

    const completed = await previewPath(
      {
        target: { featureId: "patrol-path-a", layerId: "patrol-routes" },
      },
      previewMapPath,
    );
    const failed = await previewPath(
      {
        target: { featureId: "north-corridor", layerId: "operational-areas" },
      },
      previewMapPath,
    );

    expect(previewMapPath).toHaveBeenCalledOnce();
    expect(completed).toEqual({
      affectedFeatureIds: ["patrol-path-a"],
      status: "completed",
    });
    expect(failed).toEqual({
      affectedFeatureIds: [],
      reason: "Map target is unavailable for path preview: north-corridor",
      status: "failed",
    });
  });
});
