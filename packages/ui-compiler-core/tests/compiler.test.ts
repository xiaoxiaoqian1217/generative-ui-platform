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
    expect(result.operations?.[0]?.type).toBe("createSurface");
  });
});
