import type { UICompileRequest } from "@generative-ui/compiler-contract";
import { describe, expect, it } from "vitest";
import { compileUI } from "../src/index.js";

const catalog = {
  catalogId: "base",
  catalogVersion: "0.1.0",
  components: [
    {
      type: "Markdown",
      description: "Renders sanitized Markdown",
      propsSchema: {},
    },
  ],
};

describe("compileUI", () => {
  it("creates a controlled Markdown surface", async () => {
    const result = await compileUI(
      {
        requestId: "req-1",
        presentation: { contentType: "markdown", content: "# Hello" },
        catalog: { catalogId: "base", catalogVersion: "0.1.0" },
      },
      { catalog },
    );
    expect(result.success).toBe(true);
    expect(result.degraded).toBe(false);
    if (result.success && !result.degraded) {
      expect(result.operations[0]?.type).toBe("createSurface");
    }
  });

  it("returns a valid degraded result when the catalog cannot render Markdown", async () => {
    const result = await compileUI(
      {
        requestId: "req-2",
        presentation: { contentType: "markdown", content: "# Hello" },
        catalog: { catalogId: "empty", catalogVersion: "0.1.0" },
      },
      {
        catalog: {
          catalogId: "empty",
          catalogVersion: "0.1.0",
          components: [
            { type: "Text", description: "Renders text", propsSchema: {} },
          ],
        },
      },
    );

    expect(result.success).toBe(true);
    expect(result.degraded).toBe(true);
    if (result.degraded) {
      expect(result.fallback.type).toBe("markdown");
      expect(result.errors[0]?.stage).toBe("component-selection");
    }
  });

  it("returns a complete failure for malformed runtime input", async () => {
    const result = await compileUI({} as UICompileRequest, { catalog });

    expect(result.success).toBe(false);
    expect(result.degraded).toBe(false);
    if (!result.success) {
      expect(result.errors[0]?.stage).toBe("input-validation");
    }
  });
});
