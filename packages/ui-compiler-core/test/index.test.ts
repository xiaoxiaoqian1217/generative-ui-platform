import {
  validateA2UIOperationSequence,
  validateUICompileResult,
} from "@generative-ui/compiler-contract";
import {
  type ComponentCatalog,
  computeCatalogContentHash,
} from "@generative-ui/component-catalog-schema";
import { describe, expect, it } from "vitest";
import { compileUI } from "../src/index.js";
import { compileOptions, summaryCatalog, summaryRequest } from "./fixtures.js";

describe("UI Compiler Core summary tracer bullet", () => {
  it("lowers a summary plan to validated UI IR and A2UI v0.9 operations", () => {
    const result = compileUI(summaryRequest, compileOptions);

    expect(validateUICompileResult(result)).toEqual({
      success: true,
      value: result,
    });
    expect(result).toMatchObject({
      requestId: "request-17",
      threadId: "thread-17",
      runId: "run-17",
      success: true,
      degraded: false,
      surfaceId: "surface-17",
      operations: [
        {
          version: "v0.9",
          createSurface: {
            surfaceId: "surface-17",
            catalogId: "summary",
          },
        },
        {
          version: "v0.9",
          updateComponents: {
            surfaceId: "surface-17",
            components: [
              {
                id: "root",
                component: "Card",
                title: "Account summary",
                content: {
                  path: "/sourceData/summary",
                },
              },
            ],
          },
        },
        {
          version: "v0.9",
          updateDataModel: {
            surfaceId: "surface-17",
            path: "/",
            value: {
              sourceData: summaryRequest.sourceData,
            },
          },
        },
      ],
    });

    if (!result.success || result.degraded) {
      throw new Error("Expected a completed summary compile result.");
    }
    expect(validateA2UIOperationSequence(result.operations)).toEqual({
      success: true,
      value: result.operations,
    });
    expect(result.metadata.completedStages).toContain("schema-validation");
    expect(result.metadata.completedStages).toContain("a2ui-validation");
  });

  it("compiles through a Catalog component with union-typed Props", () => {
    const unionTypeCatalog = {
      ...summaryCatalog,
      components: [
        {
          ...summaryCatalog.components[0],
          propsSchema: {
            ...summaryCatalog.components[0].propsSchema,
            properties: {
              ...summaryCatalog.components[0].propsSchema.properties,
              title: {
                type: ["string", "number"],
              },
            },
          },
        },
      ],
    } as const satisfies ComponentCatalog;
    const result = compileUI(summaryRequest, {
      ...compileOptions,
      catalog: unionTypeCatalog,
      catalogContentHash: computeCatalogContentHash(unionTypeCatalog),
    });

    expect(result).toMatchObject({
      success: true,
      degraded: false,
    });
    if (!result.success || result.degraded) {
      throw new Error("Expected a completed union Props compile result.");
    }
    expect(result.operations[1]).toMatchObject({
      updateComponents: {
        components: [
          {
            title: "Account summary",
          },
        ],
      },
    });
  });

  it("revalidates an untrusted UI Plan Candidate at the Core boundary", () => {
    const result = compileUI(
      {
        ...summaryRequest,
        plan: {
          ...summaryRequest.plan,
          executableCode: "alert('untrusted')",
        },
      },
      compileOptions,
    );

    expect(result).toMatchObject({
      requestId: "request-17",
      success: true,
      degraded: true,
      fallback: {
        format: "markdown",
        markdown: summaryRequest.fallbackMarkdown,
      },
      errors: [
        {
          code: "UI_PLAN_INVALID",
          stage: "ui-plan-validation",
          retryable: false,
        },
      ],
    });
    expect(validateUICompileResult(result).success).toBe(true);
  });

  it.each([
    {
      catalog: {
        catalogId: "other",
        catalogVersion: summaryRequest.catalog.catalogVersion,
      },
    },
    {
      catalog: {
        catalogId: summaryRequest.catalog.catalogId,
        catalogVersion: "2.0.0",
      },
    },
  ])(
    "rejects a request Catalog reference that differs from the injected Catalog",
    ({ catalog }) => {
      const result = compileUI(
        {
          ...summaryRequest,
          catalog,
        },
        compileOptions,
      );

      expect(result).toMatchObject({
        success: true,
        degraded: true,
        errors: [
          {
            code: "CATALOG_REFERENCE_MISMATCH",
            stage: "catalog-validation",
          },
        ],
      });
      expect(result).not.toHaveProperty("operations");
      expect(validateUICompileResult(result).success).toBe(true);
    },
  );

  it("recomputes and verifies the injected Catalog content hash", () => {
    const changedCatalog = {
      ...summaryCatalog,
      components: [
        {
          ...summaryCatalog.components[0],
          description: "Changed summary component content.",
        },
      ],
    } as const satisfies ComponentCatalog;

    const result = compileUI(summaryRequest, {
      ...compileOptions,
      catalog: changedCatalog,
    });

    expect(result).toMatchObject({
      success: true,
      degraded: true,
      errors: [
        {
          code: "CATALOG_CONTENT_HASH_MISMATCH",
          stage: "catalog-validation",
        },
      ],
    });
    expect(result).not.toHaveProperty("operations");
    expect(validateUICompileResult(result).success).toBe(true);
  });

  it("rejects summary component suggestions not declared by the Catalog", () => {
    const result = compileUI(
      {
        ...summaryRequest,
        plan: {
          ...summaryRequest.plan,
          regions: [
            {
              ...summaryRequest.plan.regions[0],
              componentPreferences: [
                {
                  componentType: "RemoteWidget",
                },
              ],
            },
          ],
        },
      },
      compileOptions,
    );

    expect(result).toMatchObject({
      success: true,
      degraded: true,
      errors: [
        {
          code: "NO_COMPATIBLE_COMPONENT",
          stage: "component-selection",
        },
      ],
    });
    expect(result).not.toHaveProperty("operations");
    expect(validateUICompileResult(result).success).toBe(true);
  });

  it("enforces injected Core data limits before lowering", () => {
    const result = compileUI(summaryRequest, {
      ...compileOptions,
      limits: {
        ...compileOptions.limits,
        maxDataDepth: 2,
      },
    });

    expect(result).toMatchObject({
      success: true,
      degraded: true,
      errors: [
        {
          code: "DATA_DEPTH_EXCEEDED",
          stage: "input-validation",
        },
      ],
    });
    expect(result).not.toHaveProperty("operations");
    expect(validateUICompileResult(result).success).toBe(true);
  });

  it("rejects unresolved sourceData references before UI IR output", () => {
    const result = compileUI(
      {
        ...summaryRequest,
        plan: {
          ...summaryRequest.plan,
          regions: [
            {
              ...summaryRequest.plan.regions[0],
              bindings: [
                {
                  sourcePointer: "/missing",
                  role: "content",
                },
              ],
            },
          ],
        },
      },
      compileOptions,
    );

    expect(result).toMatchObject({
      success: true,
      degraded: true,
      errors: [
        {
          code: "PROPS_RESOLUTION_FAILED",
          stage: "props-resolution",
        },
      ],
    });
    expect(result).not.toHaveProperty("operations");
    expect(validateUICompileResult(result).success).toBe(true);
  });
});
