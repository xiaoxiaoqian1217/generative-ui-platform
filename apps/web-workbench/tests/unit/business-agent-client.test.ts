import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createPausableRunDeadline,
  isPatrolRouteHumanWaitTool,
  shouldObserveFrontendToolResult,
} from "../../src/agent/business-agent-client.js";

afterEach(() => vi.useRealTimers());

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

describe("business agent run deadline", () => {
  it("does not spend the remaining deadline during a human wait", () => {
    vi.useFakeTimers();
    const timedOut = vi.fn();
    const deadline = createPausableRunDeadline(100, timedOut, () => Date.now());

    vi.advanceTimersByTime(40);
    expect(deadline.pause()).toBe(60);
    vi.advanceTimersByTime(500);
    expect(timedOut).not.toHaveBeenCalled();

    expect(deadline.resume()).toBe(60);
    vi.advanceTimersByTime(59);
    expect(timedOut).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(timedOut).toHaveBeenCalledTimes(1);
  });

  it("admits only the patrol route consultation to human-wait handling", () => {
    expect(isPatrolRouteHumanWaitTool("requestPatrolRouteSelection")).toBe(
      true,
    );
    for (const toolName of [
      "focusOn",
      "highlight",
      "previewPath",
      "setLayerVisibility",
    ])
      expect(isPatrolRouteHumanWaitTool(toolName)).toBe(false);
  });
});
