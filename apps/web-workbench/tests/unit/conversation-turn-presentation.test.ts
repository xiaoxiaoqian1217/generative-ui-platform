// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ConversationTurnPresentation from "../../src/conversation/ConversationTurnPresentation.vue";
import type { ConversationTurn } from "../../src/conversation/conversation-store.js";

const markdownTurn: ConversationTurn = {
  requestId: "request-1",
  responseMessages: [
    {
      content: "## Safe response",
      id: "assistant-1",
      role: "assistant",
    },
  ],
  status: "completed",
  turnId: "turn-1",
  userMessage: { content: "Show markdown", id: "turn-1:user", role: "user" },
};

const failedTurn: ConversationTurn = {
  failure: {
    code: "WORKBENCH_REQUEST_TIMEOUT",
    message: "upstream response: secret diagnostic detail",
    retryable: true,
  },
  requestId: "request-2",
  responseMessages: [],
  status: "failed",
  turnId: "turn-2",
  userMessage: { content: "Show failure", id: "turn-2:user", role: "user" },
};

describe("ConversationTurnPresentation", () => {
  it("renders native AG-UI assistant Markdown", () => {
    const wrapper = mount(ConversationTurnPresentation, {
      props: { turn: markdownTurn },
    });

    expect(wrapper.get('[data-testid="markdown-result"]').text()).toContain(
      "Safe response",
    );
  });

  it("renders a safe Workbench failure without an assistant message", () => {
    const wrapper = mount(ConversationTurnPresentation, {
      props: { turn: failedTurn },
    });

    expect(wrapper.get('[data-testid="turn-failure"]').text()).toContain(
      "WORKBENCH_REQUEST_TIMEOUT",
    );
    expect(wrapper.text()).not.toContain("secret diagnostic detail");
    expect(wrapper.find('[data-testid="markdown-result"]').exists()).toBe(
      false,
    );
  });
});
