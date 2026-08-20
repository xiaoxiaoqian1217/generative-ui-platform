import type { AGUIMock } from "@copilotkit/aimock";
import {
  buildTextResponse,
  buildToolCallResponse,
} from "@copilotkit/aimock/agui";
import {
  acknowledgeToolResult,
  completedMapOperationResult,
  hasCompletedToolResult,
} from "./tool-result.js";

const DEVICE_TARGET = { featureId: "01", layerId: "devices" } as const;

export function registerLocateDeviceScenario(mock: AGUIMock): void {
  const expectation = { affectedFeatureIds: [DEVICE_TARGET.featureId] };
  const result = completedMapOperationResult(expectation);
  const focusEvents = buildToolCallResponse(
    "focusOn",
    JSON.stringify({ target: DEVICE_TARGET }),
  );
  const highlightEvents = acknowledgeToolResult(
    buildToolCallResponse(
      "highlight",
      JSON.stringify({ targets: [DEVICE_TARGET] }),
    ),
    focusEvents,
    result,
  );
  const finalEvents = acknowledgeToolResult(
    buildTextResponse("已定位无人机 01。"),
    highlightEvents,
    result,
  );

  mock.onPredicate(
    (input) => hasCompletedToolResult(input, "highlight", expectation),
    finalEvents,
  );
  mock.onPredicate(
    (input) => hasCompletedToolResult(input, "focusOn", expectation),
    highlightEvents,
  );
  mock.onRun(
    /(?:定位|查找|locate).*(?:无人机|drone|device)?.*01/i,
    focusEvents,
  );
}
