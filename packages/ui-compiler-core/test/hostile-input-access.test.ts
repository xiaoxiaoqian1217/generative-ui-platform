import { describe, expect, it } from "vitest";
import { compileUI } from "../src/index.js";
import { compileOptions, summaryRequest } from "./fixtures.js";

function inputWithThrowingGetter(field: string): Record<string, unknown> {
  const input: Record<string, unknown> = { ...summaryRequest };
  Object.defineProperty(input, field, {
    configurable: true,
    enumerable: true,
    get() {
      throw new Error(`Unable to read ${field}.`);
    },
  });
  return input;
}

describe("hostile compile input access", () => {
  it("maps a throwing plan getter to a stable UI Plan error", () => {
    const result = compileUI(inputWithThrowingGetter("plan"), compileOptions);

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
          code: "UI_PLAN_INVALID",
          stage: "ui-plan-validation",
          path: "/plan",
          constraint: "readable-property",
          retryable: false,
        },
      ],
    });
    expect(result).not.toHaveProperty("operations");
    expect(result).not.toHaveProperty("surfaceId");
  });

  it("maps a throwing sourceData getter to a stable request error", () => {
    const result = compileUI(
      inputWithThrowingGetter("sourceData"),
      compileOptions,
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
          code: "UI_COMPILE_REQUEST_INVALID",
          stage: "input-validation",
          path: "/sourceData",
          constraint: "readable-property",
          retryable: false,
        },
      ],
    });
    expect(result).not.toHaveProperty("operations");
    expect(result).not.toHaveProperty("surfaceId");
  });

  it("reads a valid plan getter only once before compilation", () => {
    const input: Record<string, unknown> = { ...summaryRequest };
    let reads = 0;
    Object.defineProperty(input, "plan", {
      configurable: true,
      enumerable: true,
      get() {
        reads += 1;
        return summaryRequest.plan;
      },
    });

    const result = compileUI(input, compileOptions);

    expect(result).toMatchObject({
      requestId: summaryRequest.requestId,
      success: true,
      degraded: false,
    });
    expect(reads).toBe(1);
  });

  it("does not throw again when request correlation metadata is unreadable", () => {
    const result = compileUI(
      inputWithThrowingGetter("requestId"),
      compileOptions,
    );

    expect(result).toMatchObject({
      requestId: "unknown",
      success: true,
      degraded: true,
      fallback: {
        format: "markdown",
        markdown: summaryRequest.fallbackMarkdown,
      },
      errors: [
        {
          code: "UI_COMPILE_REQUEST_INVALID",
          stage: "input-validation",
          path: "/requestId",
          constraint: "readable-property",
        },
      ],
    });
  });

  it("returns complete failure when fallback metadata is unreadable", () => {
    const result = compileUI(
      inputWithThrowingGetter("fallbackMarkdown"),
      compileOptions,
    );

    expect(result).toMatchObject({
      requestId: summaryRequest.requestId,
      success: false,
      degraded: false,
      errors: [
        {
          code: "UI_COMPILE_REQUEST_INVALID",
          stage: "input-validation",
          path: "/fallbackMarkdown",
          constraint: "readable-property",
        },
      ],
    });
    expect(result).not.toHaveProperty("fallback");
  });
});
