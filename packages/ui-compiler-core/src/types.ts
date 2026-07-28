import type { CatalogContentHash } from "@generative-ui/compiler-contract";
import type {
  CatalogSchemaLimits,
  ComponentCatalog,
} from "@generative-ui/component-catalog-schema";

export interface CoreCompileLimits {
  maxDataDepth: number;
  maxDataItems: number;
  catalogSchema: CatalogSchemaLimits;
}

export interface CompileOptions {
  surfaceId: string;
  catalog: ComponentCatalog;
  catalogContentHash: CatalogContentHash;
  limits: CoreCompileLimits;
}
