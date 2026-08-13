import type { AGUIMock } from "@copilotkit/aimock";
import { buildTextResponse } from "@copilotkit/aimock/agui";

export function registerLocateDeviceScenario(mock: AGUIMock): void {
  mock.onPredicate(
    (input) => input.messages?.at(-1)?.role === "tool",
    buildTextResponse("已定位无人机 01。"),
  );
  mock.onToolCall(
    /(?:定位|查找|locate).*(?:无人机|drone|device)?.*01/i,
    "locateDevice",
    JSON.stringify({ deviceId: "01" }),
  );
}
