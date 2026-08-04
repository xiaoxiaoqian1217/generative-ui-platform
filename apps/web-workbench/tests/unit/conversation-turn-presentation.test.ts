// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import ConversationTurnPresentation from "../../src/conversation/ConversationTurnPresentation.vue";
import CopilotKitConversationProvider from "../../src/conversation/CopilotKitConversationProvider.vue";
import type { ConversationTurn } from "../../src/conversation/conversation-store.js";

const markdownTurn: ConversationTurn = {
  businessSurfaces: [],
  presentation: {
    markdown: "## Safe response",
    mode: "markdown",
    requestId: "presentation-request",
    status: "completed",
  },
  requestId: "request-1",
  status: "completed",
  turnId: "turn-1",
  userMessage: { content: "Show markdown", id: "turn-1:user" },
};

describe("ConversationTurnPresentation", () => {
  it("renders markdown through a CopilotKit assistant message", () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(
              CopilotKitConversationProvider,
              { runtimeUrl: "http://127.0.0.1:8200/api/copilotkit" },
              () =>
                h(ConversationTurnPresentation, {
                  messages: [],
                  turn: markdownTurn,
                }),
            );
        },
      }),
    );

    expect(wrapper.get('[data-testid="markdown-result"]').text()).toContain(
      "Safe response",
    );
  });
});
