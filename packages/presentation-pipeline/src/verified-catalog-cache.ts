import type { CatalogContentHash } from "@generative-ui/compiler-contract";
import type {
  CatalogSchemaLimits,
  ComponentCatalog,
} from "@generative-ui/component-catalog-schema";
import {
  computeCatalogContentHash,
  validateComponentCatalog,
} from "@generative-ui/component-catalog-schema";
import type { CatalogReference } from "@generative-ui/presentation-contract";
import { createImmutableCatalogSnapshot } from "./catalog-capability-summary.js";

export interface AuthorizedCatalogRepository {
  load(reference: CatalogReference): unknown;
}

export interface VerifiedCatalog {
  catalog: ComponentCatalog;
  contentHash: CatalogContentHash;
}

export type VerifiedCatalogLoadResult =
  | { success: true; value: VerifiedCatalog }
  | { success: false; code: string };

function referenceKey(reference: CatalogReference): string {
  return `${reference.catalogId}\u0000${reference.catalogVersion}`;
}

function cacheKey(
  reference: CatalogReference,
  hash: CatalogContentHash,
): string {
  return `${referenceKey(reference)}\u0000${hash}`;
}

/**
 * Caches only immutable Catalogs that have passed the shared Catalog schema.
 * Request data, fallback Markdown, surface IDs, operations, and results are
 * intentionally absent from this boundary.
 */
export function createVerifiedCatalogCache(
  repository: AuthorizedCatalogRepository,
  limits: CatalogSchemaLimits,
): { load(reference: CatalogReference): VerifiedCatalogLoadResult } {
  const references = new Map<string, CatalogContentHash>();
  const catalogs = new Map<string, VerifiedCatalog>();
  return {
    load(reference) {
      const key = referenceKey(reference);
      const knownHash = references.get(key);
      if (knownHash !== undefined) {
        const cached = catalogs.get(cacheKey(reference, knownHash));
        if (cached !== undefined) return { success: true, value: cached };
      }
      try {
        const validated = validateComponentCatalog(
          repository.load(reference),
          limits,
        );
        if (!validated.success)
          return { success: false, code: validated.error.code };
        if (
          validated.value.catalogId !== reference.catalogId ||
          validated.value.catalogVersion !== reference.catalogVersion
        )
          return { success: false, code: "CATALOG_REFERENCE_MISMATCH" };
        const catalog = createImmutableCatalogSnapshot(validated.value);
        const contentHash = computeCatalogContentHash(catalog);
        const verified = Object.freeze({ catalog, contentHash });
        references.set(key, contentHash);
        catalogs.set(cacheKey(reference, contentHash), verified);
        return { success: true, value: verified };
      } catch {
        return { success: false, code: "COMPONENT_CATALOG_INVALID" };
      }
    },
  };
}
