// @vitest-environment jsdom

import {
  MAP_PLAN_ACTIVITY_SCHEMA_VERSION,
  MAP_PLAN_ACTIVITY_TYPE,
} from "@generative-ui/shared-types";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import type { ConversationTurn } from "../../src/conversation/conversation-store.js";
import type { TurnObservation } from "../../src/inspect/turn-inspection.js";
import ConversationMainArea from "../../src/shell/ConversationMainArea.vue";

function makeTurn(overrides: Partial<ConversationTurn> = {}): ConversationTurn {
  return {
    requestId: "req-1",
    responseMessages: [],
    status: "completed",
    turnId: "turn-1",
    userMessage: {
      content: "Show status",
      id: "turn-1:user",
      role: "user",
    },
    ...overrides,
  };
}

function mapPlanObservation(status: "completed" | "running"): TurnObservation {
  return {
    hasArtifact: true,
    id: `activity-map-plan-${status}`,
    messageId: "map-plan",
    observedAt: "2026-08-21T10:00:00.000Z",
    observedIndex: 0,
    payload: {
      activityType: MAP_PLAN_ACTIVITY_TYPE,
      content: {
        ...(status === "completed"
          ? { decisionBoundary: "尚未选择最终方案。" }
          : {}),
        goal: "检查北侧通道",
        schemaVersion: MAP_PLAN_ACTIVITY_SCHEMA_VERSION,
        status,
        steps: [
          {
            detail: "显示限制图层并聚焦任务范围。",
            id: "scope",
            label: "确认范围",
            operationNames: ["setLayerVisibility"],
            ...(status === "completed"
              ? { outcome: "已明确任务范围和限制条件。" }
              : {}),
            status,
          },
        ],
      },
      messageId: "map-plan",
      replace: true,
      type: "ACTIVITY_SNAPSHOT",
    },
    source: "agent",
    type: "ACTIVITY_SNAPSHOT",
  };
}

describe("ConversationMainArea", () => {
  it("shows an empty state when there are no turns", () => {
    const wrapper = mount(ConversationMainArea, {
      props: { isRunning: false, runState: "idle", turns: [] },
    });

    expect(wrapper.find("[data-testid='conversation-main']").exists()).toBe(
      true,
    );
    expect(wrapper.text()).toContain("Agent Conversation");
    expect(wrapper.find("[data-testid='conversation-turns']").exists()).toBe(
      false,
    );
  });

  it("renders the user message and exposes a per-turn Inspect entry", () => {
    const wrapper = mount(ConversationMainArea, {
      props: {
        isRunning: false,
        runState: "completed",
        turns: [makeTurn()],
      },
    });

    expect(wrapper.find("[data-testid='user-message']").text()).toBe(
      "Show status",
    );
    expect(wrapper.find("[data-testid='inspect-turn-turn-1']").exists()).toBe(
      true,
    );
  });

  it("shows an in-progress spinner for a pending turn", () => {
    const wrapper = mount(ConversationMainArea, {
      props: {
        isRunning: true,
        runState: "running",
        turns: [makeTurn({ status: "pending" })],
      },
    });

    expect(wrapper.find(".shell-turn-hint-running").exists()).toBe(true);
  });

  it("grows a semantic Agent brief without copying map operations", () => {
    const wrapper = mount(ConversationMainArea, {
      props: {
        isRunning: true,
        runState: "running",
        turns: [
          makeTurn({
            observations: [mapPlanObservation("running")],
            status: "pending",
          }),
        ],
      },
    });

    expect(wrapper.get('[data-testid="map-plan-activity"]').text()).toContain(
      "检查北侧通道",
    );
    expect(wrapper.get('[data-testid="map-plan-activity"]').text()).toContain(
      "当前研判",
    );
    expect(wrapper.get('[data-testid="map-plan-activity"]').text()).toContain(
      "确认范围",
    );
    expect(wrapper.find(".shell-turn-hint-running").exists()).toBe(false);
  });

  it("keeps completed findings and the decision boundary in conversation", () => {
    const wrapper = mount(ConversationMainArea, {
      props: {
        isRunning: false,
        runState: "completed",
        turns: [
          makeTurn({
            observations: [mapPlanObservation("completed")],
          }),
        ],
      },
    });

    const brief = wrapper.get('[data-testid="map-plan-activity"]');
    expect(brief.text()).toContain("Agent 研判摘要");
    expect(brief.text()).toContain("已明确任务范围和限制条件");
    expect(brief.text()).toContain("尚未选择最终方案");
    expect(brief.text()).not.toContain("setLayerVisibility");
  });

  it("shows a failed hint inline", () => {
    const wrapper = mount(ConversationMainArea, {
      props: {
        isRunning: false,
        runState: "failed",
        turns: [makeTurn({ status: "failed" })],
      },
    });

    expect(wrapper.find(".shell-turn-hint-failed").exists()).toBe(true);
  });

  it("emits inspect when the per-turn Inspect entry is clicked", async () => {
    const wrapper = mount(ConversationMainArea, {
      props: {
        isRunning: false,
        runState: "completed",
        turns: [makeTurn()],
      },
    });

    await wrapper.find("[data-testid='inspect-turn-turn-1']").trigger("click");
    expect(wrapper.emitted("inspect")).toEqual([["turn-1"]]);
  });
});
