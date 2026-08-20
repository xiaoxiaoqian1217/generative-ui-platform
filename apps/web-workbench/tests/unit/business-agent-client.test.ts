import { describe, expect, it } from "vitest";
import { shouldObserveFrontendToolResult } from "../../src/agent/business-agent-client.js";

describe("business agent tool-result observation", () => {
  const message = { id: "message-1", toolCallId: "tool-call-1" };

  it("observes only new tool messages from a known browser invocation", () => {
    expect(
      shouldObserveFrontendToolResult(
        message,
        new Set(),
        new Set(),
        (toolCallId) => toolCallId === "tool-call-1",
      ),
    ).toBe(true);
  });

  it("does not attribute an unknown server-side tool message to the browser", () => {
    expect(
      shouldObserveFrontendToolResult(
        message,
        new Set(),
        new Set(),
        () => false,
      ),
    ).toBe(false);
  });

  it("does not duplicate a historical or already observed tool result", () => {
    expect(
      shouldObserveFrontendToolResult(
        message,
        new Set([message.id]),
        new Set(),
        () => true,
      ),
    ).toBe(false);
    expect(
      shouldObserveFrontendToolResult(
        message,
        new Set(),
        new Set([message.toolCallId]),
        () => true,
      ),
    ).toBe(false);
  });
});
