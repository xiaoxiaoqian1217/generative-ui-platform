// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import A2UISurfaceRenderer from "../../src/renderer/A2UISurfaceRenderer.vue";
import { applyA2UIOperations } from "../../src/renderer/a2ui.js";

const operations = [
  {
    version: "v0.9",
    createSurface: { catalogId: "fixture", surfaceId: "surface-1" },
  },
  {
    version: "v0.9",
    updateComponents: {
      components: [
        {
          children: ["confirm"],
          component: "Card",
          id: "root",
        },
        {
          action: {
            event: {
              context: {
                actionId: "confirm-1",
                destructive: false,
                planId: { path: "/sourceData/plan~1id" },
                requiresApproval: true,
              },
              name: "confirm-plan",
            },
          },
          component: "Button",
          id: "confirm",
          label: "Confirm",
        },
      ],
      surfaceId: "surface-1",
    },
  },
  {
    version: "v0.9",
    updateDataModel: {
      path: "/",
      surfaceId: "surface-1",
      value: { sourceData: { "plan/id": "plan-1" } },
    },
  },
] as const;

describe("A2UISurfaceRenderer", () => {
  it("disables historical buttons and does not emit their actions", async () => {
    const applied = applyA2UIOperations(new Map(), operations);
    if (!applied.success) throw new Error("Expected a renderable surface.");
    const surface = applied.surfaces.get("surface-1");
    if (!surface) throw new Error("Expected surface-1.");
    const wrapper = mount(A2UISurfaceRenderer, {
      props: { readOnly: true, surface },
    });

    const button = wrapper.get("button");
    expect(button.attributes("disabled")).toBeDefined();
    await button.trigger("click");
    expect(wrapper.emitted("action")).toBeUndefined();
  });
});
