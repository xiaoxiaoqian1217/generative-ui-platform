import { Worker } from "node:worker_threads";
import type { UICompileRequest } from "@generative-ui/compiler-contract";
import { describe, expect, it } from "vitest";
import type { CompileOptions } from "../src/types.js";
import { compileOptions, summaryRequest } from "./fixtures.js";

interface CompileJob {
  input: UICompileRequest;
  options: CompileOptions;
}

function runWorker(
  jobs: CompileJob[],
): Promise<ReturnType<typeof import("../src/index.js").compileUI>[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./compile-worker.mjs", import.meta.url),
      {
        workerData: jobs,
      },
    );
    worker.once("error", reject);
    worker.once("message", resolve);
    worker.once("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Compile worker exited with code ${code}.`));
      }
    });
  });
}

async function compileConcurrently(
  jobs: CompileJob[],
): Promise<ReturnType<typeof import("../src/index.js").compileUI>[]> {
  const workerCount = 2;
  const batches = Array.from({ length: workerCount }, () => [] as CompileJob[]);
  for (const [index, job] of jobs.entries()) {
    batches[index % workerCount]?.push(job);
  }
  return (await Promise.all(batches.map(runWorker))).flat();
}

function summaryPlan(): UICompileRequest["plan"] {
  return {
    ...summaryRequest.plan,
    regions: summaryRequest.plan.regions.map((region) => ({
      ...region,
      bindings: region.bindings.map((binding) => ({ ...binding })),
      componentPreferences: region.componentPreferences.map((preference) => ({
        ...preference,
      })),
      layout: { ...region.layout },
    })),
  };
}

describe("request-level compile isolation", () => {
  it("does not share source data or Surface IDs across concurrent compiles", async () => {
    const sharedPlan = summaryPlan();
    const requests = Array.from({ length: 16 }, (_, index) => ({
      ...summaryRequest,
      requestId: `request-isolation-${index}`,
      plan: sharedPlan,
      sourceData: {
        summary: {
          balance: index,
          currency: `currency-${index}`,
        },
      },
      fallbackMarkdown: `fallback-${index}`,
    })) satisfies UICompileRequest[];

    const results = await compileConcurrently(
      requests.map((request, index) => ({
        input: request,
        options: {
          ...compileOptions,
          surfaceId: `surface-isolation-${index}`,
        },
      })),
    );

    for (const result of results) {
      const index = Number(result.requestId.replace("request-isolation-", ""));
      expect(result).toMatchObject({
        requestId: `request-isolation-${index}`,
        success: true,
        degraded: false,
        surfaceId: `surface-isolation-${index}`,
        operations: [
          {
            createSurface: {
              surfaceId: `surface-isolation-${index}`,
            },
          },
          {
            updateComponents: {
              surfaceId: `surface-isolation-${index}`,
            },
          },
          {
            updateDataModel: {
              surfaceId: `surface-isolation-${index}`,
              value: {
                sourceData: requests[index]?.sourceData,
              },
            },
          },
        ],
      });
    }
    expect(new Set(results.map((result) => result.requestId)).size).toBe(16);
    expect(
      new Set(
        results.map((result) =>
          result.success && !result.degraded ? result.surfaceId : "invalid",
        ),
      ).size,
    ).toBe(16);
  }, 30_000);

  it("does not share fallback content across concurrent degraded compiles", async () => {
    const validPlan = summaryPlan();
    const firstRegion = validPlan.regions[0];
    if (!firstRegion) {
      throw new Error("Summary Fixture must include a root region.");
    }
    const sharedInvalidPlan: UICompileRequest["plan"] = {
      ...validPlan,
      regions: [
        {
          ...firstRegion,
          componentPreferences: [{ componentType: "UnknownComponent" }],
        },
      ],
    };
    const requests = Array.from({ length: 16 }, (_, index) => ({
      ...summaryRequest,
      requestId: `request-fallback-${index}`,
      plan: sharedInvalidPlan,
      sourceData: {
        summary: {
          balance: index,
        },
      },
      fallbackMarkdown: `safe-fallback-${index}`,
    })) satisfies UICompileRequest[];

    const results = await compileConcurrently(
      requests.map((request, index) => ({
        input: request,
        options: {
          ...compileOptions,
          surfaceId: `unused-surface-${index}`,
        },
      })),
    );

    for (const result of results) {
      const index = Number(result.requestId.replace("request-fallback-", ""));
      expect(result).toMatchObject({
        requestId: `request-fallback-${index}`,
        success: true,
        degraded: true,
        fallback: {
          format: "markdown",
          markdown: `safe-fallback-${index}`,
        },
        errors: [
          {
            code: "NO_COMPATIBLE_COMPONENT",
          },
        ],
      });
      expect(result).not.toHaveProperty("operations");
      expect(result).not.toHaveProperty("surfaceId");
    }
  }, 30_000);
});
