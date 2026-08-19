import { readFileSync } from "node:fs";
import { validateA2UIComponents } from "@ag-ui/a2ui-toolkit";
import { describe, expect, it } from "vitest";
import {
  dynamicA2uiValidationCatalog,
  generateA2uiSurfaceFromContent,
  type InvokeSubagent,
  parsePresentationInput,
  serializePresentationInputContent,
} from "../src/index.js";

interface ExpectedFact {
  readonly pointer: string;
  readonly value: unknown;
}

function readScenarioJson(relativePath: string): unknown {
  return JSON.parse(
    readFileSync(new URL(relativePath, import.meta.url), "utf8"),
  ) as unknown;
}

function readPointer(value: unknown, pointer: string): unknown {
  return pointer
    .split("/")
    .filter((segment) => segment.length > 0)
    .reduce<unknown>((node, segment) => {
      if (typeof node !== "object" || node === null) return undefined;
      return (node as Record<string, unknown>)[segment];
    }, value);
}

function readSurfaceEnvelope(envelope: string): {
  readonly components: Array<Record<string, unknown>>;
  readonly data: unknown;
} {
  const parsed = JSON.parse(envelope) as {
    a2ui_operations: Array<Record<string, unknown>>;
  };
  const components = parsed.a2ui_operations.find(
    (operation) => "updateComponents" in operation,
  ) as { updateComponents: { components: Array<Record<string, unknown>> } };
  const dataModel = parsed.a2ui_operations.find(
    (operation) => "updateDataModel" in operation,
  ) as { updateDataModel: { value: unknown } };
  return {
    components: components.updateComponents.components,
    data: dataModel.updateDataModel.value,
  };
}

/**
 * Issue #213 presentation evaluation scenarios. Each scenario directory
 * holds a source-neutral `presentation-input.json` (the content contract)
 * plus an `expected-facts.json` checklist. Deterministic CI assertions:
 * the fixture carries its declared facts, the Secondary LLM prompt receives
 * the content verbatim, and the stitched envelope is catalog-valid with
 * resolved bindings and an unaltered data model. Real-model repeated
 * generation stays a manual Workbench activity and is not asserted here.
 */
describe("presentation evaluation scenarios", () => {
  describe("summary", () => {
    const input = parsePresentationInput(
      readScenarioJson("../scenarios/summary/presentation-input.json"),
    );
    const { facts } = readScenarioJson(
      "../scenarios/summary/expected-facts.json",
    ) as { facts: ExpectedFact[] };

    /**
     * A fact-faithful deterministic LLM double: presents the summary
     * content as one catalog-valid surface, binding every fact by path.
     */
    const summaryData = {
      status: "partial_success",
      success: 120,
      failed: 8,
      total: 128,
      successRate: 0.938,
    };
    const doublePrompts: string[] = [];
    const invokeSubagent: InvokeSubagent = async (prompt) => {
      doublePrompts.push(prompt);
      return {
        surfaceId: "scenario-summary",
        components: [
          { id: "root", component: "Card", child: "summary" },
          {
            id: "summary",
            component: "Column",
            children: ["badge", "metrics", "rate"],
          },
          {
            id: "badge",
            component: "StatusBadge",
            label: "部分成功",
            variant: "warning",
          },
          {
            id: "metrics",
            component: "Row",
            children: ["total", "success", "failed"],
          },
          {
            id: "total",
            component: "Metric",
            label: "总数",
            value: { path: "/total" },
          },
          {
            id: "success",
            component: "Metric",
            label: "成功",
            value: { path: "/success" },
          },
          {
            id: "failed",
            component: "Metric",
            label: "失败",
            value: { path: "/failed" },
          },
          {
            id: "rate",
            component: "InfoRow",
            label: "成功率",
            value: { path: "/successRate" },
          },
        ],
        data: summaryData,
      };
    };

    it("is a stable structured PresentationInput carrying every expected fact", () => {
      expect(input.lifecycle).toBe("stable");
      expect(input.content.kind).toBe("structured");
      expect(input.context.allowedActions).toEqual([]);
      if (input.content.kind !== "structured") return;
      for (const fact of facts) {
        expect(readPointer(input.content.value, fact.pointer)).toEqual(
          fact.value,
        );
      }
    });

    it("hands the content to the Secondary LLM verbatim", () => {
      const serialized = serializePresentationInputContent(input);
      if (input.content.kind === "structured") {
        expect(serialized).toBe(JSON.stringify(input.content.value));
        for (const fact of facts) {
          const key = fact.pointer.split("/").at(-1);
          expect(serialized).toContain(
            `"${key}":${JSON.stringify(fact.value)}`,
          );
        }
      }
    });

    it("stitches a catalog-valid surface that preserves the returned facts", async () => {
      const serialized = serializePresentationInputContent(input);
      const generation = await generateA2uiSurfaceFromContent(
        serialized,
        invokeSubagent,
      );

      expect(generation.ok).toBe(true);
      if (!generation.ok) return;
      expect(doublePrompts).toHaveLength(1);
      expect(doublePrompts[0]).toContain(serialized);

      const { components, data } = readSurfaceEnvelope(generation.envelope);
      expect(
        validateA2UIComponents({
          catalog: dynamicA2uiValidationCatalog,
          components,
          data: data as Record<string, unknown>,
          validateBindings: true,
        }),
      ).toEqual({ errors: [], valid: true });
      expect(data).toEqual(summaryData);
      for (const fact of facts) {
        expect(readPointer(data, fact.pointer)).toEqual(fact.value);
      }
    });

    it("keeps the content intact when the model violates the catalog", async () => {
      const outsideCatalog: InvokeSubagent = async () => ({
        components: [{ id: "root", component: "DeviceCard" }],
        data: {},
      });
      const generation = await generateA2uiSurfaceFromContent(
        serializePresentationInputContent(input),
        outsideCatalog,
      );

      expect(generation.ok).toBe(false);
      if (generation.ok) return;
      expect(generation.error.code).toBe("A2UI_GENERATION_FAILED");
    });
  });
});
