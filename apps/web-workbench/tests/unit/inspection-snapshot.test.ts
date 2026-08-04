import { describe, expect, it } from "vitest";
import { createInspectionSnapshot } from "../../src/inspect/inspection-snapshot.js";

describe("Inspection snapshot", () => {
  it("preserves diagnostics but excludes business and provider payloads", () => {
    const result = {
      protocolVersion: "1.0" as const,
      requestId: "request",
      threadId: "thread",
      runId: "run",
      presentationRequestId: "presentation",
      status: "completed" as const,
      presentation: {
        requestId: "presentation",
        status: "completed" as const,
        mode: "markdown" as const,
        markdown: "secret business result",
      },
      diagnostics: {
        stages: [
          {
            name: "business-agent" as const,
            status: "completed" as const,
            durationMs: 4,
          },
        ],
        degradationReasonCode: "SAFE_FALLBACK",
      },
    };
    const snapshot = createInspectionSnapshot(result);
    expect(snapshot).toMatchObject({
      requestId: "request",
      presentationMode: "markdown",
      degradationReasonCode: "SAFE_FALLBACK",
    });
    expect(JSON.stringify(snapshot)).not.toContain("secret business result");
  });
});
