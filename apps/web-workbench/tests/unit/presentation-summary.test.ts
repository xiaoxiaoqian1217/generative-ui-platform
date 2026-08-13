import { describe, expect, it } from "vitest";
import { summarizeInspectableOutput } from "../../src/renderer/presentation-summary.js";

describe("Inspectable output summary", () => {
  it("does not expose Markdown or A2UI payloads in the default viewer", () => {
    const generativeSummary = summarizeInspectableOutput({
      requestId: "presentation-1",
      status: "completed",
      mode: "generative-ui",
      surfaceId: "surface-1",
      operations: [{ component: { type: "SensitiveCard" } }],
    });
    const markdownSummary = summarizeInspectableOutput({
      requestId: "presentation-2",
      status: "completed",
      mode: "markdown",
      markdown: "sensitive business content",
    });

    expect(generativeSummary).toMatchObject({ operationCount: 1 });
    expect(JSON.stringify(generativeSummary)).not.toContain("SensitiveCard");
    expect(markdownSummary).toMatchObject({ markdownCharacters: 26 });
    expect(JSON.stringify(markdownSummary)).not.toContain(
      "sensitive business content",
    );
  });
});
