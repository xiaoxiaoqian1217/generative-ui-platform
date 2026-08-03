import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join, relative, resolve, sep } from "node:path";

const dependencySections = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
];

const runtimeDependencySections = new Set([
  "dependencies",
  "optionalDependencies",
  "peerDependencies",
]);

const allowedCoreRuntimeDependencies = new Set([
  "@generative-ui/compiler-contract",
  "@generative-ui/component-catalog-schema",
  "@generative-ui/presentation-contract",
  "@generative-ui/shared-types",
]);

const allowedCoreDevelopmentDependencies = new Set([
  ...allowedCoreRuntimeDependencies,
  "tsup",
  "typescript",
  "vitest",
]);

const allowedAdapterRuntimeDependencies = new Set([
  "@generative-ui/compiler-contract",
  "@generative-ui/presentation-contract",
  "@generative-ui/shared-types",
  "@sinclair/typebox",
  "ajv",
]);

const allowedAdapterDevelopmentDependencies = new Set([
  "tsup",
  "typescript",
  "vitest",
]);

const allowedPipelineRuntimeDependencies = new Set([
  "@generative-ui/compiler-contract",
  "@generative-ui/component-catalog-schema",
  "@generative-ui/presentation-contract",
  "@generative-ui/shared-types",
  "@generative-ui/ui-compiler-core",
  "mdast-util-from-markdown",
  "mdast-util-to-markdown",
  "micromark-util-sanitize-uri",
]);

const allowedPipelineDevelopmentDependencies = new Set([
  "@types/mdast",
  "tsup",
  "typescript",
  "vitest",
]);

const contractPackagePaths = new Set([
  "packages/compiler-contract",
  "packages/component-catalog-schema",
  "packages/presentation-contract",
  "packages/runtime-contract",
  "packages/shared-types",
]);

const implementationPackagePaths = new Set([
  "packages/ag-ui-adapter",
  "packages/presentation-pipeline",
  "packages/ui-compiler-core",
]);

function toPortablePath(path) {
  return path.split(sep).join("/");
}

function parseRepositoryRoot(arguments_) {
  if (arguments_.length === 0) {
    return process.cwd();
  }

  if (arguments_.length === 2 && arguments_[0] === "--root") {
    return resolve(arguments_[1]);
  }

  throw new Error("Usage: check-dependency-boundaries.mjs [--root <path>]");
}

function readWorkspaceProjects(repositoryRoot) {
  const projects = [];

  for (const workspaceDirectory of ["apps", "packages"]) {
    const workspaceRoot = join(repositoryRoot, workspaceDirectory);
    if (!existsSync(workspaceRoot)) {
      continue;
    }

    const projectDirectories = readdirSync(workspaceRoot, {
      withFileTypes: true,
    })
      .filter((entry) => entry.isDirectory())
      .sort((left, right) => left.name.localeCompare(right.name));

    for (const projectDirectory of projectDirectories) {
      const projectRoot = join(workspaceRoot, projectDirectory.name);
      const manifestPath = join(projectRoot, "package.json");
      if (!existsSync(manifestPath)) {
        continue;
      }

      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      if (typeof manifest.name !== "string" || manifest.name.length === 0) {
        throw new Error(
          `${toPortablePath(relative(repositoryRoot, manifestPath))} must define a package name`,
        );
      }

      projects.push({
        manifest,
        name: manifest.name,
        path: toPortablePath(relative(repositoryRoot, projectRoot)),
      });
    }
  }

  return projects;
}

function collectDependencies(manifest) {
  const dependencies = [];

  for (const section of dependencySections) {
    for (const [name, version] of Object.entries(manifest[section] ?? {})) {
      dependencies.push({ name, section, version });
    }
  }

  return dependencies;
}

