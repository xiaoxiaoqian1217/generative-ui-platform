import type { UICompileRequest } from "@generative-ui/compiler-contract";
import type {
  ComponentCatalog,
  ComponentDefinition,
} from "@generative-ui/component-catalog-schema";
import { fail } from "./failure.js";

const summaryComponentTypes = new Set(["Card", "Text", "List"]);

export interface SummarySelection {
  component: ComponentDefinition;
  region: UICompileRequest["plan"]["regions"][number];
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
      message: "The MVP Core supports one-region summary plans.",
      stage: "composition-planning",
      retryable: false,
      path: "/plan",
      constraint: "single-summary-region",
    });
  }

  const region = request.plan.regions[0];
  if (!region) {
    fail({
      code: "NO_COMPATIBLE_COMPOSITION",
      message: "The summary plan has no usable region.",
      stage: "composition-planning",
      retryable: false,
      path: "/plan/regions",
      constraint: "summary-region",
    });
  }
  if ((region.actions?.length ?? 0) > 0) {
    fail({
      code: "NO_COMPATIBLE_COMPOSITION",
      message: "The summary tracer bullet does not support Actions.",
      stage: "action-binding",
      retryable: false,
      path: "/plan/regions/0/actions",
      constraint: "summary-without-actions",
    });
  }

  for (const preference of region.componentPreferences) {
    if (!summaryComponentTypes.has(preference.componentType)) {
      continue;
    }
    const component = catalog.components.find(
      (candidate) => candidate.componentType === preference.componentType,
    );
    if (component) {
      return { component, region };
    }
  }

  fail({
    code: "NO_COMPATIBLE_COMPONENT",
    message: "No Catalog component can render the summary region.",
    stage: "component-selection",
    retryable: false,
    path: "/plan/regions/0/componentPreferences",
    constraint: "catalog-summary-component",
  });
}
