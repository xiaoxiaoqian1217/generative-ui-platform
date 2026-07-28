import { describe, expect, it } from "vitest";
import { validateInjectedCatalog } from "../src/catalog-validation.js";
import { validateCompileInput } from "../src/input-validation.js";
import { expectCoreFailure } from "./assertions.js";
import { compileOptions, summaryRequest } from "./fixtures.js";

const request = validateCompileInput(summaryRequest, compileOptions.limits);

describe("Core Catalog validator", () => {
  it("accepts matching identity and recomputed content hash", () => {
    expect(validateInjectedCatalog(request, compileOptions)).toEqual({
      catalog: compileOptions.catalog,
      contentHash: compileOptions.catalogContentHash,
    });
  });

  it("rejects changed Catalog content with a stale trusted hash", () => {
    const failure = expectCoreFailure(
      () =>
        validateInjectedCatalog(request, {
          ...compileOptions,
          catalog: {
            ...compileOptions.catalog,
            components: [
              {
                ...compileOptions.catalog.components[0],
                description: "Changed content.",
              },
            ],
          },
        }),
      "CATALOG_CONTENT_HASH_MISMATCH",
    );

    expect(failure.compileError.stage).toBe("catalog-validation");
  });
});
