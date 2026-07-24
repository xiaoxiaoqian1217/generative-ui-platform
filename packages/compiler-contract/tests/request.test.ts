import { describe, expect, it } from "vitest";
import { uiCompileRequestSchema } from "../src/index.js";

describe("uiCompileRequestSchema", () => {
  it("rejects the legacy Interaction Gateway source type", () => {
    const parsed = uiCompileRequestSchema.safeParse({
      requestId: "req-gateway",
      source: {
        sourceType: "interaction-gateway",
      },
      presentation: {
        contentType: "markdown",
        content: "# Legacy source",
      },
      catalog: {
        catalogId: "base",
        catalogVersion: "0.1.0",
      },
    });

    expect(parsed.success).toBe(false);
  });
});
