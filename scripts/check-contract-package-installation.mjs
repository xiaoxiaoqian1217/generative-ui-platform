import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporaryRoot = mkdtempSync(
  join(tmpdir(), "generative-ui-contract-packages-"),
);
const bundledCorepackCli = join(
  dirname(process.execPath),
  "node_modules",
  "corepack",
  "dist",
  "corepack.js",
);
const packageManagerCli = process.env.npm_execpath ?? bundledCorepackCli;
const packageManagerArguments =
  process.env.npm_execpath === undefined ? ["pnpm"] : [];

if (!existsSync(packageManagerCli)) {
  throw new Error("Unable to locate the pnpm or Corepack CLI.");
}

function runPnpm(arguments_, workingDirectory) {
  return execFileSync(
    process.execPath,
    [packageManagerCli, ...packageManagerArguments, ...arguments_],
    {
      cwd: workingDirectory,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
}

function packPackage(packageDirectory, tarballDirectory) {
  const existingTarballs = new Set(readdirSync(tarballDirectory));
  runPnpm(["pack", "--pack-destination", tarballDirectory], packageDirectory);
  const createdTarballs = readdirSync(tarballDirectory).filter(
    (fileName) => fileName.endsWith(".tgz") && !existingTarballs.has(fileName),
  );

  if (createdTarballs.length !== 1) {
    throw new Error(
      `Expected one tarball for ${packageDirectory}, received ${createdTarballs.length}.`,
    );
  }

  return join(tarballDirectory, createdTarballs[0]);
}

function asFileDependency(filePath) {
  return pathToFileURL(filePath).href;
}

try {
  const tarballDirectory = join(temporaryRoot, "tarballs");
  const consumerDirectory = join(temporaryRoot, "consumer");
  mkdirSync(tarballDirectory);
  mkdirSync(consumerDirectory);

  const packageDirectories = [
    "shared-types",
    "presentation-contract",
    "component-catalog-schema",
  ].map((packageName) => join(repositoryRoot, "packages", packageName));

  const tarballs = packageDirectories.map((packageDirectory) =>
    packPackage(packageDirectory, tarballDirectory),
  );
  const presentationNodeModules = join(packageDirectories[1], "node_modules");
  const ajvDirectory = realpathSync(join(presentationNodeModules, "ajv"));
  const ajvDependencyRoot = resolve(ajvDirectory, "..");
  const externalDependencyDirectories = {
    "@sinclair/typebox": realpathSync(
      join(presentationNodeModules, "@sinclair", "typebox"),
    ),
    ajv: ajvDirectory,
    "fast-deep-equal": join(ajvDependencyRoot, "fast-deep-equal"),
    "fast-uri": join(ajvDependencyRoot, "fast-uri"),
    "json-schema-traverse": join(ajvDependencyRoot, "json-schema-traverse"),
    "require-from-string": join(ajvDependencyRoot, "require-from-string"),
  };
  const externalDependencyTarballs = Object.fromEntries(
    Object.entries(externalDependencyDirectories).map(
      ([packageName, packageDirectory]) => [
        packageName,
        packPackage(packageDirectory, tarballDirectory),
      ],
    ),
  );
  const dependencyOverrides = {
    "@generative-ui/shared-types": asFileDependency(tarballs[0]),
    ...Object.fromEntries(
      Object.entries(externalDependencyTarballs).map(
        ([packageName, tarball]) => [packageName, asFileDependency(tarball)],
      ),
    ),
  };

  writeFileSync(
    join(consumerDirectory, "package.json"),
    `${JSON.stringify(
      {
        name: "contract-package-consumer",
        private: true,
        type: "module",
        dependencies: {
          "@generative-ui/component-catalog-schema": asFileDependency(
            tarballs[2],
          ),
          "@generative-ui/presentation-contract": asFileDependency(tarballs[1]),
          "@generative-ui/shared-types": asFileDependency(tarballs[0]),
        },
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  const overrideLines = Object.entries(dependencyOverrides).map(
    ([packageName, dependency]) =>
      `  ${JSON.stringify(packageName)}: ${JSON.stringify(dependency)}`,
  );
  writeFileSync(
    join(consumerDirectory, "pnpm-workspace.yaml"),
    `packages:\n  - "."\noverrides:\n${overrideLines.join("\n")}\n`,
    "utf8",
  );

  runPnpm(
    ["install", "--offline", "--ignore-scripts", "--frozen-lockfile=false"],
    consumerDirectory,
  );

  writeFileSync(
    join(consumerDirectory, "smoke.mjs"),
    `import assert from "node:assert/strict";
import { jsonValueSchema } from "@generative-ui/shared-types";
import {
  validatePresentationResult,
  validateUIPlan,
} from "@generative-ui/presentation-contract";
import {
  defaultCatalogSchemaLimits,
  validateComponentCatalog,
} from "@generative-ui/component-catalog-schema";

const catalog = {
  schemaVersion: "1.0",
  catalogId: "consumer",
  catalogVersion: "1.0.0",
  components: [
    {
      componentType: "Summary",
      displayName: "Summary",
      description: "Displays summary data.",
      category: "common",
      domainTags: [],
      propsSchema: {
        $schema: "http://json-schema.org/draft-07/schema#",
        type: "object",
        additionalProperties: false,
      },
      allowedActions: [],
      nesting: {
        canHaveChildren: false,
      },
    },
  ],
  actions: [],
};

const plan = {
  version: "1.0",
  scenario: "summary",
  regions: [
    {
      regionId: "summary",
      purpose: "Summarize the current total.",
      bindings: [{ sourcePointer: "/total", role: "content" }],
      componentPreferences: [
        {
          componentType: "Summary",
          reason: "Display one summary region.",
        },
      ],
      layout: { flow: "vertical", density: "comfortable" },
    },
  ],
};

const result = {
  requestId: "request-1",
  status: "completed",
  mode: "generative-ui",
  surfaceId: "surface-1",
  operations: [
    {
      version: "v0.9",
      createSurface: { surfaceId: "surface-1" },
    },
  ],
};

assert.equal(typeof jsonValueSchema.$id, "string", "shared schema export");
assert.equal(validateUIPlan(plan).success, true, "UI Plan validation");
assert.equal(
  validateComponentCatalog(catalog, defaultCatalogSchemaLimits).success,
  true,
  "Component Catalog validation",
);
assert.equal(
  validatePresentationResult(result).success,
  true,
  "Presentation Result validation",
);
`,
    "utf8",
  );

  writeFileSync(
    join(consumerDirectory, "smoke.ts"),
    `import type { JsonValue } from "@generative-ui/shared-types";
import type {
  PresentationResult,
  UIPlan,
} from "@generative-ui/presentation-contract";
import type { ComponentCatalog } from "@generative-ui/component-catalog-schema";

const value: JsonValue = { total: 42 };
const result: PresentationResult = {
  requestId: "request-1",
  status: "completed",
  mode: "generative-ui",
  surfaceId: "surface-1",
  operations: [{ version: "v0.9" }],
};
declare const plan: UIPlan;
declare const catalog: ComponentCatalog;

void value;
void result;
void plan;
void catalog;
`,
    "utf8",
  );

  writeFileSync(
    join(consumerDirectory, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          module: "NodeNext",
          moduleResolution: "NodeNext",
          noEmit: true,
          strict: true,
          target: "ES2022",
          types: [],
        },
        include: ["smoke.ts"],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const typeScriptCli = join(
    repositoryRoot,
    "node_modules",
    "typescript",
    "bin",
    "tsc",
  );
  execFileSync(process.execPath, [typeScriptCli, "-p", "tsconfig.json"], {
    cwd: consumerDirectory,
    stdio: ["ignore", "pipe", "pipe"],
  });
  execFileSync(process.execPath, ["smoke.mjs"], {
    cwd: consumerDirectory,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const packageNames = [
    "@generative-ui/shared-types",
    "@generative-ui/presentation-contract",
    "@generative-ui/component-catalog-schema",
  ];
  for (const packageName of packageNames) {
    const packageJson = readFileSync(
      join(consumerDirectory, "node_modules", packageName, "package.json"),
      "utf8",
    );
    if (JSON.parse(packageJson).name !== packageName) {
      throw new Error(`Installed package name does not match ${packageName}.`);
    }
  }

  console.log(
    `Verified isolated ESM runtime and declarations for ${packageNames.join(", ")}.`,
  );
} finally {
  const resolvedTemporaryRoot = resolve(temporaryRoot);
  const temporaryDirectoryPrefix = `${resolve(tmpdir())}${sep}`;
  if (resolvedTemporaryRoot.startsWith(temporaryDirectoryPrefix)) {
    rmSync(resolvedTemporaryRoot, { force: true, recursive: true });
  }
}
