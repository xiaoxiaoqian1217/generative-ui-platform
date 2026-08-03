import { describe, expect, it } from "vitest";
import {
  applyA2UIOperations,
  createRuntimeAction,
  destroySurface,
  isRenderableComponent,
  registeredComponentTypes,
  resolveJsonPointer,
} from "../../src/renderer/a2ui.js";

const create = {
  version: "v0.9",
  createSurface: { surfaceId: "surface-1", catalogId: "catalog-1" },
} as const;
const components = {
  version: "v0.9",
  updateComponents: {
    surfaceId: "surface-1",
    components: [
      {
        id: "root",
        component: "Card",
        title: { path: "/sourceData/title" },
        children: ["confirm"],
      },
      {
        id: "confirm",
        component: "Button",
        label: "Confirm",
        action: {
          event: {
            name: "confirm-plan",
            context: {
              actionId: "confirm-1",
              requiresApproval: true,
              destructive: false,
              planId: { path: "/sourceData/plan~1id" },
            },
          },
        },
      },
    ],
  },
} as const;
const data = {
  version: "v0.9",
  updateDataModel: {
    surfaceId: "surface-1",
    path: "/",
    value: { sourceData: { title: "Plan", "plan/id": "plan-1" } },
  },
} as const;

describe("A2UI v0.9 reducer", () => {
  it("applies every profile operation and replaces component and data snapshots", () => {
    const applied = applyA2UIOperations(new Map(), [create, components, data]);
    expect(applied.success).toBe(true);
    if (!applied.success) return;
    expect(
      applied.surfaces.get("surface-1")?.components.get("root")?.component,
    ).toBe("Card");
    expect(
      resolveJsonPointer(
        applied.surfaces.get("surface-1")?.dataModel,
        "/sourceData/plan~1id",
      ),
    ).toBe("plan-1");

    const replacement = applyA2UIOperations(applied.surfaces, [
      {
        version: "v0.9",
        updateComponents: {
          surfaceId: "surface-1",
          components: [{ id: "root", component: "Text", text: "Replaced" }],
        },
      },
    ]);
    expect(replacement.success).toBe(true);
    if (!replacement.success) return;
    expect(replacement.surfaces.get("surface-1")?.components.size).toBe(1);

    expect(
      destroySurface(replacement.surfaces, "surface-1").has("surface-1"),
    ).toBe(false);
  });

  it("rejects malformed and out-of-order operations without partially changing the prior Surface", () => {
    const prior = applyA2UIOperations(new Map(), [create]);
    expect(prior.success).toBe(true);
    if (!prior.success) return;
    const result = applyA2UIOperations(prior.surfaces, [
      {
        version: "v0.9",
        updateComponents: {
          surfaceId: "missing",
          components: [{ id: "root", component: "Text" }],
        },
      },
    ]);
    expect(result).toMatchObject({
      success: false,
      error: { code: "A2UI_SURFACE_NOT_FOUND" },
    });
    expect(prior.surfaces.get("surface-1")?.components.size).toBe(0);
    expect(
      applyA2UIOperations(new Map(), [
        { version: "v0.9", execute: "alert(1)" },
      ]),
    ).toMatchObject({
      success: false,
      error: { code: "A2UI_OPERATION_INVALID" },
    });
    expect(
      applyA2UIOperations(new Map(), [
        create,
        {
          version: "v0.9",
          updateComponents: {
            surfaceId: "surface-1",
            components: [
              { id: "root", component: "Card", children: ["child"] },
              { id: "child", component: "Card", children: ["root"] },
            ],
          },
        },
      ]),
    ).toMatchObject({
      success: false,
      error: { code: "A2UI_OPERATION_INVALID" },
    });
  });

  it("creates a Runtime-contract Action without executable metadata", () => {
    const applied = applyA2UIOperations(new Map(), [create, components, data]);
    expect(applied.success).toBe(true);
    if (!applied.success) return;
    const surface = applied.surfaces.get("surface-1");
    const confirm = surface?.components.get("confirm");
    if (!surface || !confirm) throw new Error("Expected confirm component.");
    const action = createRuntimeAction("surface-1", confirm, surface.dataModel);
    expect(action).toEqual({
      actionId: "confirm-1",
      actionType: "confirm-plan",
      surfaceId: "surface-1",
      payload: { planId: "plan-1" },
    });
    expect(JSON.stringify(action)).not.toContain("requiresApproval");
    expect(
      createRuntimeAction("surface-1", confirm, {
        sourceData: {},
      }),
    ).toBeUndefined();
  });

  it("contains only the fixed, non-executable component registry", () => {
    expect(registeredComponentTypes).toEqual([
      "Badge",
      "Button",
      "Card",
      "Column",
      "List",
      "Row",
      "Table",
      "Text",
      "Timeline",
    ]);
    expect(isRenderableComponent("fixture", "Card")).toBe(true);
    expect(isRenderableComponent("fixture", "Button")).toBe(true);
    expect(isRenderableComponent("untrusted", "Card")).toBe(false);
  });
});
