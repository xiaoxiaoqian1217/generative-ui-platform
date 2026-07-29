import { fromMarkdown } from "mdast-util-from-markdown";
import { describe, expect, it } from "vitest";
import {
  createMarkdownSanitizer,
  DEFAULT_MARKDOWN_SANITIZER_LIMITS,
} from "../src/main.js";

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
    "processes near-limit duplicate definitions in bounded time",
    () => {
      const input = `[文档][id]

[id]: /a
${"[id]: /b\n".repeat(19_000)}`;
      expect(Buffer.byteLength(input, "utf8")).toBeLessThanOrEqual(
        DEFAULT_MARKDOWN_SANITIZER_LIMITS.maxInputBytes,
      );
      expect(countAstNodes(input)).toBeLessThanOrEqual(
        DEFAULT_MARKDOWN_SANITIZER_LIMITS.maxAstNodes,
      );

      const result = sanitizer.sanitize(
        input,
        DEFAULT_MARKDOWN_SANITIZER_LIMITS,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.markdown).toContain("[id]: /a");
        expect(result.markdown).not.toContain("[id]: /b");
      }
    },
    5_000,
  );
});
