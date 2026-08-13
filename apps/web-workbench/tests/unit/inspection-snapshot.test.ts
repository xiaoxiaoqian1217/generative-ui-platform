import { describe, expect, it } from "vitest";
import { createInspectionSnapshot } from "../../src/inspect/inspection-snapshot.js";

describe("Inspection snapshot", () => {
  it("stores correlation and counts without business message content", () => {
    const snapshot = createInspectionSnapshot({
      requestId: "request",
      threadId: "thread",
      runId: "run",
      messages: [
        { id: "assistant", role: "assistant", content: "secret result" },
      ],
    });
    expect(snapshot).toMatchObject({
      requestId: "request",
      outputKind: "ag-ui-messages",
      assistantMessageCount: 1,
    });
    expect(JSON.stringify(snapshot)).not.toContain("secret result");
  });
});
