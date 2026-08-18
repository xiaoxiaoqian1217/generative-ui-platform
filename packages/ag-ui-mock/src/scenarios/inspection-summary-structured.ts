import type { AGUIEvent, AGUIMock } from "@copilotkit/aimock";

export const INSPECTION_SUMMARY_STRUCTURED_MESSAGE_ID =
  "inspection-summary-structured";

/**
 * Controlled business content for Dynamic A2UI (Issue #210): a structured
 * inspection activity with no A2UI attached. The Runtime presentation policy
 * reads this activity at the stable checkpoint when the Workbench
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

const inspectionSummaryStructuredResponse: AGUIEvent[] = [
  {
    type: "RUN_STARTED",
    threadId: "inspection-summary-structured-thread",
    runId: "inspection-summary-structured-run",
  },
  {
    type: "ACTIVITY_SNAPSHOT",
    messageId: "inspection-summary-structured-activity",
    activityType: "inspection-summary",
    content: inspectionSummaryStructuredResult,
    replace: true,
  },
  {
    type: "RUN_FINISHED",
    threadId: "inspection-summary-structured-thread",
    runId: "inspection-summary-structured-run",
  },
];

export function registerInspectionSummaryStructuredScenario(
  mock: AGUIMock,
): void {
  mock.onPredicate(
    (input) =>
      /巡检摘要结构化结果|inspection summary structured/i.test(
        String(input.messages?.at(-1)?.content),
      ),
    inspectionSummaryStructuredResponse,
  );
}
