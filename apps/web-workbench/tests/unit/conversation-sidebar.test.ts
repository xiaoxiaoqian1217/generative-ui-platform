// @vitest-environment jsdom

import type { RuntimeThread } from "@generative-ui/runtime-contract";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ConversationSidebar from "../../src/shell/ConversationSidebar.vue";

const threads: RuntimeThread[] = [
  {
    contractVersion: "1.0",
    createdAt: "2026-01-01T00:00:00.000Z",
    status: "active",
    threadId: "thread-1",
    title: "会话一",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("ConversationSidebar", () => {
  it("renders the conversation list and emits selection", async () => {
    const wrapper = mount(ConversationSidebar, {
      props: { notice: "", threads },
    });

    const item = wrapper.find(".conversation-list-item");
    expect(item.text()).toContain("会话一");
    await item.trigger("click");
    expect(wrapper.emitted("selectConversation")).toEqual([["thread-1"]]);
  });

  it("marks the selected thread as active", () => {
    const wrapper = mount(ConversationSidebar, {
      props: { notice: "", selectedThreadId: "thread-1", threads },
    });

    expect(wrapper.find(".conversation-list-item").classes()).toContain(
      "active",
    );
  });

  it("emits newConversation when the New button is clicked", async () => {
    const wrapper = mount(ConversationSidebar, {
      props: { notice: "", threads: [] },
    });

    await wrapper.find("[data-testid='new-conversation']").trigger("click");
    expect(wrapper.emitted("newConversation")).toEqual([[]]);
  });
});
