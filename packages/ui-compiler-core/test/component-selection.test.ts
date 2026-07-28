import { describe, expect, it } from "vitest";
import { selectSummaryComponent } from "../src/component-selection.js";
import { validateCompileInput } from "../src/input-validation.js";
import { expectCoreFailure } from "./assertions.js";
import { compileOptions, summaryCatalog, summaryRequest } from "./fixtures.js";

describe("summary component selector", () => {
  it("selects the authorized Card declaration", () => {
    const request = validateCompileInput(summaryRequest, compileOptions.limits);

    expect(selectSummaryComponent(request, summaryCatalog).component).toBe(
      summaryCatalog.components[0],
    );
  });

  it("rejects preferences absent from the Catalog", () => {
    const request = validateCompileInput(
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
      compileOptions.limits,
    );

    expectCoreFailure(
      () => selectSummaryComponent(request, summaryCatalog),
      "NO_COMPATIBLE_COMPONENT",
    );
  });
});
