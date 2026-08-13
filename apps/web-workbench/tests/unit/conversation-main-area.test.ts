// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import type { ConversationTurn } from "../../src/conversation/conversation-store.js";
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
