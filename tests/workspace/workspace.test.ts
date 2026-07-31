import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));

const applications = [
  {
    name: "@generative-ui/agent-runtime-host",
    path: "apps/agent-runtime-host",
  },
  {
    name: "@generative-ui/ui-compiler-service",
    path: "apps/ui-compiler-service",
  },
] as const;
const packages = [
  {
    name: "@generative-ui/ag-ui-adapter",
    path: "packages/ag-ui-adapter",
  },
  {
    name: "@generative-ui/compiler-contract",
    path: "packages/compiler-contract",
  },
  {
    name: "@generative-ui/component-catalog-schema",
    path: "packages/component-catalog-schema",
  },
  {
    name: "@generative-ui/presentation-contract",
    path: "packages/presentation-contract",
  },
  {
    name: "@generative-ui/shared-types",
    path: "packages/shared-types",
  },
  {
    name: "@generative-ui/ui-compiler-core",
    path: "packages/ui-compiler-core",
  },
] as const;

const forbiddenPaths = [
  "apps/agent-runtime-host",
  "apps/interaction-gateway",
  "packages/component-registry",
  "packages/frontend-runtime",
] as const;

// Explicitly declared applications override historical MVP exclusions when a
// scoped architecture decision intentionally introduces one of them.
const activeForbiddenPaths = forbiddenPaths.filter(
  (relativePath) =>
    !applications.some((application) => application.path === relativePath),
);

interface PackageManifest {
  name?: string;
  scripts?: Record<string, string>;
  exports?: Record<string, unknown>;
  type?: string;
}

function readManifest(relativePath: string): PackageManifest {
  return JSON.parse(
    readFileSync(join(repositoryRoot, relativePath, "package.json"), "utf8"),
  ) as PackageManifest;
}

describe("workspace contract", () => {
  it("contains two applications and six shared packages", () => {
    expect(applications).toHaveLength(2);
    expect(packages).toHaveLength(6);

    for (const project of [...applications, ...packages]) {
      expect(
        existsSync(join(repositoryRoot, project.path, "package.json")),
        `${project.path} must have a package manifest`,
      ).toBe(true);
      expect(readManifest(project.path)).toMatchObject({
        name: project.name,
        type: "module",
      });
    }
  });

  it("gives every module build, typecheck, and test commands", () => {
    for (const project of [...applications, ...packages]) {
      const manifest = readManifest(project.path);

      expect(manifest.scripts).toMatchObject({
        build: expect.any(String),
        test: expect.any(String),
        typecheck: expect.any(String),
      });
    }
  });

  it("exposes only the stable root entry from shared packages", () => {
    for (const project of packages) {
      const manifest = readManifest(project.path);

      expect(Object.keys(manifest.exports ?? {})).toEqual(["."]);
      expect(manifest.exports?.["."]).toEqual({
        types: "./dist/index.d.ts",
        import: "./dist/index.js",
      });
    }
  });

  it("does not create systems excluded from the MVP", () => {
    for (const relativePath of activeForbiddenPaths) {
      expect(existsSync(join(repositoryRoot, relativePath))).toBe(false);
    }
  });
});
