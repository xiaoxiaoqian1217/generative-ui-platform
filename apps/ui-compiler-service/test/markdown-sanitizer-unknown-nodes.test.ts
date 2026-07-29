import { describe, expect, it, vi } from "vitest";

vi.mock("mdast-util-from-markdown", () => ({
  fromMarkdown() {
    return {
      type: "root",
      children: [
        {
          type: "paragraph",
          children: [{ type: "text", value: "visible before" }],
        },
        {
          type: "unknownWrapper",
          children: [
            {
              type: "paragraph",
              children: [{ type: "text", value: "safe wrapped text" }],
            },
          ],
        },
        {
          type: "dangerousExtension",
          value: "<script>alert(1)</script>",
          url: "javascript:alert(1)",
          attributes: { onerror: "alert(1)" },
        },
        {
          type: "paragraph",
          children: [{ type: "text", value: "visible after" }],
        },
      ],
    };
  },
}));

import {
  createMarkdownSanitizer,
  DEFAULT_MARKDOWN_SANITIZER_LIMITS,
} from "../src/markdown-sanitizer.js";

describe("MarkdownSanitizer unknown AST nodes", () => {
  it("unwraps safe wrappers and removes nodes with untrusted properties", () => {
    const result = createMarkdownSanitizer().sanitize(
      "input replaced by the controlled parser mock",
      DEFAULT_MARKDOWN_SANITIZER_LIMITS,
    );

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.markdown).toContain("visible before");
    expect(result.markdown).toContain("safe wrapped text");
    expect(result.markdown).toContain("visible after");
    expect(result.markdown).not.toContain("script");
    expect(result.markdown).not.toContain("javascript");
    expect(result.markdown).not.toContain("onerror");
    expect(result.changes).toEqual(
      expect.arrayContaining([
        "unsupported-node-unwrapped",
        "unsupported-node-removed",
      ]),
    );
  });
});
