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

export const FRONTEND_TOOL_TIMEOUT_MESSAGE = "验证 focusOn 超时边界";

export function registerFrontendToolTimeoutScenario(mock: AGUIMock): void {
  const expectation = { affectedFeatureIds: ["north-corridor"] };
  const focusCall = buildToolCallResponse(
    "focusOn",
    JSON.stringify({
      target: {
        featureId: "north-corridor",
        layerId: "operational-areas",
      },
    }),
  );
  mock.onPredicate(
    (input) =>
      input.messages?.some(
        (message) =>
          message.role === "user" &&
          message.content === FRONTEND_TOOL_TIMEOUT_MESSAGE,
      ) === true && hasCompletedToolResult(input, "focusOn", expectation),
    acknowledgeToolResult(
      buildTextResponse("focusOn continuation completed."),
      focusCall,
      completedMapOperationResult(expectation),
    ),
  );
  mock.onRun(FRONTEND_TOOL_TIMEOUT_MESSAGE, focusCall);
}
