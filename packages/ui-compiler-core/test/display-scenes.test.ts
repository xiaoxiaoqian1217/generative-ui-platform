import {
  validateA2UIOperationSequence,
  validateUISurfaceIR,
} from "@generative-ui/compiler-contract";
import {
  type ComponentCatalog,
  computeCatalogContentHash,
} from "@generative-ui/component-catalog-schema";
import { describe, expect, it } from "vitest";
import { compileA2UI } from "../src/a2ui-compiler.js";
import { selectComponents } from "../src/component-selection.js";
import { compileUI } from "../src/index.js";
import { validateCompileInput } from "../src/input-validation.js";
import { buildUIIR } from "../src/ui-ir-builder.js";
import {
  comparisonRequest,
  detailRequest,
  displayCatalog,
  displayCompileOptions,
  statusRequest,
  timelineRequest,
} from "./fixtures.js";

const sceneCases = [
  {
    name: "status",
    request: statusRequest,
    componentType: "Alert",
    bindingProp: "status",
    sourcePointer: "/service/status",
    a2uiPointer: "/sourceData/service/status",
  },
  {
    name: "comparison",
    request: comparisonRequest,
    componentType: "Table",
    bindingProp: "rows",
    sourcePointer: "/plans",
    a2uiPointer: "/sourceData/plans",
  },
  {
    name: "timeline",
    request: timelineRequest,
    componentType: "Steps",
    bindingProp: "steps",
    sourcePointer: "/events",
    a2uiPointer: "/sourceData/events",
  },
  {
    name: "detail",
    request: detailRequest,
    componentType: "List",
    bindingProp: "items",
    sourcePointer: "/records",
    a2uiPointer: "/sourceData/records",
  },
] as const;

