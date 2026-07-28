import type { UICompileRequest } from "@generative-ui/compiler-contract";
import type {
  ComponentCatalog,
  ComponentDefinition,
} from "@generative-ui/component-catalog-schema";
import { componentMapping } from "./component-mappings.js";
import { fail } from "./failure.js";

const commonComponentTypes = {
  summary: new Set(["Card", "Text", "List"]),
  confirmation: new Set(["Card", "Button"]),
  form: new Set(["Form"]),
} as const;

export interface ComponentSelection {
  component: ComponentDefinition;
  region: UICompileRequest["plan"]["regions"][number];
  regionIndex: number;
}

export interface SummarySelection extends ComponentSelection {}

function supportsScenario(
  scenario: UICompileRequest["plan"]["scenario"],
): scenario is keyof typeof commonComponentTypes {
  return scenario in commonComponentTypes;
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
  const scenario = request.plan.scenario;
  if (!supportsScenario(scenario)) {
    fail({
      code: "NO_COMPATIBLE_COMPOSITION",
      message: "The Core does not support this presentation scenario.",
      stage: "composition-planning",
      retryable: false,
      path: "/plan/scenario",
      constraint: "supported-scenario",
    });
  }
  const allowedCommonTypes: ReadonlySet<string> =
    commonComponentTypes[scenario];
  if (
    request.plan.scenario !== "confirmation" &&
    request.plan.regions.length !== 1
  ) {
    fail({
      code: "NO_COMPATIBLE_COMPOSITION",
      message: "This presentation scenario requires one plan region.",
      stage: "composition-planning",
      retryable: false,
      path: "/plan/regions",
      constraint: "single-region-scenario",
    });
  }

  const selections = request.plan.regions.map((region, regionIndex) => {
    let foundCatalogPreference = false;
    for (const preference of region.componentPreferences) {
      const component = catalog.components.find(
        (candidate) => candidate.componentType === preference.componentType,
      );
      if (!component) {
        continue;
      }
      foundCatalogPreference = true;
      if (
        component.category !== "domain" &&
        !allowedCommonTypes.has(component.componentType)
      ) {
        continue;
      }
      if (!componentMapping(component)) {
        continue;
      }
      return { component, region, regionIndex };
    }

    if (!foundCatalogPreference) {
      fail({
        code: "NO_COMPATIBLE_COMPONENT",
        message:
          "The suggested component is not declared by the active Catalog.",
        stage: "component-selection",
        retryable: false,
        path: `/plan/regions/${regionIndex}/componentPreferences`,
        constraint: "catalog-component",
      });
    }

    fail({
      code: "NO_COMPATIBLE_COMPONENT",
      message: "No active Catalog component can render the plan region.",
      stage: "component-selection",
      retryable: false,
      path: `/plan/regions/${regionIndex}/componentPreferences`,
      constraint: "scenario-component",
    });
  });

  const root = selections[0];
  if (!root) {
    fail({
      code: "NO_COMPATIBLE_COMPOSITION",
      message: "The plan has no usable root region.",
      stage: "composition-planning",
      retryable: false,
      path: "/plan/regions",
      constraint: "root-region",
    });
  }
  const children = selections.slice(1);
  const maximumChildren =
    root.component.nesting.canHaveChildren &&
    root.component.nesting.maxChildren !== undefined
      ? root.component.nesting.maxChildren
      : Number.POSITIVE_INFINITY;
  if (
    children.length > maximumChildren ||
    children.some((child) => !acceptsChild(root.component, child.component))
  ) {
    fail({
      code: "NO_COMPATIBLE_COMPOSITION",
      message: "Catalog nesting constraints cannot represent the plan regions.",
      stage: "composition-planning",
      retryable: false,
      path: "/plan/regions",
      constraint: "catalog-nesting",
    });
  }

  return selections;
}

export function selectSummaryComponent(
  request: UICompileRequest,
  catalog: ComponentCatalog,
): SummarySelection {
  if (
    request.plan.scenario !== "summary" ||
    request.plan.regions.length !== 1
  ) {
    fail({
      code: "NO_COMPATIBLE_COMPOSITION",
      message: "Summary selection requires a one-region summary plan.",
      stage: "composition-planning",
      retryable: false,
      path: "/plan",
      constraint: "single-summary-region",
    });
  }
  return selectComponents(request, catalog)[0] as SummarySelection;
}
