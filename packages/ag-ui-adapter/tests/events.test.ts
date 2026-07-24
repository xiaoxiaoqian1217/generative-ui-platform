import type { UICompileResult } from "@generative-ui/compiler-contract";
import { describe, expect, it } from "vitest";
import { compileResultToAgUiEvents } from "../src/index.js";

const degradedResult: UICompileResult = {
  requestId: "req-1",
  success: true,
  degraded: true,
  fallback: {
    type: "markdown",
    content: "# Preserved content",
    reason: "No compatible component",
    errorCode: "COMPONENT_NOT_FOUND",
  },
  metadata: {
    catalogId: "base",
    catalogVersion: "0.1.0",
    compilerVersion: "0.1.0",
    compileDurationMs: 1,
  },
  errors: [
    {
      code: "COMPONENT_NOT_FOUND",
      message: "No compatible component",
      stage: "component-selection",
      retryable: false,
    },
  ],
};

describe("compileResultToAgUiEvents", () => {
  it("emits a fallback event for a degraded success", () => {
    const events = compileResultToAgUiEvents("run-1", degradedResult);

    expect(events.map((event) => event.type)).toEqual([
      "RUN_STARTED",
      "A2UI_FALLBACK",
      "RUN_FINISHED",
    ]);
  });

  it("emits a terminal error for a complete failure", () => {
    const failedResult: UICompileResult = {
      requestId: "req-2",
      success: false,
      degraded: false,
      metadata: degradedResult.metadata,
      errors: [
        {
          code: "COMPILE_ABORTED",
          message: "Compilation aborted",
          stage: "input-validation",
          retryable: false,
        },
      ],
    };

    const events = compileResultToAgUiEvents("run-2", failedResult);

    expect(events.map((event) => event.type)).toEqual([
      "RUN_STARTED",
      "RUN_ERROR",
    ]);
  });
});
