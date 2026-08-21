import { describe, expect, it } from "vitest";
import { mapOperationSteps } from "../../src/conversation/map-operation-trace.js";
import type { TurnObservation } from "../../src/inspect/turn-inspection.js";

function observation(
  index: number,
  input: Partial<TurnObservation> & Pick<TurnObservation, "source" | "type">,
): TurnObservation {
  return {
    hasArtifact: true,
    id: `observation-${index}`,
    observedAt: `2026-08-20T10:00:00.00${index}Z`,
    observedIndex: index,
    ...input,
  } as TurnObservation;
}

describe("map operation trace", () => {
  it("projects correlated frontend tool facts into semantic map steps", () => {
    const observations = [
      observation(0, {
        payload: {
          args: {
            targets: [
              { featureId: "east-ridge" },
              { featureId: "under-bridge" },
              { featureId: "checkpoint-b" },
              { featureId: "north-restricted-zone" },
            ],
          },
          name: "highlight",
        },
        source: "frontend-tool",
        toolCallId: "tool-highlight",
        type: "FRONTEND_TOOL_INVOCATION",
      }),
      observation(1, {
        payload: {
          name: "highlight",
          result: JSON.stringify({
            affectedFeatureIds: ["east-ridge"],
            status: "completed",
          }),
        },
        source: "frontend-tool",
        status: "ok",
        toolCallId: "tool-highlight",
        type: "FRONTEND_TOOL_RESULT",
      }),
      observation(2, {
        payload: {
          args: { target: { featureId: "patrol-path-a" } },
          name: "previewPath",
        },
        source: "frontend-tool",
        toolCallId: "tool-preview",
        type: "FRONTEND_TOOL_INVOCATION",
      }),
    ];

    expect(mapOperationSteps(observations)).toEqual([
      {
        label: "标记观察点和限制区",
        status: "completed",
        toolCallId: "tool-highlight",
        toolName: "highlight",
      },
      {
        label: "预览候选路线 A",
        status: "running",
        toolCallId: "tool-preview",
        toolName: "previewPath",
      },
    ]);
  });

  it("does not project unrelated frontend tools", () => {
    expect(
      mapOperationSteps([
        observation(0, {
          payload: { args: {}, name: "show_workbench_status" },
          source: "frontend-tool",
          toolCallId: "tool-status",
          type: "FRONTEND_TOOL_INVOCATION",
        }),
      ]),
    ).toEqual([]);
  });
});
