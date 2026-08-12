import { EventType, type ToolMessage } from "@ag-ui/core";
import type { AgUiMockScenario } from "./types.js";
import { runBoundaryEvents, textEvents } from "./types.js";

const TOOL_CALL_ID = "locate-device-01";

function hasLocateDeviceResult(messages: readonly unknown[]): boolean {
  return messages.some(
    (message) =>
      (message as Partial<ToolMessage>).role === "tool" &&
      (message as Partial<ToolMessage>).toolCallId === TOOL_CALL_ID,
  );
}

export const locateDeviceScenario: AgUiMockScenario = {
  description:
    "Calls locateDevice for Drone 01, then confirms the browser tool result.",
  name: "locate-device",
  events(input) {
    if (hasLocateDeviceResult(input.messages)) {
      return textEvents(input, "已定位无人机 01");
    }
    return runBoundaryEvents(input, [
      {
        type: EventType.TOOL_CALL_START,
        parentMessageId: `message-${input.runId}`,
        toolCallId: TOOL_CALL_ID,
        toolCallName: "locateDevice",
      },
      {
        type: EventType.TOOL_CALL_ARGS,
        delta: JSON.stringify({ deviceId: "01" }),
        toolCallId: TOOL_CALL_ID,
      },
      { type: EventType.TOOL_CALL_END, toolCallId: TOOL_CALL_ID },
    ]);
  },
};
