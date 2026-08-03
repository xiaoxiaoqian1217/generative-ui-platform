import { beforeEach, describe, expect, it, vi } from "vitest";

const syntaxState = vi.hoisted(() => ({
  mode: "parse-failure" as "parse-failure" | "serialize-failure",
}));

vi.mock("mdast-util-from-markdown", () => ({
  fromMarkdown() {
    if (syntaxState.mode === "parse-failure") {
      throw new Error("parser leaked SECRET");
    }
    return {
      type: "root",
      children: [
        {
          type: "paragraph",
          children: [{ type: "text", value: "safe content" }],
        },
      ],
    };
  },
}));

vi.mock("mdast-util-to-markdown", () => ({
  toMarkdown() {
    throw new Error("serializer leaked SECRET");
  },
}));

import {
  createMarkdownSanitizer,
  DEFAULT_MARKDOWN_SANITIZER_LIMITS,
} from "../src/markdown-sanitizer.js";

describe("MarkdownSanitizer syntax failure mapping", () => {
  beforeEach(() => {
    syntaxState.mode = "parse-failure";
  });

  it("maps parser exceptions without leaking input or library errors", () => {
    const result = createMarkdownSanitizer().sanitize(
      "SECRET <script>alert(1)</script>",
      DEFAULT_MARKDOWN_SANITIZER_LIMITS,
    );

    expect(result).toEqual({
      success: false,
      error: {
        code: "MARKDOWN_SANITIZATION_FAILED",
        reason: "parse-failed",
        retryable: false,
      },
    });
    expect(JSON.stringify(result)).not.toContain("SECRET");
    expect(JSON.stringify(result)).not.toContain("parser leaked");
  });

  it("maps serializer exceptions without leaking input or library errors", () => {
    syntaxState.mode = "serialize-failure";

    const result = createMarkdownSanitizer().sanitize(
      "SECRET <script>alert(1)</script>",
      DEFAULT_MARKDOWN_SANITIZER_LIMITS,
    );

    expect(result).toEqual({
      success: false,
      error: {
        code: "MARKDOWN_SANITIZATION_FAILED",
        reason: "serialize-failed",
        retryable: false,
      },
    });
    expect(JSON.stringify(result)).not.toContain("SECRET");
    expect(JSON.stringify(result)).not.toContain("serializer leaked");
  });
});
