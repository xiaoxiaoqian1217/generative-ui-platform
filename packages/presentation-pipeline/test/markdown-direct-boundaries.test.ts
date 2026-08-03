import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const serviceRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = join(serviceRoot, "src");
const forbiddenRuntimePackages = [
  "@generative-ui/ui-compiler-core",
  "@generative-ui/ag-ui-adapter",
] as const;

const forbiddenOutOfScopeIdentifiers = [
  "compileUI",
  "compileA2UI",
  "lowerToUIIR",
  "serializeA2UI",
  "cache",
  "logger",
  "logContent",
] as const;

describe("Direct presentation path dependency boundaries", () => {
  it("keeps direct paths free of Core, UI IR, A2UI, cache, and logger imports", () => {
    const directPathSource = readdirSync(sourceRoot)
      .filter((name) =>
        [
          "markdown-presentation-service.ts",
          "markdown-sanitizer-definition-aware.ts",
          "markdown-sanitizer.ts",
          "presentation-router.ts",
          "safe-markdown-presentation.ts",
          "structured-data-presentation-service.ts",
          "structured-data-serializer.ts",
          "structured-data-validator.ts",
        ].includes(name),
      )
      .map((name) => readFileSync(join(sourceRoot, name), "utf8"))
      .join("\n");

    for (const packageName of forbiddenRuntimePackages) {
      expect(directPathSource).not.toContain(packageName);
    }
    for (const identifier of forbiddenOutOfScopeIdentifiers) {
      expect(directPathSource).not.toMatch(
        new RegExp(`\\b${identifier}\\b`, "u"),
      );
    }
  });
});
