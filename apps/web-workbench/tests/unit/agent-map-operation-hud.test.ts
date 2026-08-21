// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import AgentMapOperationHud from "../../src/conversation/AgentMapOperationHud.vue";
import type { ConversationTurn } from "../../src/conversation/conversation-store.js";
import type { TurnObservation } from "../../src/inspect/turn-inspection.js";
import {
  MAP_PLAN_ACTIVITY_SCHEMA_VERSION,
  MAP_PLAN_ACTIVITY_TYPE,
} from "@generative-ui/shared-types";

function mapObservation(
  index: number,
  type: "FRONTEND_TOOL_INVOCATION" | "FRONTEND_TOOL_RESULT",
  toolCallId: string,
  name: string,
): TurnObservation {
  return {
    hasArtifact: true,
    id: `observation-${index}`,
    observedAt: `2026-08-20T10:00:00.00${index}Z`,
    observedIndex: index,
    payload:
      type === "FRONTEND_TOOL_INVOCATION"
        ? { args: {}, name }
        : { name, result: JSON.stringify({ status: "completed" }) },
    source: "frontend-tool",
    status: type === "FRONTEND_TOOL_RESULT" ? "ok" : undefined,
    toolCallId,
    type,
  } as TurnObservation;
}

function turn(
  status: ConversationTurn["status"],
  observations: readonly TurnObservation[],
): ConversationTurn {
  return {
    observations,
    requestId: "request-1",
    responseMessages: [],
    status,
    turnId: "turn-1",
    userMessage: { content: "map", id: "message-1", role: "user" },
  };
}

function planObservation(index: number): TurnObservation {
  return {
    hasArtifact: true,
    id: `observation-${index}`,
    messageId: "map-plan-1",
    observedAt: `2026-08-20T10:00:00.00${index}Z`,
    observedIndex: index,
    payload: {
      activityType: MAP_PLAN_ACTIVITY_TYPE,
      content: {
        goal: "检查北侧通道",
        schemaVersion: MAP_PLAN_ACTIVITY_SCHEMA_VERSION,
        status: "running",
        steps: [
          {
            detail: "这是 Agent 公开提供的任务范围说明。",
            id: "scope",
            label: "确认范围",
            operationNames: ["setLayerVisibility"],
            status: "running",
          },
        ],
      },
      messageId: "map-plan-1",
      replace: true,
      type: "ACTIVITY_SNAPSHOT",
    },
    source: "agent",
    type: "ACTIVITY_SNAPSHOT",
  };
}

describe("AgentMapOperationHud", () => {
  it("shows only map operations that have actually appeared", () => {
    const wrapper = mount(AgentMapOperationHud, {
      props: {
        turn: turn("pending", [
          planObservation(0),
          mapObservation(
            1,
            "FRONTEND_TOOL_INVOCATION",
            "tool-layer",
            "setLayerVisibility",
          ),
        ]),
      },
    });

    expect(
      wrapper.get('[data-testid="map-operation-hud-current"]').text(),
    ).toContain("显示任务限制图层");
    expect(
      wrapper.get('[data-testid="map-operation-hud-current"]').text(),
    ).toContain("这是 Agent 公开提供的任务范围说明");
    expect(
      wrapper.get('[data-testid="map-operation-hud-history"]').text(),
    ).toContain("显示任务限制图层");
    expect(wrapper.text()).not.toContain("聚焦北侧通道");
  });

  it("keeps completed operations visible and opens Inspect on demand", async () => {
    const wrapper = mount(AgentMapOperationHud, {
      props: {
        turn: turn("completed", [
          mapObservation(
            0,
            "FRONTEND_TOOL_INVOCATION",
            "tool-layer",
            "setLayerVisibility",
          ),
          mapObservation(
            1,
            "FRONTEND_TOOL_RESULT",
            "tool-layer",
            "setLayerVisibility",
          ),
        ]),
      },
    });

    const summary = wrapper.get('[data-testid="map-operation-hud-summary"]');
    expect(
      wrapper.get('[data-testid="map-operation-hud-current"]').text(),
    ).toContain("地图操作已完成");
    expect(
      wrapper.get('[data-testid="map-operation-hud-history"]').text(),
    ).toContain("显示任务限制图层");
    await summary.trigger("click");
    expect(wrapper.emitted("inspect")).toEqual([["turn-1"]]);
  });
});
