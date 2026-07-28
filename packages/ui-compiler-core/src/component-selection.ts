import type { UICompileRequest } from "@generative-ui/compiler-contract";
import type {
  ComponentCatalog,
  ComponentDefinition,
} from "@generative-ui/component-catalog-schema";
import type { JsonValue } from "@generative-ui/shared-types";
import { resolveComponentMapping } from "./component-mappings.js";
import { fail } from "./failure.js";
import { resolveJsonPointer } from "./json-pointer.js";

const supportedComponents: Partial<
  Record<UICompileRequest["plan"]["scenario"], ReadonlySet<string>>
> = {
  summary: new Set(["Card", "Text", "List"]),
  status: new Set(["Card", "Table", "Alert"]),
  comparison: new Set(["Table", "Card"]),
  timeline: new Set(["Timeline", "Steps"]),
  detail: new Set(["Card", "List", "Table"]),
};

const narrowViewportWidth = 640;
const largeCollectionSize = 5;
const collectionTableSize = 3;

export interface ComponentSelection {
  component: ComponentDefinition;
  region: UICompileRequest["plan"]["regions"][number];
  regionIndex: number;
}

interface DataProfile {
  arraySize: number;
  hasObject: boolean;
  hasScalar: boolean;
  roles: ReadonlySet<
    UICompileRequest["plan"]["regions"][number]["bindings"][number]["role"]
  >;
}

interface ScoredCandidate {
  component: ComponentDefinition;
  catalogIndex: number;
  preferenceIndex: number;
  score: number;
}

function profileRegion(
  request: UICompileRequest,
  region: UICompileRequest["plan"]["regions"][number],
): DataProfile {
  let arraySize = 0;
  let hasObject = false;
  let hasScalar = false;

  for (const binding of region.bindings) {
    const resolved = resolveJsonPointer(
      request.sourceData,
      binding.sourcePointer,
    );
    if (!resolved.found) {
      continue;
    }
    const value = resolved.value as JsonValue;
    if (Array.isArray(value)) {
      arraySize = Math.max(arraySize, value.length);
    } else if (value !== null && typeof value === "object") {
      hasObject = true;
    } else {
      hasScalar = true;
    }
  }

  return {
    arraySize,
    hasObject,
    hasScalar,
    roles: new Set(region.bindings.map((binding) => binding.role)),
  };
}

function semanticTokens(value: string): Set<string> {
  return new Set(
    value
      .toLocaleLowerCase("en-US")
      .match(/[\p{L}\p{N}]+/gu)
      ?.filter((token) => token.length > 2) ?? [],
  );
}

function descriptionScore(
  component: ComponentDefinition,
  region: UICompileRequest["plan"]["regions"][number],
  preferenceReason: string | undefined,
  scenario: UICompileRequest["plan"]["scenario"],
): number {
  const description = semanticTokens(
    `${component.displayName} ${component.description}`,
  );
  const semantics = semanticTokens(
    `${scenario} ${region.purpose} ${preferenceReason ?? ""}`,
  );
  let overlap = 0;
  for (const token of semantics) {
    if (description.has(token)) {
      overlap += 1;
    }
  }
  return Math.min(15, overlap * 5);
}

function dataAndViewportScore(
  componentType: string,
  scenario: UICompileRequest["plan"]["scenario"],
  profile: DataProfile,
  request: UICompileRequest,
  region: UICompileRequest["plan"]["regions"][number],
): number {
  const narrow =
    request.context?.viewport !== undefined &&
    request.context.viewport.width < narrowViewportWidth;
  let score = 0;

  if (componentType === "Table" && narrow) {
    score -= 20;
  }

  switch (scenario) {
    case "status":
      if (componentType === "Alert" && profile.roles.has("status")) {
        score += 45;
      } else if (
        componentType === "Table" &&
        profile.arraySize >= collectionTableSize
      ) {
        score += 45;
      } else if (
        componentType === "Card" &&
        (profile.hasObject || profile.hasScalar)
      ) {
        score += 30;
      } else if (componentType === "Alert" && profile.hasScalar) {
        score += 25;
      }
      break;
    case "comparison":
      if (
        componentType === "Table" &&
        profile.arraySize >= collectionTableSize
      ) {
        score += 50;
      } else if (
        componentType === "Card" &&
        profile.arraySize < collectionTableSize
      ) {
        score += 35;
      }
      break;
    case "timeline":
      if (
        componentType === "Steps" &&
        (narrow || region.layout.density === "compact")
      ) {
        score += 35;
      } else if (
        componentType === "Timeline" &&
        !narrow &&
        region.layout.density === "comfortable"
      ) {
        score += 35;
      }
      if (
        componentType === "Timeline" &&
        profile.arraySize >= largeCollectionSize
      ) {
        score += 10;
      }
      break;
    case "detail":
      if (
        componentType === "Table" &&
        profile.arraySize >= largeCollectionSize
      ) {
        score += 50;
      } else if (
        componentType === "List" &&
        profile.arraySize > 0 &&
        profile.arraySize < largeCollectionSize
      ) {
        score += 40;
      } else if (
        componentType === "Card" &&
        (profile.hasObject || profile.hasScalar)
      ) {
        score += 35;
      }
      break;
    default:
      break;
  }

  return score;
}

