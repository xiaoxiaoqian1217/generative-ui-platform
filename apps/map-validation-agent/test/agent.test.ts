import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";
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

  it("resolves the scenario id from config.configurable, the channel the LangGraph bridge actually uses", async () => {
    const model: ValidationChatModel = {
      bindTools() {
        return {
          async invoke() {
            return new AIMessage("Done.");
          },
        };
      },
    };
    const loadScenarioInput = vi.fn(async () => scenarioInput);
    const graph = createMapValidationGraph({
      loadScenarioInput,
      modelFactory: () => model,
    });

    // Production delivery: `@ag-ui/langgraph` 0.0.42 keeps the Workbench-sent
    // `forwardedProps.config.configurable.validationScenarioId` inside the
    // LangGraph run `config.configurable` (the assistant context schema is
    // empty for this StateSchema-based graph), and the LangGraph server
    // invokes the graph with that configurable.
    await graph.invoke(
      { messages: [new HumanMessage("Review the route.")] },
      { configurable: { validationScenarioId: "test-scenario-v1" } },
    );

    expect(loadScenarioInput).toHaveBeenCalledWith("test-scenario-v1");
  });

  it("returns frontend tool calls to the caller and continues only from a real tool result", async () => {
    const model: ValidationChatModel = {
      bindTools() {
        return {
          async invoke(input) {
            const messages = (Array.isArray(input) ? input : []) as (
              | BaseMessage
              | ToolMessage
            )[];
            const last = messages.at(-1);
            if (last instanceof ToolMessage) {
              const result = JSON.parse(last.content as string) as {
                status: string;
              };
              return new AIMessage(
                `Previewed route A temporarily (${result.status}); nothing is selected.`,
              );
            }
            return new AIMessage({
              content: "",
              tool_calls: [
                {
                  args: { target: { featureId: "patrol-path-a" } },
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
    const graph = createMapValidationGraph({
      loadScenarioInput: async () => scenarioInput,
      modelFactory: () => model,
    });
    const runConfig = {
      configurable: { validationScenarioId: "test-scenario-v1" },
    };
    const copilotkit = {
      actions: [
        {
          description: "Preview an existing path.",
          name: "previewPath",
          parameters: {
            properties: { target: { type: "object" } },
            type: "object",
          },
        },
      ],
      context: [],
      interceptedToolCalls: [],
      originalAIMessageId: "",
    };

    const toolCallTurn = await graph.invoke(
      { copilotkit, messages: [new HumanMessage("Review the route.")] },
      runConfig,
    );

    // The graph emits the tool call for the client to execute and stops:
    // it must not fabricate a tool result server-side.
    expect(toolCallTurn.messages.at(-1)).toMatchObject({
      tool_calls: [expect.objectContaining({ name: "previewPath" })],
    });
    expect(
      toolCallTurn.messages.filter((message) => message instanceof ToolMessage),
    ).toHaveLength(0);

    // The caller executes the frontend tool and continues with the real
    // ToolMessage, as CopilotKit does after Workbench execution.
    const continuation = await graph.invoke(
      {
        copilotkit,
        messages: [
          ...toolCallTurn.messages,
          new ToolMessage({
            content: JSON.stringify({
              affectedFeatureIds: ["patrol-path-a"],
              status: "completed",
            }),
            tool_call_id: "tool-call-1",
          }),
        ],
      },
      runConfig,
    );

    expect(continuation.messages.at(-1)).toMatchObject({
      content:
        "Previewed route A temporarily (completed); nothing is selected.",
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
