import type { AGUIMock } from "@copilotkit/aimock";
import {
  buildCompositeResponse,
  buildCustomEvent,
  buildTextResponse,
} from "@copilotkit/aimock/agui";

export function registerLocateDeviceScenario(mock: AGUIMock): void {
  mock.onPredicate(
    (input) => input.messages?.at(-1)?.role === "tool",
    buildCompositeResponse([
      buildTextResponse("已定位无人机 01。"),
      buildCustomEvent("generative-ui.presentation-result", {
        mappingVersion: "1.0",
        result: {
          markdown: "已定位无人机 01。",
          mode: "markdown",
          requestId: "agui-mock-locate-device",
          status: "completed",
        },
      }),
    ]),
  );
  mock.onToolCall(
    /(?:定位|查找|locate).*(?:无人机|drone|device)?.*01/i,
    "locateDevice",
    JSON.stringify({ deviceId: "01" }),
  );
}
