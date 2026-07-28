import type { UISurfaceIR } from "@generative-ui/compiler-contract";
import { validateA2UIOperationSequence } from "@generative-ui/compiler-contract";
import { describe, expect, it } from "vitest";
import { compileA2UI } from "../src/a2ui-compiler.js";
import { selectSummaryComponent } from "../src/component-selection.js";
import { validateCompileInput } from "../src/input-validation.js";
import { buildUIIR } from "../src/ui-ir-builder.js";
import { expectCoreFailure } from "./assertions.js";
import { compileOptions, summaryCatalog, summaryRequest } from "./fixtures.js";

const request = validateCompileInput(summaryRequest, compileOptions.limits);
const surface = buildUIIR(
  request,
  [selectSummaryComponent(request, summaryCatalog)],
  summaryCatalog,
  compileOptions,
);

describe("A2UI Compiler", () => {
  it("emits the validated three-operation v0.9 sequence", () => {
    const operations = compileA2UI(surface);

    expect(validateA2UIOperationSequence(operations)).toEqual({
      success: true,
      value: operations,
    });
    expect(operations.map((operation) => operation.version)).toEqual([
      "v0.9",
      "v0.9",
      "v0.9",
    ]);
  });

  it("rejects output without the required root component", () => {
    const invalidSurface = {
      ...surface,
      components: [
        {
          ...surface.components[0],
          componentId: "not-root",
        },
      ],
    } as UISurfaceIR;

    expectCoreFailure(() => compileA2UI(invalidSurface), "A2UI_INVALID");
  });
});
