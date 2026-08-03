import { describe, expect, it } from "vitest";
import { renderSafeMarkdown } from "../../src/renderer/markdown.js";

describe("safe Markdown renderer", () => {
  it("renders common Markdown without activating raw HTML or unsafe links", () => {
    const html = renderSafeMarkdown(
      "## Status\n\n**Ready** <script>alert(1)</script> [unsafe](javascript:alert(1))",
    );

    expect(html).toContain("<h2>Status</h2>");
    expect(html).toContain("<strong>Ready</strong>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain('href="javascript:');
    expect(
      renderSafeMarkdown("![camera](https://tracker.example/pixel.png)"),
    ).toContain("图片已阻止：camera");
    expect(
      renderSafeMarkdown("![camera](https://tracker.example/pixel.png)"),
    ).not.toContain("<img");
  });
});
