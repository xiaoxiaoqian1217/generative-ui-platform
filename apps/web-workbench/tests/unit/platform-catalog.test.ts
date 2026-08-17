// @vitest-environment jsdom

import {
  infoRowApi,
  metricApi,
  statusBadgeApi,
} from "@generative-ui/a2ui-catalog";
import { PLATFORM_A2UI_CATALOG_ID } from "@generative-ui/shared-types";
import { describe, expect, it } from "vitest";
import { platformCatalog } from "../../src/features/a2ui/catalog/platform-catalog.js";

const BASIC_COMPONENT_NAMES = [
  "Text",
  "Image",
  "Icon",
  "Video",
  "AudioPlayer",
  "Row",
  "Column",
  "List",
  "Card",
  "Tabs",
  "Divider",
  "Modal",
  "Button",
  "TextField",
  "CheckBox",
  "ChoicePicker",
  "Slider",
  "DateTimeInput",
];

describe("platformCatalog", () => {
  it("merges all 18 Basic components with the 3 platform components under its own catalog id", () => {
    expect(platformCatalog.id).toBe(PLATFORM_A2UI_CATALOG_ID);
    expect(platformCatalog.id).not.toBe(
      "https://a2ui.org/specification/v0_9/basic_catalog.json",
    );
    expect(platformCatalog.components.size).toBe(21);
    for (const name of [
      ...BASIC_COMPONENT_NAMES,
      "Metric",
      "StatusBadge",
      "InfoRow",
    ]) {
      expect(platformCatalog.components.get(name)).toBeDefined();
    }
  });

  it("keeps the Basic Catalog functions available on the merged catalog", () => {
    expect(platformCatalog.functions.size).toBeGreaterThan(0);
    expect(platformCatalog.functions.get("formatNumber")).toBeDefined();
  });

  it("registers renderable implementations for the platform components", () => {
    for (const name of ["Metric", "StatusBadge", "InfoRow"]) {
      const implementation = platformCatalog.components.get(name);
      expect(implementation?.name).toBe(name);
      expect(implementation?.schema).toBeDefined();
      expect(implementation?.render).toBeDefined();
    }
  });
});

describe("platform catalog definitions", () => {
  it("supports literal, path-bound, and function-call values on content props", () => {
    const pathBound = {
      label: { path: "/summary/label" },
      value: { path: "/summary/value" },
    };
    expect(metricApi.schema.safeParse(pathBound).success).toBe(true);
    expect(infoRowApi.schema.safeParse(pathBound).success).toBe(true);
    expect(
      statusBadgeApi.schema.safeParse({
        label: { path: "/summary/status" },
      }).success,
    ).toBe(true);

    const functionCall = {
      call: "formatNumber",
      args: { value: 5 },
      returnType: "string",
    };
    expect(
      metricApi.schema.safeParse({ label: "设备数量", value: functionCall })
        .success,
    ).toBe(true);

    expect(
      metricApi.schema.safeParse({ label: "设备数量", value: 5 }).success,
    ).toBe(true);
    expect(
      infoRowApi.schema.safeParse({ label: "开始时间", value: "14:20" })
        .success,
    ).toBe(true);
  });

  it("includes the catalog common props so components join Row / Column layout weights", () => {
    for (const api of [metricApi, statusBadgeApi, infoRowApi] as const) {
      expect("weight" in api.schema.shape).toBe(true);
      expect("accessibility" in api.schema.shape).toBe(true);
    }
    expect(
      metricApi.schema.safeParse({ label: "x", value: 1, weight: 1 }).success,
    ).toBe(true);
  });

  it("rejects business-specific fields and raw visual values", () => {
    expect(
      metricApi.schema.safeParse({ label: "x", value: 1, droneCount: 5 })
        .success,
    ).toBe(false);
    expect(
      statusBadgeApi.schema.safeParse({ label: "x", variant: "#ff0000" })
        .success,
    ).toBe(false);
    expect(
      statusBadgeApi.schema.safeParse({ label: "x", variant: "success" })
        .success,
    ).toBe(true);
  });
});
