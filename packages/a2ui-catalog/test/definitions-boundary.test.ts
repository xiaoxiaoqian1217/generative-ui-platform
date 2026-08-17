import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * ADR-0030 / Issue #210: Platform Catalog definitions 必须保持框架无关,
 * 只依赖 zod 与 `@a2ui/web_core`, 不承载 implementations / SFC。
 */
describe("platform catalog definition import boundary", () => {
  it("definitions only import zod, @a2ui/web_core, and intra-directory modules", () => {
    const definitionsDir = join(process.cwd(), "src/definitions");
    const files = readdirSync(definitionsDir).filter((file) =>
      file.endsWith(".ts"),
    );
    expect(files.length).toBeGreaterThan(0);

    const importPattern = /(?:import|export)\s[^"']*?from\s+["']([^"']+)["']/g;
    for (const file of files) {
      const source = readFileSync(join(definitionsDir, file), "utf8");
      const specifiers = [...source.matchAll(importPattern)].map(
        (match) => match[1] ?? "",
      );
      for (const specifier of specifiers) {
        if (specifier.startsWith(".")) continue;
        expect(
          specifier === "zod" || specifier.startsWith("@a2ui/web_core"),
          `${file} must not import ${specifier}`,
        ).toBe(true);
      }
    }
  });
});