describe("display scene lowering", () => {
  it("provides every common component declaration required by Issue 18", () => {
    expect(
      displayCatalog.components.map((component) => component.componentType),
    ).toEqual(["Card", "Text", "List", "Table", "Alert", "Timeline", "Steps"]);
  });

  it.each(sceneCases)(
    "lowers $name from UI Plan Candidate through UI IR to A2UI",
    ({
      request: input,
      componentType,
      bindingProp,
      sourcePointer,
      a2uiPointer,
    }) => {
      const request = validateCompileInput(input, displayCompileOptions.limits);
      const selections = selectComponents(request, displayCatalog);
      const surface = buildUIIR(
        request,
        selections,
        displayCatalog,
        displayCompileOptions,
      );
      const operations = compileA2UI(surface);

      expect(validateUISurfaceIR(surface)).toEqual({
        success: true,
        value: surface,
      });
      expect(surface.components[0]).toMatchObject({
        componentId: "root",
        componentType,
        bindings: [
          {
            prop: bindingProp,
            source: "sourceData",
            path: sourcePointer,
          },
        ],
      });
      expect(
        displayCatalog.components.some(
          (component) => component.componentType === componentType,
        ),
      ).toBe(true);
      expect(validateA2UIOperationSequence(operations)).toEqual({
        success: true,
        value: operations,
      });
      expect(operations[1]).toMatchObject({
        updateComponents: {
          components: [
            expect.objectContaining({
              id: "root",
              component: componentType,
              [bindingProp]: {
                path: a2uiPointer,
              },
            }),
          ],
        },
      });

      const result = compileUI(input, displayCompileOptions);
      expect(result).toMatchObject({
        success: true,
        degraded: false,
        surfaceId: "surface-18",
      });
    },
  );

  it("normalizes a narrow horizontal timeline to a vertical compact layout", () => {
    const request = validateCompileInput(
      timelineRequest,
      displayCompileOptions.limits,
    );
    const surface = buildUIIR(
      request,
      selectComponents(request, displayCatalog),
      displayCatalog,
      displayCompileOptions,
    );

    expect(surface.components[0]?.layout).toEqual({
      flow: "vertical",
      density: "compact",
    });
  });

  it("uses data scale to choose Card for a small comparison", () => {
    const smallComparison = {
      ...comparisonRequest,
      sourceData: {
        plans: [{ name: "A", price: 1 }],
      },
    };
    const request = validateCompileInput(
      smallComparison,
      displayCompileOptions.limits,
    );

    expect(
      selectComponents(request, displayCatalog)[0]?.component.componentType,
    ).toBe("Card");
  });

  it("uses Catalog descriptions as a deterministic selection signal", () => {
    const descriptionCatalog = {
      ...displayCatalog,
      components: displayCatalog.components.map((component) => {
        if (component.componentType === "Card") {
          return {
            ...component,
            description: "Highlights an important service status.",
          };
        }
        if (component.componentType === "Alert") {
          return {
            ...component,
            description: "Displays a generic notification.",
          };
        }
        return component;
      }),
    } as ComponentCatalog;
    const request = validateCompileInput(
      statusRequest,
      displayCompileOptions.limits,
    );

    expect(
      selectComponents(request, descriptionCatalog)[0]?.component.componentType,
    ).toBe("Card");
  });

  it("does not select a root component that requires a Catalog parent", () => {
    const parentConstrainedCatalog = {
      ...displayCatalog,
      components: displayCatalog.components.map((component) =>
        component.componentType === "Table"
          ? {
              ...component,
              nesting: {
                ...component.nesting,
                allowedParentTypes: ["Card"],
              },
            }
          : component,
      ),
    } as ComponentCatalog;
    const request = validateCompileInput(
      comparisonRequest,
      displayCompileOptions.limits,
    );

    expect(
      selectComponents(request, parentConstrainedCatalog)[0]?.component
        .componentType,
    ).toBe("Card");
  });

  it("selects an explicitly preferred Catalog domain component with an unambiguous direct binding", () => {
    const domainCatalog = {
      ...displayCatalog,
      components: [
        ...displayCatalog.components,
        {
          componentType: "AccountPanel",
          displayName: "Account Panel",
          description: "Displays account detail data.",
          category: "domain",
          domainTags: ["account"],
          propsSchema: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
              data: { type: "object" },
            },
            required: ["data"],
            additionalProperties: false,
          },
          allowedActions: [],
          nesting: {
            canHaveChildren: false,
          },
        },
      ],
    } as const satisfies ComponentCatalog;
    const domainRequest = {
      ...detailRequest,
      requestId: "domain-detail-18",
      sourceData: {
        account: {
          id: "account-1",
        },
      },
      plan: {
        ...detailRequest.plan,
        regions: [
          {
            ...detailRequest.plan.regions[0],
            bindings: [
              {
                sourcePointer: "/account",
                role: "content",
              },
            ],
            componentPreferences: [{ componentType: "AccountPanel" }],
          },
        ],
      },
    } as const;
    const options = {
      ...displayCompileOptions,
      catalog: domainCatalog,
      catalogContentHash: computeCatalogContentHash(domainCatalog),
    };

    const result = compileUI(domainRequest, options);

    expect(result).toMatchObject({
      success: true,
      degraded: false,
    });
    if (!result.success || result.degraded) {
      throw new Error("Expected completed domain component output.");
    }
    expect(result.operations[1]).toMatchObject({
      updateComponents: {
        components: [
          {
            id: "root",
            component: "AccountPanel",
            data: {
              path: "/sourceData/account",
            },
          },
        ],
      },
    });
  });

  it("keeps Markdown bindings relative to the sanitized /markdown sourceData", () => {
    const markdownRequest = {
      ...detailRequest,
      requestId: "markdown-detail-18",
      sourceKind: "markdown",
      sourceData: {
        markdown: "## Sanitized detail",
      },
      fallbackMarkdown: "## Sanitized detail",
      plan: {
        ...detailRequest.plan,
        regions: [
          {
            ...detailRequest.plan.regions[0],
            bindings: [
              {
                sourcePointer: "/markdown",
                role: "content",
              },
            ],
            componentPreferences: [{ componentType: "Card" }],
          },
        ],
      },
    } as const;

    const result = compileUI(markdownRequest, displayCompileOptions);

    expect(result).toMatchObject({
      success: true,
      degraded: false,
    });
    if (!result.success || result.degraded) {
      throw new Error("Expected completed Markdown detail output.");
    }
    expect(result.operations[1]).toMatchObject({
      updateComponents: {
        components: [
          {
            id: "root",
            component: "Card",
            content: {
              path: "/sourceData/markdown",
            },
            title: "Record details",
          },
        ],
      },
    });
  });

  it("resolves RFC 6901 escaped JSON Pointer segments without changing them", () => {
    const escapedPointerRequest = {
      ...detailRequest,
      requestId: "escaped-pointer-18",
      sourceData: {
        "account/details": {
          "~status": "ready",
        },
      },
      plan: {
        ...detailRequest.plan,
        regions: [
          {
            ...detailRequest.plan.regions[0],
            bindings: [
              {
                sourcePointer: "/account~1details/~0status",
                role: "content",
              },
            ],
            componentPreferences: [{ componentType: "Card" }],
          },
        ],
      },
    } as const;

    const result = compileUI(escapedPointerRequest, displayCompileOptions);

    expect(result).toMatchObject({
      success: true,
      degraded: false,
    });
    if (!result.success || result.degraded) {
      throw new Error("Expected completed escaped JSON Pointer output.");
    }
    expect(result.operations[1]).toMatchObject({
      updateComponents: {
        components: [
          {
            content: {
              path: "/sourceData/account~1details/~0status",
            },
          },
        ],
      },
    });
  });

  it("creates stable component references that satisfy Catalog nesting", () => {
    const nestedRequest = {
      ...detailRequest,
      requestId: "nested-detail-18",
      plan: {
        ...detailRequest.plan,
        regions: [
          {
            ...detailRequest.plan.regions[0],
            regionId: "detail-root",
            componentPreferences: [
              { componentType: "List" },
              { componentType: "Card" },
            ],
          },
          {
            ...detailRequest.plan.regions[0],
            regionId: "detail-child",
            componentPreferences: [{ componentType: "List" }],
          },
        ],
      },
    } as const;
    const request = validateCompileInput(
      nestedRequest,
      displayCompileOptions.limits,
    );
    const surface = buildUIIR(
      request,
      selectComponents(request, displayCatalog),
      displayCatalog,
      displayCompileOptions,
    );

    expect(surface.components).toMatchObject([
      {
        componentId: "root",
        componentType: "Card",
        children: ["region-1"],
      },
      {
        componentId: "region-1",
        componentType: "List",
        children: [],
      },
    ]);
    const componentOperation = compileA2UI(surface)[1];
    if (!("updateComponents" in componentOperation)) {
      throw new Error("Expected an updateComponents operation.");
    }
    expect(componentOperation.updateComponents.components[0]).toMatchObject({
      id: "root",
      children: ["region-1"],
    });
  });

  it("returns a structured composition error for unsupported layouts", () => {
    const invalidLayout = {
      ...comparisonRequest,
      plan: {
        ...comparisonRequest.plan,
        regions: [
          {
            ...comparisonRequest.plan.regions[0],
            layout: {
              flow: "grid",
              density: "comfortable",
              minColumns: 4,
              maxColumns: 2,
            },
          },
        ],
      },
    } as const;

    expect(compileUI(invalidLayout, displayCompileOptions)).toMatchObject({
      success: true,
      degraded: true,
      errors: [
        {
          code: "UI_PLAN_INVALID",
          stage: "ui-plan-validation",
          constraint: "layout-column-range",
        },
      ],
    });
  });

  it("rejects column constraints on a non-grid layout with a structured error", () => {
    const unsupportedLayout = {
      ...comparisonRequest,
      plan: {
        ...comparisonRequest.plan,
        regions: [
          {
            ...comparisonRequest.plan.regions[0],
            layout: {
              flow: "horizontal",
              density: "comfortable",
              minColumns: 2,
            },
          },
        ],
      },
    } as const;

    expect(compileUI(unsupportedLayout, displayCompileOptions)).toMatchObject({
      success: true,
      degraded: true,
      errors: [
        {
          code: "NO_COMPATIBLE_COMPOSITION",
          stage: "composition-planning",
          constraint: "layout-columns-require-grid",
        },
      ],
    });
  });

  it.each(["confirmation", "form"] as const)(
    "keeps the out-of-scope %s scenario on a structured unsupported path",
    (scenario) => {
      const outOfScopeRequest = {
        ...detailRequest,
        plan: {
          ...detailRequest.plan,
          scenario,
        },
      };

      expect(compileUI(outOfScopeRequest, displayCompileOptions)).toMatchObject(
        {
          success: true,
          degraded: true,
          errors: [
            {
              code: "NO_COMPATIBLE_COMPOSITION",
              stage: "composition-planning",
              constraint: "supported-core-scenario",
            },
          ],
        },
      );
    },
  );

  it("returns a structured component error for unsupported preferences", () => {
    const unsupportedComponent = {
      ...statusRequest,
      plan: {
        ...statusRequest.plan,
        regions: [
          {
            ...statusRequest.plan.regions[0],
            componentPreferences: [{ componentType: "RemoteWidget" }],
          },
        ],
      },
    } as const;

    expect(
      compileUI(unsupportedComponent, displayCompileOptions),
    ).toMatchObject({
      success: true,
      degraded: true,
      errors: [
        {
          code: "NO_COMPATIBLE_COMPONENT",
          stage: "component-selection",
        },
      ],
    });
  });

  it("produces identical planning and bindings for identical inputs", () => {
    expect(compileUI(comparisonRequest, displayCompileOptions)).toEqual(
      compileUI(comparisonRequest, displayCompileOptions),
    );
  });
});
