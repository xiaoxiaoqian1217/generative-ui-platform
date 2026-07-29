import type { ComponentCatalog } from "@generative-ui/component-catalog-schema";
import { describe, expect, it } from "vitest";
import { compileUI } from "../src/index.js";
import { compileOptions, summaryCatalog, summaryRequest } from "./fixtures.js";

function nestedObject(depth: number): unknown {
  let value: unknown = "leaf";
  for (let index = 0; index < depth; index += 1) {
    value = { child: value };
  }
  return value;
}

function expectNoA2UIOutput(result: unknown): void {
  expect(result).not.toHaveProperty("operations");
  expect(result).not.toHaveProperty("surfaceId");
}

function nonEnumerableArray(values: unknown[]): unknown[] {
  const result: unknown[] = [];
  for (const [index, value] of values.entries()) {
    Object.defineProperty(result, index, {
      configurable: true,
      value,
      writable: true,
    });
  }
  return result;
}

describe("negative compilation and deterministic fallback", () => {
  it("rejects an over-depth UI Plan Candidate before Schema validation", () => {
    const result = compileUI(
      {
        ...summaryRequest,
        plan: {
          ...summaryRequest.plan,
          untrustedData: nestedObject(10_000),
        },
      },
      {
        ...compileOptions,
        limits: {
          ...compileOptions.limits,
          maxDataDepth: 16,
        },
      },
    );

    expect(result).toMatchObject({
      requestId: summaryRequest.requestId,
      success: true,
      degraded: true,
      fallback: {
        format: "markdown",
        markdown: summaryRequest.fallbackMarkdown,
      },
      errors: [
        {
          code: "DATA_DEPTH_EXCEEDED",
          stage: "input-validation",
          path: "/plan",
          constraint: "data-depth-limit",
          retryable: false,
        },
      ],
    });
    expectNoA2UIOutput(result);
  });

  it("rejects an over-item UI Plan Candidate before Schema validation", () => {
    const result = compileUI(
      {
        ...summaryRequest,
        plan: {
          ...summaryRequest.plan,
          untrustedData: Array.from({ length: 300 }, (_, index) => index),
        },
      },
      {
        ...compileOptions,
        limits: {
          ...compileOptions.limits,
          maxDataItems: 256,
        },
      },
    );

    expect(result).toMatchObject({
      success: true,
      degraded: true,
      errors: [
        {
          code: "DATA_ITEMS_EXCEEDED",
          stage: "input-validation",
          path: "/plan",
          constraint: "data-item-limit",
        },
      ],
    });
    expectNoA2UIOutput(result);
  });

  it("counts non-enumerable array indices toward the item limit", () => {
    const result = compileUI(
      {
        ...summaryRequest,
        plan: {
          ...summaryRequest.plan,
          untrustedData: nonEnumerableArray(
            Array.from({ length: 300 }, (_, index) => index),
          ),
        },
      },
      {
        ...compileOptions,
        limits: {
          ...compileOptions.limits,
          maxDataItems: 256,
        },
      },
    );

    expect(result).toMatchObject({
      success: true,
      degraded: true,
      errors: [
        {
          code: "DATA_ITEMS_EXCEEDED",
          stage: "input-validation",
          path: "/plan",
          constraint: "data-item-limit",
        },
      ],
    });
    expectNoA2UIOutput(result);
  });

  it("checks nested values behind non-enumerable array indices", () => {
    const result = compileUI(
      {
        ...summaryRequest,
        sourceData: nonEnumerableArray([nestedObject(32)]),
      },
      compileOptions,
    );

    expect(result).toMatchObject({
      success: true,
      degraded: true,
      errors: [
        {
          code: "DATA_DEPTH_EXCEEDED",
          stage: "input-validation",
          path: "/sourceData",
          constraint: "data-depth-limit",
        },
      ],
    });
    expectNoA2UIOutput(result);
  });

  it("rejects inherited array indices from a custom prototype", () => {
    const inheritedArray: unknown[] = [];
    Object.setPrototypeOf(inheritedArray, {
      0: nestedObject(32),
    });
    inheritedArray.length = 1;

    const result = compileUI(
      {
        ...summaryRequest,
        sourceData: inheritedArray,
      },
      compileOptions,
    );

    expect(result).toMatchObject({
      success: true,
      degraded: true,
      errors: [
        {
          code: "UI_COMPILE_REQUEST_INVALID",
          stage: "input-validation",
          path: "/sourceData",
          constraint: "finite-acyclic-json",
        },
      ],
    });
    expectNoA2UIOutput(result);
  });

  it("independently rejects over-depth source data at the Core boundary", () => {
    const result = compileUI(
      {
        ...summaryRequest,
        sourceData: nestedObject(32),
      },
      compileOptions,
    );

    expect(result).toMatchObject({
      success: true,
      degraded: true,
      errors: [
        {
          code: "DATA_DEPTH_EXCEEDED",
          stage: "input-validation",
          path: "/sourceData",
          constraint: "data-depth-limit",
        },
      ],
    });
    expectNoA2UIOutput(result);
  });

  it("independently rejects over-item source data at the Core boundary", () => {
    const result = compileUI(
      {
        ...summaryRequest,
        sourceData: Array.from({ length: 300 }, (_, index) => index),
      },
      compileOptions,
    );

    expect(result).toMatchObject({
      success: true,
      degraded: true,
      errors: [
        {
          code: "DATA_ITEMS_EXCEEDED",
          stage: "input-validation",
          path: "/sourceData",
          constraint: "data-item-limit",
        },
      ],
    });
    expectNoA2UIOutput(result);
  });

  it("rejects an invalid UI Plan Candidate with a stable Markdown fallback", () => {
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
    expectNoA2UIOutput(result);
  });

  it.each([
    [
      "function value",
      () => ({
        ...summaryRequest.plan,
        untrustedValue: () => "not-json",
      }),
    ],
    [
      "cyclic reference",
      () => {
        const plan = {
          ...summaryRequest.plan,
        } as typeof summaryRequest.plan & {
          untrustedValue?: unknown;
        };
        plan.untrustedValue = plan;
        return plan;
      },
    ],
  ])(
    "classifies a UI Plan Candidate with a %s as a Plan validation failure",
    (_caseName, createPlan) => {
      const result = compileUI(
        {
          ...summaryRequest,
          plan: createPlan(),
        },
        compileOptions,
      );

      expect(result).toMatchObject({
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
            path: "/plan",
            constraint: "finite-acyclic-json",
            retryable: false,
          },
        ],
      });
      expectNoA2UIOutput(result);
    },
  );

  it.each([
    ["Date", () => new Date("2026-07-29T00:00:00.000Z")],
    ["Map", () => new Map([["unsafe", "value"]])],
    [
      "custom prototype",
      () =>
        Object.assign(Object.create({ inherited: "value" }), {
          own: "value",
        }),
    ],
  ])(
    "rejects a nested %s as a non-JSON UI Plan Candidate value",
    (_caseName, createValue) => {
      const result = compileUI(
        {
          ...summaryRequest,
          plan: {
            ...summaryRequest.plan,
            untrustedValue: createValue(),
          },
        },
        compileOptions,
      );

      expect(result).toMatchObject({
        success: true,
        degraded: true,
        errors: [
          {
            code: "UI_PLAN_INVALID",
            stage: "ui-plan-validation",
            path: "/plan",
            constraint: "finite-acyclic-json",
          },
        ],
      });
      expectNoA2UIOutput(result);
    },
  );

  it("rejects a semantically invalid Catalog before component selection", () => {
    const invalidCatalog = structuredClone(summaryCatalog) as ComponentCatalog;
    const rootComponent = invalidCatalog.components[0];
    if (!rootComponent) {
      throw new Error("Summary Catalog must include a root component.");
    }
    rootComponent.allowedActions = ["undeclared-action"];
    const result = compileUI(summaryRequest, {
      ...compileOptions,
      catalog: invalidCatalog,
    });

    expect(result).toMatchObject({
      success: true,
      degraded: true,
      errors: [
        {
          code: "COMPONENT_CATALOG_INVALID",
          stage: "catalog-validation",
          retryable: false,
        },
      ],
    });
    expect(result.metadata.completedStages).toEqual([
      "input-validation",
      "ui-plan-validation",
    ]);
    expectNoA2UIOutput(result);
  });

  it("returns complete failure when no consumable fallback exists", () => {
    const input: Record<string, unknown> = { ...summaryRequest };
    delete input.fallbackMarkdown;

    const result = compileUI(input, compileOptions);

    expect(result).toMatchObject({
      requestId: summaryRequest.requestId,
      success: false,
      degraded: false,
      errors: [
        {
          code: "UI_COMPILE_REQUEST_INVALID",
          stage: "input-validation",
          retryable: false,
        },
      ],
    });
    expect(result).not.toHaveProperty("fallback");
    expectNoA2UIOutput(result);
  });
});
