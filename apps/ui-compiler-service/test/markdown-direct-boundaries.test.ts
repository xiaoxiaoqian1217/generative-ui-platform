import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const serviceRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = join(serviceRoot, "src");
const packageJson = JSON.parse(
  readFileSync(join(serviceRoot, "package.json"), "utf8"),
) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

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
  it("has no Core, UI IR, A2UI, cache, or logger runtime dependency", () => {
    const declaredDependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };
    for (const packageName of forbiddenRuntimePackages) {
      expect(declaredDependencies).not.toHaveProperty(packageName);
    }

    const productionSource = readdirSync(sourceRoot)
      .filter((name) => name.endsWith(".ts"))
      .map((name) => readFileSync(join(sourceRoot, name), "utf8"))
      .join("\n");

    for (const packageName of forbiddenRuntimePackages) {
      expect(productionSource).not.toContain(packageName);
    }
    for (const identifier of forbiddenOutOfScopeIdentifiers) {
      expect(productionSource).not.toMatch(
        new RegExp(`\\b${identifier}\\b`, "u"),
      );
    }
  });
});
