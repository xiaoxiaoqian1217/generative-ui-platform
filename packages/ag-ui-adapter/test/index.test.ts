import { describe, expect, it } from "vitest";
import {
  createRunErrorEvent,
  createRunFinishedEvent,
  createRunStartedEvent,
  validateAGUIEvent,
  validateAGUIEventSequence,
  validateAGUIRunInput,
} from "../src/index.js";

const context = { threadId: "thread-1", runId: "run-1" };

describe("AG-UI adapter", () => {
  it("validates the native RunAgentInput contract", () => {
    expect(
      validateAGUIRunInput({
        ...context,
        state: {},
        messages: [
          { id: "message-1", role: "user", content: "Locate device 01" },
        ],
        tools: [],
        context: [],
      }),
    ).toMatchObject({ success: true });
  });

  it("rejects malformed native events", () => {
    expect(validateAGUIEvent({ type: "RUN_STARTED" })).toMatchObject({
      success: false,
      error: { code: "AG_UI_EVENT_INVALID" },
    });
  });

  it("creates and validates a correlated native event sequence", () => {
    const events = [
      createRunStartedEvent(context),
      {
        type: "TEXT_MESSAGE_START",
        messageId: "assistant-1",
        role: "assistant",
      },
      {
        type: "TEXT_MESSAGE_CONTENT",
        messageId: "assistant-1",
        delta: "Located.",
      },
      { type: "TEXT_MESSAGE_END", messageId: "assistant-1" },
      createRunFinishedEvent(context),
    ];
    expect(validateAGUIEventSequence(events)).toEqual({
      success: true,
      value: events,
    });
  });

  it("rejects mismatched terminal correlation", () => {
    expect(
      validateAGUIEventSequence([
        createRunStartedEvent(context),
        createRunFinishedEvent({ ...context, runId: "run-2" }),
      ]),
    ).toMatchObject({
      success: false,
      error: { code: "AG_UI_EVENT_SEQUENCE_INVALID" },
    });
  });

  it("creates a native RUN_ERROR event without a custom payload", () => {
    expect(createRunErrorEvent("Agent failed", "AGENT_FAILED")).toEqual({
      type: "RUN_ERROR",
      message: "Agent failed",
      code: "AGENT_FAILED",
    });
  });
});
