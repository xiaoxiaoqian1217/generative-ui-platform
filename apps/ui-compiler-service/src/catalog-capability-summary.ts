import type { CatalogContentHash } from "@generative-ui/compiler-contract";
import type { ComponentCatalog } from "@generative-ui/component-catalog-schema";
import { computeCatalogContentHash } from "@generative-ui/component-catalog-schema";
import type { CatalogCapabilitySummary } from "./presentation-router.js";

function sorted(values: readonly string[]): string[] {
  return [...values].sort();
}

export function createCatalogCapabilitySummary(
  catalog: ComponentCatalog,
  catalogContentHash: CatalogContentHash = computeCatalogContentHash(catalog),
): CatalogCapabilitySummary {
  return {
    summaryVersion: "1.0",
    catalog: {
      catalogId: catalog.catalogId,
      catalogVersion: catalog.catalogVersion,
      catalogContentHash,
    },
    components: catalog.components
      .map((component) => ({
        componentType: component.componentType,
        displayName: component.displayName,
        description: component.description,
        category: component.category,
        domainTags: sorted(component.domainTags),
        allowedActions: sorted(component.allowedActions),
        nesting: component.nesting.canHaveChildren
          ? {
              canHaveChildren: true as const,
              ...(component.nesting.allowedChildTypes === undefined
                ? {}
                : {
                    allowedChildTypes: sorted(
                      component.nesting.allowedChildTypes,
                    ),
                  }),
              ...(component.nesting.allowedParentTypes === undefined
                ? {}
                : {
                    allowedParentTypes: sorted(
                      component.nesting.allowedParentTypes,
                    ),
                  }),
              ...(component.nesting.maxChildren === undefined
                ? {}
                : { maxChildren: component.nesting.maxChildren }),
            }
          : {
              canHaveChildren: false as const,
              ...(component.nesting.allowedParentTypes === undefined
                ? {}
                : {
                    allowedParentTypes: sorted(
                      component.nesting.allowedParentTypes,
                    ),
                  }),
            },
      }))
      .sort((left, right) =>
        left.componentType.localeCompare(right.componentType, "en"),
      ),
    actions: catalog.actions
      .map((action) => ({ ...action }))
      .sort((left, right) =>
        left.actionType.localeCompare(right.actionType, "en"),
      ),
  };
}
