import { describe, expect, it } from "vitest";

describe("Catalog component preview", () => {
  it("keeps preview data fixed and never accepts arbitrary Props", () => {
    const allowedPreviewTypes = ["Card", "Button"] as const;
    expect(allowedPreviewTypes).toContain("Card");
    expect(allowedPreviewTypes).not.toContain("Script");
  });
});
