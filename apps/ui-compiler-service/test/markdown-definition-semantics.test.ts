import { fromMarkdown } from "mdast-util-from-markdown";
import { describe, expect, it } from "vitest";
import {
  createMarkdownSanitizer,
  DEFAULT_MARKDOWN_SANITIZER_LIMITS,
} from "../src/main.js";
import { blankRangesPreservingLines } from "../src/markdown-sanitizer-definition-aware.js";

interface TestAstNode {
  children?: TestAstNode[];
}

function countAstNodes(markdown: string): number {
  const pending: TestAstNode[] = [fromMarkdown(markdown) as TestAstNode];
  let count = 0;
  while (pending.length > 0) {
    const node = pending.pop();
    if (node === undefined) {
      continue;
    }
    count += 1;
    pending.push(...(node.children ?? []));
  }
  return count;
}

describe("Markdown reference definition semantics", () => {
  const sanitizer = createMarkdownSanitizer();

  it("keeps the first safe definition when identifiers repeat", () => {
    const result = sanitizer.sanitize(
      `[文档][id]

[id]: https://first.example
[id]: https://second.example
`,
      DEFAULT_MARKDOWN_SANITIZER_LIMITS,
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.markdown).toContain("[文档][id]");
      expect(result.markdown).toContain("[id]: https://first.example");
      expect(result.markdown).not.toContain("second.example");
    }
  });

  it("does not let a later safe definition replace an unsafe first definition", () => {
    const result = sanitizer.sanitize(
      `[文档][id]

[id]: javascript:alert(1)
[id]: https://safe.example
`,
      DEFAULT_MARKDOWN_SANITIZER_LIMITS,
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.markdown).toBe("文档\n");
      expect(result.markdown).not.toContain("safe.example");
      expect(result.changes).toContain("unsafe-link-unwrapped");
    }
  });

  it("collects a first definition nested inside a block container", () => {
    const result = sanitizer.sanitize(
      `[文档][id]

> [id]: https://nested.example
`,
      DEFAULT_MARKDOWN_SANITIZER_LIMITS,
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.markdown).toContain("[文档][id]");
      expect(result.markdown).toContain("[id]: https://nested.example");
      expect(result.changes).not.toContain("unsafe-link-unwrapped");
    }
  });

  it("does not consume caller AST budget when lifting a nested definition", () => {
    const input = `[文档][id]

> [id]: https://nested.example
`;
    const result = sanitizer.sanitize(input, {
      ...DEFAULT_MARKDOWN_SANITIZER_LIMITS,
      maxAstNodes: countAstNodes(input),
    });

    expect(result.success).toBe(true);
  });

  it(
    "rewrites near-limit duplicate ranges in bounded time",
    () => {
      const prefix = "[id]: /a\n";
      const duplicate = "[id]: /b\n";
      const duplicateCount = 19_000;
      const input = `${prefix}${duplicate.repeat(duplicateCount)}`;
      const ranges = Array.from({ length: duplicateCount }, (_, index) => {
        const start = prefix.length + index * duplicate.length;
        return { start, end: start + duplicate.length };
      });

      expect(Buffer.byteLength(input, "utf8")).toBeLessThanOrEqual(
        DEFAULT_MARKDOWN_SANITIZER_LIMITS.maxInputBytes,
      );

      const startedAt = performance.now();
      const output = blankRangesPreservingLines(input, ranges);
      const elapsedMilliseconds = performance.now() - startedAt;

      expect(output).toBeDefined();
      expect(output).toHaveLength(input.length);
      expect(output).toContain("[id]: /a");
      expect(output).not.toContain("[id]: /b");
      expect(elapsedMilliseconds).toBeLessThan(1_000);
    },
    2_000,
  );
});
