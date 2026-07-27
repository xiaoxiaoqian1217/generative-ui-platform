import { describe, expect, it } from "vitest";
import { uiCompileRequestSchema } from "../src/index.js";

describe("uiCompileRequestSchema", () => {
  it("accepts the UI Compiler Service source type", () => {
    const parsed = uiCompileRequestSchema.safeParse({
      requestId: "req-service",
      source: {
        sourceType: "ui-compiler-service",
      },
      presentation: {
        contentType: "markdown",
        content: "# Service source",
      },
      catalog: {
        catalogId: "base",
        catalogVersion: "0.1.0",
      },
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects the legacy UI Compiler Agent source type", () => {
    const parsed = uiCompileRequestSchema.safeParse({
      requestId: "req-agent",
      source: {
        sourceType: "ui-compiler-agent",
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