function candidatesForRegion(
  request: UICompileRequest,
  catalog: ComponentCatalog,
  regionIndex: number,
): ScoredCandidate[] {
  const region = request.plan.regions[regionIndex];
  if (!region) {
    return [];
  }
  if ((region.actions?.length ?? 0) > 0) {
    fail({
      code: "NO_COMPATIBLE_COMPOSITION",
      message: "Display-scene lowering does not support Actions.",
      stage: "action-binding",
      retryable: false,
      path: `/plan/regions/${regionIndex}/actions`,
      constraint: "display-scene-without-actions",
    });
  }

  const profile = profileRegion(request, region);
  const allowedTypes = supportedComponents[request.plan.scenario];
  if (!allowedTypes) {
    fail({
      code: "NO_COMPATIBLE_COMPOSITION",
      message: "The Core does not support this display scenario yet.",
      stage: "composition-planning",
      retryable: false,
      path: "/plan/scenario",
      constraint: "supported-core-scenario",
    });
  }
  const candidates: ScoredCandidate[] = [];

  for (const [
    preferenceIndex,
    preference,
  ] of region.componentPreferences.entries()) {
    const catalogIndex = catalog.components.findIndex(
      (component) => component.componentType === preference.componentType,
    );
    if (catalogIndex < 0) {
      continue;
    }
    const component = catalog.components[catalogIndex];
    if (!component) {
      continue;
    }
    if (
      !allowedTypes.has(preference.componentType) &&
      component.category !== "domain"
    ) {
      continue;
    }
    const mapping = resolveComponentMapping(
      component,
      region.bindings.map((binding) => binding.role),
    );
    if (!mapping) {
      continue;
    }
    if (
      region.bindings.some(
        (binding) => mapping.bindingProps[binding.role] === undefined,
      )
    ) {
      continue;
    }

    candidates.push({
      component,
      catalogIndex,
      preferenceIndex,
      score:
        100 -
        preferenceIndex * 15 +
        descriptionScore(
          component,
          region,
          preference.reason,
          request.plan.scenario,
        ) +
        dataAndViewportScore(
          component.componentType,
          request.plan.scenario,
          profile,
          request,
          region,
        ),
    });
  }

  return candidates.sort(
    (left, right) =>
      right.score - left.score ||
      left.preferenceIndex - right.preferenceIndex ||
      left.catalogIndex - right.catalogIndex ||
      left.component.componentType.localeCompare(right.component.componentType),
  );
}

function acceptsChild(
  parent: ComponentDefinition,
  child: ComponentDefinition,
): boolean {
  if (!parent.nesting.canHaveChildren) {
    return false;
  }
  if (
    parent.nesting.allowedChildTypes !== undefined &&
    !parent.nesting.allowedChildTypes.includes(child.componentType)
  ) {
    return false;
  }
  return (
    child.nesting.allowedParentTypes === undefined ||
    child.nesting.allowedParentTypes.includes(parent.componentType)
  );
}

export function selectComponents(
  request: UICompileRequest,
  catalog: ComponentCatalog,
): ComponentSelection[] {
  const candidateLists = request.plan.regions.map((_region, regionIndex) =>
    candidatesForRegion(request, catalog, regionIndex),
  );

  const missingIndex = candidateLists.findIndex(
    (candidates) => candidates.length === 0,
  );
  if (missingIndex >= 0) {
    fail({
      code: "NO_COMPATIBLE_COMPONENT",
      message: "No active Catalog component can render the plan region.",
      stage: "component-selection",
      retryable: false,
      path: `/plan/regions/${missingIndex}/componentPreferences`,
      constraint: "catalog-display-component",
    });
  }

  const rootCandidates = candidateLists[0] ?? [];
  for (const rootCandidate of rootCandidates) {
    if ((rootCandidate.component.nesting.allowedParentTypes?.length ?? 0) > 0) {
      continue;
    }
    const children: ScoredCandidate[] = [];
    let compatible = true;
    for (const candidates of candidateLists.slice(1)) {
      const child = candidates.find((candidate) =>
        acceptsChild(rootCandidate.component, candidate.component),
      );
      if (!child) {
        compatible = false;
        break;
      }
      children.push(child);
    }

    const maximumChildren =
      rootCandidate.component.nesting.canHaveChildren &&
      rootCandidate.component.nesting.maxChildren !== undefined
        ? rootCandidate.component.nesting.maxChildren
        : Number.POSITIVE_INFINITY;
    if (!compatible || children.length > maximumChildren) {
      continue;
    }

    return [rootCandidate, ...children].map((candidate, regionIndex) => ({
      component: candidate.component,
      region: request.plan.regions[regionIndex] as NonNullable<
        UICompileRequest["plan"]["regions"][number]
      >,
      regionIndex,
    }));
  }

  fail({
    code: "NO_COMPATIBLE_COMPOSITION",
    message: "Catalog nesting constraints cannot represent the plan regions.",
    stage: "composition-planning",
    retryable: false,
    path: "/plan/regions",
    constraint: "catalog-nesting",
  });
}