function findViolations(projects) {
  const violations = [];
  const projectsByName = new Map();

  for (const project of projects) {
    if (projectsByName.has(project.name)) {
      violations.push(
        `${project.path}: duplicate workspace package name ${project.name}`,
      );
      continue;
    }

    projectsByName.set(project.name, project);
  }

  for (const source of projects) {
    for (const dependency of collectDependencies(source.manifest)) {
      const {
        name: dependencyName,
        section: dependencySection,
        version,
      } = dependency;
      const target = projectsByName.get(dependencyName);

      if (
        source.path === "packages/ag-ui-adapter" &&
        runtimeDependencySections.has(dependencySection) &&
        !allowedAdapterRuntimeDependencies.has(dependencyName)
      ) {
        violations.push(
          `${source.path} -> ${dependencyName}: AG-UI Adapter runtime dependencies are limited to approved contract and Schema packages`,
        );
      }

      if (
        source.path === "packages/ag-ui-adapter" &&
        dependencySection === "devDependencies" &&
        !allowedAdapterDevelopmentDependencies.has(dependencyName)
      ) {
        violations.push(
          `${source.path} -> ${dependencyName}: AG-UI Adapter development dependencies are limited to approved tooling`,
        );
      }

      if (
        source.path === "packages/presentation-pipeline" &&
        runtimeDependencySections.has(dependencySection) &&
        !allowedPipelineRuntimeDependencies.has(dependencyName)
      ) {
        violations.push(
          `${source.path} -> ${dependencyName}: Presentation Pipeline runtime dependencies are limited to approved Compiler packages and Markdown tooling`,
        );
      }

      if (
        source.path === "packages/presentation-pipeline" &&
        dependencySection === "devDependencies" &&
        !allowedPipelineDevelopmentDependencies.has(dependencyName)
      ) {
        violations.push(
          `${source.path} -> ${dependencyName}: Presentation Pipeline development dependencies are limited to approved tooling`,
        );
      }

      if (
        source.path === "packages/ui-compiler-core" &&
        runtimeDependencySections.has(dependencySection) &&
        !allowedCoreRuntimeDependencies.has(dependencyName)
      ) {
        violations.push(
          `${source.path} -> ${dependencyName}: UI Compiler Core runtime dependencies are limited to approved contract packages`,
        );
      }

      if (
        source.path === "packages/ui-compiler-core" &&
        dependencySection === "devDependencies" &&
        !allowedCoreDevelopmentDependencies.has(dependencyName)
      ) {
        violations.push(
          `${source.path} -> ${dependencyName}: UI Compiler Core development dependencies are limited to approved tooling and contract packages`,
        );
      }

      if (!target) {
        if (version.startsWith("workspace:")) {
          violations.push(
            `${source.path} -> ${dependencyName}: workspace dependency target does not exist`,
          );
        }
        continue;
      }

      if (source.path.startsWith("apps/") && target?.path.startsWith("apps/")) {
        violations.push(
          `${source.path} -> ${dependencyName}: applications must not depend on applications`,
        );
      }

      if (
        source.path.startsWith("packages/") &&
        target.path.startsWith("apps/")
      ) {
        violations.push(
          `${source.path} -> ${dependencyName}: packages must not depend on apps`,
        );
      }

      if (
        source.path === "packages/ui-compiler-core" &&
        target.path.startsWith("packages/") &&
        basename(target.path).endsWith("-adapter")
      ) {
        violations.push(
          `${source.path} -> ${dependencyName}: UI Compiler Core must not depend on protocol adapters`,
        );
      }

      if (
        contractPackagePaths.has(source.path) &&
        implementationPackagePaths.has(target.path)
      ) {
        violations.push(
          `${source.path} -> ${dependencyName}: contract packages must not depend on implementation packages`,
        );
      }
    }
  }

  return violations.sort();
}

try {
  const repositoryRoot = parseRepositoryRoot(process.argv.slice(2));
  const violations = findViolations(readWorkspaceProjects(repositoryRoot));

  if (violations.length > 0) {
    process.stderr.write(
      `Dependency boundary violations:\n${violations
        .map((violation) => `- ${violation}`)
        .join("\n")}\n`,
    );
    process.exitCode = 1;
  } else {
    process.stdout.write("Dependency boundaries are valid.\n");
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Dependency boundary check failed: ${message}\n`);
  process.exitCode = 1;
}
