import type {
  CatalogContentHash,
  UICompileRequest,
} from "@generative-ui/compiler-contract";
import {
  validateCatalogContentHash,
  validateSurfaceId,
} from "@generative-ui/compiler-contract";
import {
  type ComponentCatalog,
  computeCatalogContentHash,
  validateComponentCatalog,
} from "@generative-ui/component-catalog-schema";
import { fail } from "./failure.js";
import type { CompileOptions } from "./types.js";

export interface ValidatedCatalog {
  catalog: ComponentCatalog;
  contentHash: CatalogContentHash;
}

export function validateInjectedCatalog(
  request: UICompileRequest,
  options: CompileOptions,
): ValidatedCatalog {
  const surfaceIdResult = validateSurfaceId(options.surfaceId);
  if (!surfaceIdResult.success) {
    fail({
      code: "UI_COMPILE_REQUEST_INVALID",
      message: "Compile surface ID is invalid.",
      stage: "input-validation",
      retryable: false,
      path: "/options/surfaceId",
      constraint: surfaceIdResult.error.constraint,
    });
  }

  const expectedHashResult = validateCatalogContentHash(
    options.catalogContentHash,
  );
  if (!expectedHashResult.success) {
    fail({
      code: "CATALOG_CONTENT_HASH_MISMATCH",
      message: "Injected Catalog content hash is invalid.",
      stage: "catalog-validation",
      retryable: false,
      path: "/options/catalogContentHash",
      constraint: expectedHashResult.error.constraint,
    });
  }

  const catalogResult = validateComponentCatalog(
    options.catalog,
    options.limits.catalogSchema,
  );
  if (!catalogResult.success) {
    fail({
      code: catalogResult.error.code,
      message: catalogResult.error.message,
      stage: "catalog-validation",
      retryable: false,
      path: `/options/catalog${catalogResult.error.path}`,
      constraint: catalogResult.error.constraint,
    });
  }

  if (
    catalogResult.value.catalogId !== request.catalog.catalogId ||
    catalogResult.value.catalogVersion !== request.catalog.catalogVersion
  ) {
    fail({
      code: "CATALOG_REFERENCE_MISMATCH",
      message: "Compile request and injected Catalog references do not match.",
      stage: "catalog-validation",
      retryable: false,
      path: "/catalog",
      constraint: "catalog-reference",
    });
  }

  const contentHash = computeCatalogContentHash(catalogResult.value);
  if (contentHash !== expectedHashResult.value) {
    fail({
      code: "CATALOG_CONTENT_HASH_MISMATCH",
      message: "Injected Catalog content hash does not match its content.",
      stage: "catalog-validation",
      retryable: false,
      path: "/options/catalogContentHash",
      constraint: "catalog-content-hash",
    });
  }

  return {
    catalog: catalogResult.value,
    contentHash,
  };
}
