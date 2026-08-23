import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { describe, expect, it, vi } from "vitest";
import { createMapValidationGraph } from "../src/agent.js";
import type { ValidationChatModel } from "../src/model.js";
import type { ValidationScenarioInput } from "../src/scenario-loader.js";

const scenarioInput: ValidationScenarioInput = {
  facts: [
    {
      id: "fact-1",
      kind: "statement",
      statement: "The existing route is temporary and unselected.",
    },
  ],
  mapTargets: [
    {
      id: "route",
      kind: "feature",
      label: "Route A",
      ref: { featureId: "patrol-path-a", layerId: "patrol-routes" },
    },
  ],
  scenarioId: "test-scenario-v1",
  userGoal: "Review the route.",
  version: "1",
};

describe("map validation graph", () => {
  it("injects a deterministic model factory and exposes only allowed frontend actions", async () => {
    const boundToolNames: string[] = [];
    const model: ValidationChatModel = {
      bindTools(tools) {
        boundToolNames.push(
          ...tools.flatMap((tool) => {
            if (
              typeof tool === "object" &&
              tool !== null &&
              "name" in tool &&
              typeof tool.name === "string"
            )
              return [tool.name];
            return [];
          }),
        );
        return {
          async invoke() {
            return new AIMessage({
              content: "",
              tool_calls: [
                {
                  args: {
                    target: {
                      featureId: "patrol-path-a",
                      layerId: "patrol-routes",
                    },
                  },
                  id: "tool-call-1",
                  name: "previewPath",
                  type: "tool_call",
                },
              ],
            });
          },
        };
      },
    };
    const loadScenarioInput = vi.fn(async () => scenarioInput);
    const graph = createMapValidationGraph({
      loadScenarioInput,
      modelFactory: () => model,
    });

    const result = await graph.invoke(
      {
        copilotkit: {
          actions: [
            {
              description: "Preview an existing path.",
              name: "previewPath",
              parameters: {
                properties: { target: { type: "object" } },
                type: "object",
              },
            },
            {
              description: "Server-only probe that must not be exposed.",
              name: "serverProbe",
              parameters: { properties: {}, type: "object" },
            },
          ],
          context: [],
          interceptedToolCalls: [],
          originalAIMessageId: "",
        },
        messages: [new HumanMessage("Review the route")],
      },
      { context: { validationScenarioId: "test-scenario-v1" } },
    );

    expect(loadScenarioInput).toHaveBeenCalledWith("test-scenario-v1");
    expect(boundToolNames).toEqual(["previewPath"]);
    expect(result.messages.at(-1)).toMatchObject({
      tool_calls: [expect.objectContaining({ name: "previewPath" })],
    });
  });

  it("rejects a run without an explicit scenario id before model invocation", async () => {
    const modelFactory = vi.fn();
    const graph = createMapValidationGraph({ modelFactory });

    await expect(
      graph.invoke({ messages: [new HumanMessage("Hi")] }),
    ).rejects.toThrow("VALIDATION_SCENARIO_ID_REQUIRED");
    expect(modelFactory).not.toHaveBeenCalled();
  });
});
