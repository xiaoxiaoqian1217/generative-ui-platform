import { describe, expect, it } from "vitest";
import { uiCompileResultSchema } from "../src/index.js";

const metadata = {
  catalogId: "base",
  catalogVersion: "0.1.0",
  compilerVersion: "0.1.0",
  compileDurationMs: 1,
};

describe("uiCompileResultSchema", () => {
  it("accepts a complete successful result", () => {
    const parsed = uiCompileResultSchema.safeParse({
      requestId: "req-1",
      success: true,
      degraded: false,
      surfaceId: "surface-1",
      operations: [{ type: "createSurface", payload: {} }],
      metadata,
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts a degraded result with fallback diagnostics", () => {
    const parsed = uiCompileResultSchema.safeParse({
      requestId: "req-2",
      success: true,
      degraded: true,
      fallback: {
        type: "markdown",
        content: "# Preserved content",
        reason: "No compatible component",
        errorCode: "COMPONENT_NOT_FOUND",
      },
      metadata,
      errors: [
        {
          code: "COMPONENT_NOT_FOUND",
          message: "No compatible component",
          stage: "component-selection",
          retryable: false,
        },
      ],
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects contradictory success and fallback fields", () => {
    const parsed = uiCompileResultSchema.safeParse({
      requestId: "req-3",
      success: true,
      degraded: false,
      surfaceId: "surface-3",
      operations: [{ type: "createSurface", payload: {} }],
      fallback: {
        type: "text",
        content: "Unexpected fallback",
        reason: "Contradictory result",
        errorCode: "INVALID_RESULT",
      },
      metadata,
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects degraded results without fallback content", () => {
    const parsed = uiCompileResultSchema.safeParse({
      requestId: "req-4",
      success: true,
      degraded: true,
      fallback: {
        type: "text",
        reason: "No content",
        errorCode: "CONTENT_MISSING",
      },
      metadata,
      errors: [
        {
          code: "CONTENT_MISSING",
          message: "No fallback content",
          stage: "fallback",
          retryable: false,
        },
      ],
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts a complete failure without consumable output", () => {
    const parsed = uiCompileResultSchema.safeParse({
      requestId: "req-5",
      success: false,
      degraded: false,
      metadata,
      errors: [
        {
          code: "COMPILE_ABORTED",
          message: "Compilation aborted",
          stage: "input-validation",
          retryable: false,
        },
      ],
    });

    expect(parsed.success).toBe(true);
  });
});
