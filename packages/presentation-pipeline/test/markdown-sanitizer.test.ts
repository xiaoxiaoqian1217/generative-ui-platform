import { fromMarkdown } from "mdast-util-from-markdown";
import { describe, expect, it } from "vitest";
import {
  createDefensiveMarkdownSanitizerLimits,
  createMarkdownSanitizer,
  DEFAULT_MARKDOWN_SANITIZER_LIMITS,
} from "../src/index.js";
import {
  dangerousHtmlCorpus,
  dangerousMarkdownFixture,
  dangerousMarkdownTokens,
  dangerousUrlCorpus,
  safeMarkdownFixture,
} from "./fixtures/markdown.js";

interface TestAstNode {
  type: string;
  children?: TestAstNode[];
  url?: string;
}

const allowedOutputNodeTypes = new Set([
  "root",
  "paragraph",
  "heading",
  "blockquote",
  "list",
  "listItem",
  "thematicBreak",
  "code",
  "definition",
  "text",
  "emphasis",
  "strong",
  "inlineCode",
  "break",
  "link",
  "linkReference",
]);

function collectAstNodes(root: TestAstNode): TestAstNode[] {
  const nodes: TestAstNode[] = [];
  const pending = [root];
  while (pending.length > 0) {
    const node = pending.pop();
    if (node === undefined) {
      continue;
    }
    nodes.push(node);
    pending.push(...(node.children ?? []));
  }
  return nodes;
}

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

  it.each(dangerousUrlCorpus)("unwraps unsafe URL %s", (url) => {
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

  it.each(dangerousHtmlCorpus)(
    "removes or escapes executable HTML variant %s",
    (html) => {
      const result = sanitizer.sanitize(
        `visible before\n\n${html}\n\nvisible after`,
        DEFAULT_MARKDOWN_SANITIZER_LIMITS,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      const nodes = collectAstNodes(
        fromMarkdown(result.markdown) as TestAstNode,
      );
      expect(nodes.some((node) => node.type === "html")).toBe(false);
      expect(result.markdown).not.toContain("attacker.example");
      expect(result.markdown).not.toContain("onclick=");
      expect(result.markdown).not.toContain("onerror=");
      expect(result.markdown).not.toContain("srcdoc=");
      expect(result.markdown).not.toContain("style=");
    },
  );

  it("preserves HTML-like text in inline and fenced code as inert code", () => {
    const input =
      "`<script>alert(1)</script>`\n\n```js\nconst value = '<iframe>';\n```";
    const result = sanitizer.sanitize(input, DEFAULT_MARKDOWN_SANITIZER_LIMITS);

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    const nodes = collectAstNodes(fromMarkdown(result.markdown) as TestAstNode);
    expect(nodes.some((node) => node.type === "html")).toBe(false);
    expect(nodes.some((node) => node.type === "inlineCode")).toBe(true);
    expect(nodes.some((node) => node.type === "code")).toBe(true);
  });

  it("removes indented code because Policy 1.0 only permits fenced code", () => {
    const result = sanitizer.sanitize(
      "visible before\n\n    const unsupported = true;\n\nvisible after",
      DEFAULT_MARKDOWN_SANITIZER_LIMITS,
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.markdown).toContain("visible before");
      expect(result.markdown).toContain("visible after");
      expect(result.markdown).not.toContain("unsupported");
      expect(result.changes).toContain("unsupported-node-removed");
    }
  });

  it("satisfies idempotence and allowlist properties across the security corpus", () => {
    const generatedCorpus = [
      safeMarkdownFixture,
      dangerousMarkdownFixture,
      ...dangerousHtmlCorpus.map(
        (html, index) => `case ${index}\n\n${html}\n\nvisible`,
      ),
      ...dangerousUrlCorpus.map((url) => `[visible](${url})`),
      ...Array.from(
        { length: 32 },
        (_, index) =>
          `${"#".repeat((index % 6) + 1)} heading ${index}\n\n` +
          `${"> ".repeat(index % 8)}**strong _nested ${index}_**\n\n` +
          `[link](https://example.com/${index}?value=${index})`,
      ),
    ];

    for (const input of generatedCorpus) {
      const first = sanitizer.sanitize(
        input,
        DEFAULT_MARKDOWN_SANITIZER_LIMITS,
      );
      expect(first.success).toBe(true);
      if (!first.success) {
        continue;
      }

      const second = sanitizer.sanitize(
        first.markdown,
        createDefensiveMarkdownSanitizerLimits(
          DEFAULT_MARKDOWN_SANITIZER_LIMITS,
        ),
      );
      expect(second.success).toBe(true);
      if (!second.success) {
        continue;
      }
      expect(second.markdown).toBe(first.markdown);

      const nodes = collectAstNodes(
        fromMarkdown(first.markdown) as TestAstNode,
      );
      expect(nodes.every((node) => allowedOutputNodeTypes.has(node.type))).toBe(
        true,
      );
      expect(
        nodes.every(
          (node) =>
            node.url === undefined ||
            /^(?:https?:|mailto:|#|\?|\.{0,2}\/)/u.test(node.url),
        ),
      ).toBe(true);
    }
  });

  it("rejects malicious deep combinations before recursive transform", () => {
    const deeplyNested = `${"> ".repeat(80)}***[visible](https://example.com)***`;
    const result = sanitizer.sanitize(deeplyNested, {
      ...DEFAULT_MARKDOWN_SANITIZER_LIMITS,
      maxAstDepth: 16,
    });

    expect(result).toMatchObject({
      success: false,
      error: {
        code: "MARKDOWN_SANITIZATION_FAILED",
        reason: "ast-limit-exceeded",
        retryable: false,
      },
    });
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
