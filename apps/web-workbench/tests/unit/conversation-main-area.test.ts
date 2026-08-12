// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import type { ConversationTurn } from "../../src/conversation/conversation-store.js";
import ConversationMainArea from "../../src/shell/ConversationMainArea.vue";

function makeTurn(overrides: Partial<ConversationTurn> = {}): ConversationTurn {
  return {
    businessSurfaces: [],
    requestId: "req-1",
    status: "completed",
    turnId: "turn-1",
    userMessage: { content: "展示状态", id: "turn-1:user" },
    ...overrides,
  };
}

describe("ConversationMainArea", () => {
  it("shows an empty state when there are no turns", () => {
    const wrapper = mount(ConversationMainArea, {
      props: {
        actionsDisabled: false,
        isRunning: false,
        runState: "idle",
        turns: [],
      },
    });

    expect(wrapper.find("[data-testid='conversation-main']").exists()).toBe(
      true,
    );
    expect(wrapper.text()).toContain("开始一段真实 Agent Conversation");
    expect(wrapper.find("[data-testid='conversation-turns']").exists()).toBe(
      false,
    );
  });

  it("renders the user message in a right-aligned bubble and exposes a per-turn Inspect entry", () => {
    const turn = makeTurn();
    const wrapper = mount(ConversationMainArea, {
      props: {
        actionsDisabled: false,
        isRunning: false,
        runState: "completed",
        turns: [turn],
      },
    });

    expect(wrapper.find("[data-testid='user-message']").text()).toBe(
      "展示状态",
    );
    expect(wrapper.find(".shell-bubble-user").exists()).toBe(true);
    expect(wrapper.find("[data-testid='inspect-turn-turn-1']").exists()).toBe(
      true,
    );
  });

  it("shows an in-progress spinner for a pending turn", () => {
    const turn = makeTurn({ status: "pending" });
    const wrapper = mount(ConversationMainArea, {
      props: {
        actionsDisabled: false,
        isRunning: true,
        runState: "running",
        turns: [turn],
      },
    });

    expect(wrapper.find(".shell-turn-hint-running").exists()).toBe(true);
    expect(wrapper.text()).toContain("正在运行");
  });

  it("shows degraded and failed hints inline", () => {
    const degraded = makeTurn({ status: "degraded" });
    const failed = makeTurn({
      status: "failed",
      turnId: "turn-2",
      requestId: "req-2",
    });
    const wrapper = mount(ConversationMainArea, {
      props: {
        actionsDisabled: false,
        isRunning: false,
        runState: "completed",
        turns: [degraded, failed],
      },
    });

    expect(wrapper.text()).toContain("已降级");
    expect(wrapper.text()).toContain("运行失败");
  });

  it("emits inspect when the per-turn Inspect entry is clicked", async () => {
    const turn = makeTurn();
    const wrapper = mount(ConversationMainArea, {
      props: {
        actionsDisabled: false,
        isRunning: false,
        runState: "completed",
        turns: [turn],
      },
    });

    await wrapper.find("[data-testid='inspect-turn-turn-1']").trigger("click");
    expect(wrapper.emitted("inspect")).toEqual([["turn-1"]]);
  });
});
