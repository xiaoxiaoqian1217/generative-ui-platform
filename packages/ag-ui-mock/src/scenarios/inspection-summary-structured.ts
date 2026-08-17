import type { AGUIMock } from "@copilotkit/aimock";
import { buildTextResponse } from "@copilotkit/aimock/agui";

export const INSPECTION_SUMMARY_STRUCTURED_MESSAGE_ID =
  "inspection-summary-structured";

/**
 * Controlled business content for Dynamic A2UI (Issue #210): a structured
 * inspection result with no UI attached. The Runtime presentation policy
 * intercepts this content at the stable checkpoint when the Workbench
 * scenario requests `requestedMode: "dynamic"` via forwardedProps.
 */
export const inspectionSummaryStructuredResult = {
  contentType: "inspection-summary",
  schemaVersion: "1",
  payload: {
    status: "completed",
    totalDevices: 5,
    okDevices: 4,
    errorDevices: 1,
    completionRate: 1.0,
    startedAt: "14:20",
    durationMinutes: 12,
    area: "A 区",
  },
} as const;

export function registerInspectionSummaryStructuredScenario(
  mock: AGUIMock,
): void {
  mock.onPredicate(
    (input) =>
      /巡检摘要结构化结果|inspection summary structured/i.test(
        String(input.messages?.at(-1)?.content),
      ),
    buildTextResponse(
      JSON.stringify(inspectionSummaryStructuredResult, null, 2),
    ),
  );
}
