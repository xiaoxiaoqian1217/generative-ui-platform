import type {
  A2UIOperation,
  CatalogContentHash,
  UICompileRequest,
  UICompileResult,
  UISurfaceIR,
} from "../src/index.js";
import {
  a2UIOperationSequenceExample,
  catalogContentHash,
  compileRequestExample,
  completedCompileResultExample,
  uiSurfaceIRExample,
} from "./fixtures/compiler-contract-examples.js";

const request: UICompileRequest = compileRequestExample;
const surface: UISurfaceIR = uiSurfaceIRExample;
const hash: CatalogContentHash = catalogContentHash;
const operation: A2UIOperation = a2UIOperationSequenceExample[0];
const result: UICompileResult = completedCompileResultExample;

void request;
void surface;
void hash;
void operation;
void result;

// @ts-expect-error Catalog content hashes use the normalized SHA-256 prefix.
const invalidHash: CatalogContentHash = "md5:0123456789abcdef";

const invalidOperationVersion: A2UIOperation = {
  // @ts-expect-error A2UI 0.9.1 Profile messages use the v0.9 wire version.
  version: "v0.9.1",
  createSurface: {
    surfaceId: "surface-15",
    catalogId: "default",
  },
};

const invalidDeleteOperation: A2UIOperation = {
  version: "v0.9",
  // @ts-expect-error deleteSurface is outside the MVP Profile.
  deleteSurface: {
    surfaceId: "surface-15",
  },
};

const invalidCompletedResult: UICompileResult = {
  ...completedCompileResultExample,
  // @ts-expect-error Complete success cannot carry a Markdown Fallback.
  fallback: {
    format: "markdown",
    markdown: "Fallback",
  },
};

void invalidHash;
void invalidOperationVersion;
void invalidDeleteOperation;
void invalidCompletedResult;
