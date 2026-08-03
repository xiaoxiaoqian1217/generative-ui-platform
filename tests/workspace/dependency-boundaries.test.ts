import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
const checkerPath = join(
  repositoryRoot,
  "scripts",
  "check-dependency-boundaries.mjs",
);
const fixtureRoots: string[] = [];

interface FixtureManifest {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  name: string;
}

const prohibitedCoreDependencies = ["fastify", "openai", "react"] as const;
const coreDependencyPolicies = [
  {
    kind: "runtime",
    message:
      "UI Compiler Core runtime dependencies are limited to approved contract packages",
    section: "dependencies",
  },
  {
    kind: "development",
    message:
      "UI Compiler Core development dependencies are limited to approved tooling and contract packages",
    section: "devDependencies",
  },
] as const;

const prohibitedCoreDependencyCases = coreDependencyPolicies.flatMap((policy) =>
  prohibitedCoreDependencies.map((dependencyName) => ({
    ...policy,
    dependencyName,
  })),
);

function createFixture(manifests: Record<string, FixtureManifest>): string {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "dependency-boundaries-"));
  fixtureRoots.push(fixtureRoot);

  for (const [relativePath, manifest] of Object.entries(manifests)) {
    const manifestPath = join(fixtureRoot, relativePath, "package.json");
    mkdirSync(dirname(manifestPath), { recursive: true });
    writeFileSync(manifestPath, JSON.stringify(manifest), "utf8");
  }

  return fixtureRoot;
}

function runChecker(fixtureRoot: string) {
  return spawnSync(process.execPath, [checkerPath, "--root", fixtureRoot], {
    encoding: "utf8",
  });
}

afterEach(() => {
  for (const fixtureRoot of fixtureRoots.splice(0)) {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

describe("dependency boundary checker", () => {
  it("accepts dependencies that follow the architecture", () => {
    const fixtureRoot = createFixture({
      "apps/agent-runtime-host": {
        dependencies: {
          "@generative-ui/presentation-pipeline": "workspace:*",
        },
        name: "@generative-ui/agent-runtime-host",
      },
      "packages/ag-ui-adapter": {
        dependencies: {
          "@generative-ui/compiler-contract": "workspace:*",
          "@generative-ui/presentation-contract": "workspace:*",
          "@generative-ui/shared-types": "workspace:*",
          "@sinclair/typebox": "0.34.52",
          ajv: "8.20.0",
        },
        name: "@generative-ui/ag-ui-adapter",
      },
      "packages/compiler-contract": {
        name: "@generative-ui/compiler-contract",
      },
      "packages/presentation-contract": {
        name: "@generative-ui/presentation-contract",
      },
      "packages/presentation-pipeline": {
        dependencies: {
          "@generative-ui/presentation-contract": "workspace:*",
          "@generative-ui/ui-compiler-core": "workspace:*",
        },
        name: "@generative-ui/presentation-pipeline",
      },
      "packages/shared-types": {
        name: "@generative-ui/shared-types",
      },
      "packages/ui-compiler-core": {
        dependencies: {
          "@generative-ui/compiler-contract": "workspace:*",
        },
        name: "@generative-ui/ui-compiler-core",
      },
    });

    const result = runChecker(fixtureRoot);

    expect(result.status, result.stderr).toBe(0);
  });

  it("rejects application dependencies on other applications", () => {
    const fixtureRoot = createFixture({
      "apps/agent-runtime-host": {
        dependencies: {
          "@generative-ui/ui-compiler-service": "workspace:*",
        },
        name: "@generative-ui/agent-runtime-host",
      },
      "apps/ui-compiler-service": {
        name: "@generative-ui/ui-compiler-service",
      },
    });

    const result = runChecker(fixtureRoot);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "applications must not depend on applications",
    );
  });

  it("rejects a package dependency on an app", () => {
    const fixtureRoot = createFixture({
      "apps/ui-compiler-service": {
        name: "@generative-ui/ui-compiler-service",
      },
      "packages/compiler-contract": {
        devDependencies: {
          "@generative-ui/ui-compiler-service": "workspace:*",
        },
        name: "@generative-ui/compiler-contract",
      },
    });

    const result = runChecker(fixtureRoot);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("packages must not depend on apps");
  });

  it("rejects a Runtime Contract dependency on an implementation package", () => {
    const fixtureRoot = createFixture({
      "packages/runtime-contract": {
        dependencies: {
          "@generative-ui/ui-compiler-core": "workspace:*",
        },
        name: "@generative-ui/runtime-contract",
      },
      "packages/ui-compiler-core": {
        name: "@generative-ui/ui-compiler-core",
      },
    });

    const result = runChecker(fixtureRoot);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "contract packages must not depend on implementation packages",
    );
  });

  it("rejects a Core dependency on a protocol adapter", () => {
    const fixtureRoot = createFixture({
      "packages/ag-ui-adapter": {
        name: "@generative-ui/ag-ui-adapter",
      },
      "packages/ui-compiler-core": {
        dependencies: {
          "@generative-ui/ag-ui-adapter": "workspace:*",
        },
        name: "@generative-ui/ui-compiler-core",
      },
    });

    const result = runChecker(fixtureRoot);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "UI Compiler Core must not depend on protocol adapters",
    );
  });

  it.each(prohibitedCoreDependencyCases)(
    "rejects a Core $kind dependency on $dependencyName",
    ({ dependencyName, message, section }) => {
      const manifest: FixtureManifest = {
        name: "@generative-ui/ui-compiler-core",
      };
      manifest[section] = {
        [dependencyName]: "1.0.0",
      };
      const fixtureRoot = createFixture({
        "packages/ui-compiler-core": manifest,
      });

      const result = runChecker(fixtureRoot);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain(message);
    },
  );

  it("rejects an AG-UI Adapter dependency on Core", () => {
    const fixtureRoot = createFixture({
      "packages/ag-ui-adapter": {
        dependencies: {
          "@generative-ui/ui-compiler-core": "workspace:*",
        },
        name: "@generative-ui/ag-ui-adapter",
      },
      "packages/ui-compiler-core": {
        name: "@generative-ui/ui-compiler-core",
      },
    });

    const result = runChecker(fixtureRoot);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "AG-UI Adapter runtime dependencies are limited to approved contract and Schema packages",
    );
  });

  it.each(["openai", "@langchain/langgraph", "react"])(
    "rejects a Presentation Pipeline dependency on %s",
    (dependencyName) => {
      const fixtureRoot = createFixture({
        "packages/presentation-pipeline": {
          dependencies: { [dependencyName]: "1.0.0" },
          name: "@generative-ui/presentation-pipeline",
        },
      });

      const result = runChecker(fixtureRoot);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain(
        "Presentation Pipeline runtime dependencies are limited to approved Compiler packages and Markdown tooling",
      );
    },
  );

  it.each(["@ag-ui/core", "fastify"])(
    "rejects an AG-UI Adapter runtime dependency on %s",
    (dependencyName) => {
      const fixtureRoot = createFixture({
        "packages/ag-ui-adapter": {
          dependencies: {
            [dependencyName]: "1.0.0",
          },
          name: "@generative-ui/ag-ui-adapter",
        },
      });

      const result = runChecker(fixtureRoot);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain(
        "AG-UI Adapter runtime dependencies are limited to approved contract and Schema packages",
      );
    },
  );
});
