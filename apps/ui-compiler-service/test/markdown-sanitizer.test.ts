import { describe, expect, it } from "vitest";
import {
  createDefensiveMarkdownSanitizerLimits,
  createMarkdownSanitizer,
  DEFAULT_MARKDOWN_SANITIZER_LIMITS,
} from "../src/main.js";
import {
  dangerousMarkdownFixture,
  dangerousMarkdownTokens,
  safeMarkdownFixture,
} from "./fixtures/markdown.js";

describe("MarkdownSanitizer", () => {
  const sanitizer = createMarkdownSanitizer();

  it("preserves supported CommonMark and is idempotent", () => {
    const first = sanitizer.sanitize(
      safeMarkdownFixture,
      DEFAULT_MARKDOWN_SANITIZER_LIMITS,
    );

    expect(first.success).toBe(true);
    if (!first.success) {
      return;
    }

    expect(first.markdown).toContain("# 发布状态");
    expect(first.markdown).toContain("[查看文档](https://example.com/docs)");
    expect(first.markdown).toContain('const status = "ready";');

    const second = sanitizer.sanitize(
      first.markdown,
      createDefensiveMarkdownSanitizerLimits(DEFAULT_MARKDOWN_SANITIZER_LIMITS),
    );

    expect(second.success).toBe(true);
    if (second.success) {
      expect(second.markdown).toBe(first.markdown);
    }
  });

  it("removes dangerous HTML and URLs and replaces images with alt text", () => {
    const result = sanitizer.sanitize(
      dangerousMarkdownFixture,
      DEFAULT_MARKDOWN_SANITIZER_LIMITS,
    );

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    for (const token of dangerousMarkdownTokens) {
      expect(result.markdown).not.toContain(token);
    }
    expect(result.markdown).toContain("危险链接");
    expect(result.markdown).toContain("编码危险链接");
    expect(result.markdown).toContain("跟踪图片");
    expect(result.markdown).toContain("安全说明仍然保留。");
    expect(result.changes).toEqual(
      expect.arrayContaining([
        "html-removed",
        "image-replaced-with-alt-text",
        "unsafe-link-unwrapped",
      ]),
    );

    const second = sanitizer.sanitize(
      result.markdown,
      createDefensiveMarkdownSanitizerLimits(DEFAULT_MARKDOWN_SANITIZER_LIMITS),
    );
    expect(second.success).toBe(true);
    if (second.success) {
      expect(second.markdown).toBe(result.markdown);
    }
  });

  it.each([
    "https://example.com/path",
    "http://example.com/path",
    "mailto:security@example.com",
    "#section",
    "?page=2",
    "./relative/path",
    "../parent/path",
  ])("preserves allowed URL %s", (url) => {
    const result = sanitizer.sanitize(
      `[可见文本](${url})`,
      DEFAULT_MARKDOWN_SANITIZER_LIMITS,
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.markdown).toContain(`[可见文本](${url})`);
      expect(result.changes).not.toContain("unsafe-link-unwrapped");
    }
  });

  it("keeps safe reference links and unwraps unsafe reference links", () => {
    const result = sanitizer.sanitize(
      `[安全][safe] 和 [危险][unsafe]

[safe]: https://example.com "文档"
[unsafe]: javascript:alert(1)
`,
      DEFAULT_MARKDOWN_SANITIZER_LIMITS,
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.markdown).toContain("[安全][safe]");
      expect(result.markdown).toContain('[safe]: https://example.com "文档"');
      expect(result.markdown).toContain("和 危险");
      expect(result.markdown).not.toContain("[unsafe]");
      expect(result.markdown).not.toContain("javascript");
    }
  });

  it("keeps one safe code language and removes code metadata", () => {
    const result = sanitizer.sanitize(
      "```ts title=unsafe\nconst ready = true;\n```",
      DEFAULT_MARKDOWN_SANITIZER_LIMITS,
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.markdown).toBe("```ts\nconst ready = true;\n```\n");
      expect(result.changes).toContain("code-info-normalized");
    }
  });

  it.each([
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "javascript%3Aalert%281%29",
    "vbscript:msgbox(1)",
    "data:text/html;base64,PHNjcmlwdD4=",
    "file:///etc/passwd",
    "blob:https://example.com/id",
    "filesystem:https://example.com/path",
    "custom-protocol:value",
    "//attacker.example/path",
    "%2F%2Fattacker.example/path",
    "\\\\attacker.example\\path",
    "https:%5C%5Cattacker.example/path",
  ])("unwraps unsafe URL %s", (url) => {
    const result = sanitizer.sanitize(
      `[可见文本](${url})`,
      DEFAULT_MARKDOWN_SANITIZER_LIMITS,
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.markdown).toBe("可见文本\n");
      expect(result.changes).toContain("unsafe-link-unwrapped");
    }
  });

  it("returns stable failures for input, AST, output, and empty limits", () => {
    const inputFailure = sanitizer.sanitize("内容", {
      ...DEFAULT_MARKDOWN_SANITIZER_LIMITS,
      maxInputBytes: 1,
    });
    const astFailure = sanitizer.sanitize("- 一\n- 二", {
      ...DEFAULT_MARKDOWN_SANITIZER_LIMITS,
      maxAstNodes: 2,
    });
    const outputFailure = sanitizer.sanitize("需要转义的 < 文本", {
      ...DEFAULT_MARKDOWN_SANITIZER_LIMITS,
      maxOutputBytes: 1,
    });
    const emptyFailure = sanitizer.sanitize("<script>x</script>", {
      ...DEFAULT_MARKDOWN_SANITIZER_LIMITS,
    });

    expect(inputFailure).toMatchObject({
      success: false,
      error: {
        code: "MARKDOWN_SANITIZATION_FAILED",
        reason: "input-limit-exceeded",
        retryable: false,
      },
    });
    expect(astFailure).toMatchObject({
      success: false,
      error: { reason: "ast-limit-exceeded" },
    });
    expect(outputFailure).toMatchObject({
      success: false,
      error: { reason: "output-limit-exceeded" },
    });
    expect(emptyFailure).toMatchObject({
      success: false,
      error: { reason: "empty-after-sanitization" },
    });
  });
});
