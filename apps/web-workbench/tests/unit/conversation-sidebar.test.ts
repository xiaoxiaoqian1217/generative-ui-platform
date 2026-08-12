// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ConversationSidebar from "../../src/shell/ConversationSidebar.vue";

const conversations = [
  {
    conversationId: "conv-1",
    title: "会话一",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("ConversationSidebar", () => {
  it("renders the conversation list and emits selection", async () => {
    const wrapper = mount(ConversationSidebar, {
      props: { conversations, notice: "" },
    });

    const item = wrapper.find(".shell-conv-item");
    expect(item.text()).toContain("会话一");
    await item.trigger("click");
    expect(wrapper.emitted("selectConversation")).toEqual([["conv-1"]]);
  });

  it("marks the selected conversation as active", () => {
    const wrapper = mount(ConversationSidebar, {
      props: { conversations, notice: "", selectedConversationId: "conv-1" },
    });

    expect(wrapper.find(".shell-conv-item").classes()).toContain("active");
  });

  it("emits newConversation when the New button is clicked", async () => {
    const wrapper = mount(ConversationSidebar, {
      props: { conversations: [], notice: "" },
    });

    await wrapper.find("[data-testid='new-conversation']").trigger("click");
    expect(wrapper.emitted("newConversation")).toEqual([[]]);
  });
});
