import { describe, expect, it } from "vitest";
import { validateCompileInput } from "../src/input-validation.js";
import { expectCoreFailure } from "./assertions.js";
import { compileOptions, summaryRequest } from "./fixtures.js";

describe("Core input validator", () => {
  it("accepts a bounded summary compile request", () => {
    expect(validateCompileInput(summaryRequest, compileOptions.limits)).toEqual(
      summaryRequest,
    );
  });

  it("rejects an untrusted plan with executable fields", () => {
    const failure = expectCoreFailure(
      () =>
        validateCompileInput(
          {
            ...summaryRequest,
            plan: {
              ...summaryRequest.plan,
              executableCode: "alert('untrusted')",
            },
          },
          compileOptions.limits,
        ),
      "UI_PLAN_INVALID",
    );

    expect(failure.compileError.stage).toBe("ui-plan-validation");
  });
});
