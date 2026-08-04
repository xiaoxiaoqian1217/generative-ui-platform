// @vitest-environment jsdom

import type { UserMessage } from "@ag-ui/core";
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import ControlledCopilotChatView from "../../src/conversation/ControlledCopilotChatView.vue";
import CopilotKitConversationProvider from "../../src/conversation/CopilotKitConversationProvider.vue";

describe("ControlledCopilotChatView", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders caller-owned messages and forwards input changes without creating an agent", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ agents: [] }), { status: 200 }),
        ),
    );
    const message: UserMessage = {
      id: "user-1",
      role: "user",
      content: "受控消息",
    };
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(
              CopilotKitConversationProvider,
              { runtimeUrl: "http://127.0.0.1:8200/api/copilotkit" },
              () =>
                h(ControlledCopilotChatView, {
                  inputValue: "初始输入",
                  isInputDisabled: false,
                  isRunning: false,
                  messages: [message],
                  turns: [],
                }),
            );
        },
      }),
    );
    const chat = wrapper.findComponent(ControlledCopilotChatView);

    expect(chat.exists()).toBe(true);
    expect(wrapper.text()).toContain("受控消息");
    await chat.find("textarea").setValue("新的受控输入");
    expect(chat.emitted("inputChange")).toEqual([["新的受控输入"]]);
  });

  it("keeps the default CopilotKit input inaccessible while the caller cannot submit", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ agents: [] }), { status: 200 }),
        ),
    );
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(
              CopilotKitConversationProvider,
              { runtimeUrl: "http://127.0.0.1:8200/api/copilotkit" },
              () =>
                h(ControlledCopilotChatView, {
                  inputValue: "",
                  isInputDisabled: true,
                  isRunning: false,
                  messages: [],
                  turns: [],
                }),
            );
        },
      }),
    );

    expect(wrapper.find("textarea").attributes("disabled")).toBeDefined();
  });
});
