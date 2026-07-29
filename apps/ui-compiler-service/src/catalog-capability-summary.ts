import type { CatalogContentHash } from "@generative-ui/compiler-contract";
import type { ComponentCatalog } from "@generative-ui/component-catalog-schema";
import { computeCatalogContentHash } from "@generative-ui/component-catalog-schema";
import type { CatalogCapabilitySummary } from "./presentation-router.js";

function sorted(values: readonly string[]): string[] {
  return [...values].sort(compareUnicodeCodePoints);
}

function compareUnicodeCodePoints(left: string, right: string): number {
  const leftCodePoints = Array.from(left);
  const rightCodePoints = Array.from(right);
  const sharedLength = Math.min(leftCodePoints.length, rightCodePoints.length);
  for (let index = 0; index < sharedLength; index += 1) {
    const leftCodePoint = leftCodePoints[index]?.codePointAt(0);
    const rightCodePoint = rightCodePoints[index]?.codePointAt(0);
    if (leftCodePoint === undefined || rightCodePoint === undefined) {
      return 0;
    }
    const difference = leftCodePoint - rightCodePoint;
    if (difference !== 0) {
      return difference;
    }
  }
  return leftCodePoints.length - rightCodePoints.length;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}

function immutableCopy<T>(value: T): T {
  return deepFreeze(structuredClone(value));
}

export function createCatalogCapabilitySummary(
  catalog: ComponentCatalog,
  catalogContentHash: CatalogContentHash = computeCatalogContentHash(catalog),
): CatalogCapabilitySummary {
  return deepFreeze({
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
        compareUnicodeCodePoints(left.componentType, right.componentType),
      ),
    actions: catalog.actions
      .map((action) => immutableCopy(action))
      .sort((left, right) =>
        compareUnicodeCodePoints(left.actionType, right.actionType),
      ),
  });
}
