import { describe, expect, it } from "vitest";
import {
  createMarkdownSanitizer,
  DEFAULT_MARKDOWN_SANITIZER_LIMITS,
} from "../src/main.js";

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
});
