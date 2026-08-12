import { EventType, type ToolMessage } from "@ag-ui/core";
import type { AgUiMockScenario } from "./types.js";
import { runBoundaryEvents, textEvents } from "./types.js";

function hasLocateDeviceResult(
  messages: readonly unknown[],
  toolCallId: string,
): boolean {
  return messages.some(
    (message) =>
      (message as Partial<ToolMessage>).role === "tool" &&
      (message as Partial<ToolMessage>).toolCallId === toolCallId,
  );
}

export const locateDeviceScenario: AgUiMockScenario = {
  description:
    "Calls locateDevice for Drone 01, then confirms the browser tool result.",
  name: "locate-device",
  events(input) {
    const latestUserMessage = [...input.messages]
      .reverse()
      .find((message) => message.role === "user");
    const toolCallId = `locate-device-${latestUserMessage?.id ?? input.runId}`;
    if (hasLocateDeviceResult(input.messages, toolCallId)) {
      return textEvents(input, "已定位无人机 01");
    }
    return runBoundaryEvents(input, [
      {
        type: EventType.TOOL_CALL_START,
        parentMessageId: `message-${input.runId}`,
        toolCallId,
        toolCallName: "locateDevice",
      },
      {
        type: EventType.TOOL_CALL_ARGS,
        delta: JSON.stringify({ deviceId: "01" }),
        toolCallId,
      },
      { type: EventType.TOOL_CALL_END, toolCallId },
    ]);
  },
};
