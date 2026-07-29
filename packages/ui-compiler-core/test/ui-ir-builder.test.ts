import { validateUISurfaceIR } from "@generative-ui/compiler-contract";
import {
  type ComponentCatalog,
  computeCatalogContentHash,
} from "@generative-ui/component-catalog-schema";
import { describe, expect, it } from "vitest";
import { selectComponents } from "../src/component-selection.js";
import { validateCompileInput } from "../src/input-validation.js";
import { buildUIIR } from "../src/ui-ir-builder.js";
import { expectCoreFailure } from "./assertions.js";
import { compileOptions, summaryCatalog, summaryRequest } from "./fixtures.js";

const request = validateCompileInput(summaryRequest, compileOptions.limits);

describe("summary UI IR Builder", () => {
  it("builds Schema-valid IR from the authorized Card mapping", () => {
    const selections = selectComponents(request, summaryCatalog);
    const surface = buildUIIR(
      request,
      selections,
      summaryCatalog,
      compileOptions,
    );

    expect(validateUISurfaceIR(surface)).toEqual({
      success: true,
      value: surface,
    });
    expect(surface.components).toEqual([
      expect.objectContaining({
        componentId: "root",
        componentType: "Card",
        props: {
          title: "Account summary",
        },
        bindings: [
          {
            prop: "content",
            source: "sourceData",
            path: "/summary",
          },
        ],
      }),
    ]);
  });

  it("does not infer Binding semantics from arbitrary Prop names", () => {
    const misleadingCatalog = {
      ...summaryCatalog,
      components: [
        {
          ...summaryCatalog.components[0],
          propsSchema: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
              value: {
                type: "object",
              },
            },
            required: ["value"],
            additionalProperties: false,
          },
        },
      ],
    } as const satisfies ComponentCatalog;
    const options = {
      ...compileOptions,
      catalog: misleadingCatalog,
      catalogContentHash: computeCatalogContentHash(misleadingCatalog),
    };
    const selections = selectComponents(request, misleadingCatalog);

    const failure = expectCoreFailure(
      () => buildUIIR(request, selections, misleadingCatalog, options),
      "COMPONENT_PROPS_INVALID",
    );
    expect(failure.compileError.stage).toBe("props-resolution");
  });
});
