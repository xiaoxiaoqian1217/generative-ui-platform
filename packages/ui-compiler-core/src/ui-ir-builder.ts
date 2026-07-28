import type {
  ComponentIR,
  PropBindingIR,
  UICompileRequest,
  UISurfaceIR,
} from "@generative-ui/compiler-contract";
import { validateUISurfaceIR } from "@generative-ui/compiler-contract";
import {
  type ComponentCatalog,
  validateComponentProps,
} from "@generative-ui/component-catalog-schema";
import type { JsonValue } from "@generative-ui/shared-types";
import { componentMappings } from "./component-mappings.js";
import type {
  ComponentSelection,
  SummarySelection,
} from "./component-selection.js";
import { fail } from "./failure.js";
import { resolveJsonPointer } from "./json-pointer.js";
import { normalizeLayout } from "./layout.js";
import type { CompileOptions } from "./types.js";

function componentId(regionIndex: number): string {
  return regionIndex === 0 ? "root" : `region-${regionIndex}`;
}

function buildComponent(
  request: UICompileRequest,
  selection: ComponentSelection,
  childIds: string[],
  catalog: ComponentCatalog,
  options: CompileOptions,
): ComponentIR {
  const props: Record<string, JsonValue> = {};
  const resolvedProps: Record<string, JsonValue> = {};
  const mapping = componentMappings[selection.component.componentType];
  if (!mapping) {
    fail({
      code: "NO_COMPATIBLE_COMPONENT",
      message: "The selected component has no authorized Core mapping.",
      stage: "component-selection",
      retryable: false,
      path: `/plan/regions/${selection.regionIndex}/componentPreferences`,
      constraint: "core-component-mapping",
    });
  }

  const bindings: PropBindingIR[] = [];
  const boundProps = new Set<string>();
  for (const binding of selection.region.bindings) {
    const prop = mapping.bindingProps[binding.role];
    if (!prop || boundProps.has(prop)) {
      fail({
        code: "PROPS_RESOLUTION_FAILED",
        message: "Binding cannot be mapped to a unique component Prop.",
        stage: "props-resolution",
        retryable: false,
        path: `/plan/regions/${selection.regionIndex}/bindings`,
        constraint: "catalog-prop-binding",
      });
    }

    const resolved = resolveJsonPointer(
      request.sourceData,
      binding.sourcePointer,
    );
    if (!resolved.found || resolved.value === undefined) {
      fail({
        code: "PROPS_RESOLUTION_FAILED",
        message: "Binding does not resolve against complete sourceData.",
        stage: "props-resolution",
        retryable: false,
        path: `/plan/regions/${selection.regionIndex}/bindings`,
        constraint: "source-data-pointer",
      });
    }

    boundProps.add(prop);
    resolvedProps[prop] = resolved.value;
    bindings.push({
      prop,
      source: "sourceData",
      path: binding.sourcePointer,
    });
  }

  if (mapping.purposeProp && !boundProps.has(mapping.purposeProp)) {
    props[mapping.purposeProp] = selection.region.purpose;
    resolvedProps[mapping.purposeProp] = selection.region.purpose;
  }

  const propsResult = validateComponentProps(
    catalog,
    selection.component.componentType,
    resolvedProps,
    options.limits.catalogSchema,
  );
  if (!propsResult.success) {
    fail({
      code: propsResult.error.code,
      message: propsResult.error.message,
      stage: "props-resolution",
      retryable: false,
      path: `/components/${componentId(selection.regionIndex)}/props${propsResult.error.path}`,
      constraint: propsResult.error.constraint,
    });
  }

  return {
    componentId: componentId(selection.regionIndex),
    componentType: selection.component.componentType,
    props,
    ...(bindings.length > 0 ? { bindings } : {}),
    children: childIds,
    layout: normalizeLayout(
      selection.region.layout,
      request.context,
      selection.regionIndex,
    ),
    sourceRegionIds: [selection.region.regionId],
  };
}

export function buildUIIR(
  request: UICompileRequest,
  selections: ComponentSelection[],
  catalog: ComponentCatalog,
  options: CompileOptions,
): UISurfaceIR {
  if (selections.length !== request.plan.regions.length) {
    fail({
      code: "NO_COMPATIBLE_COMPOSITION",
      message: "Each plan region must have one selected component.",
      stage: "composition-planning",
      retryable: false,
      path: "/plan/regions",
      constraint: "complete-region-selection",
    });
  }

  const regionIds = new Set<string>();
  for (const [regionIndex, region] of request.plan.regions.entries()) {
    if (regionIds.has(region.regionId)) {
      fail({
        code: "NO_COMPATIBLE_COMPOSITION",
        message: "Plan region IDs must be unique.",
        stage: "semantic-resolution",
        retryable: false,
        path: `/plan/regions/${regionIndex}/regionId`,
        constraint: "unique-region-id",
      });
    }
    regionIds.add(region.regionId);
  }

  const childIds = selections
    .slice(1)
    .map((selection) => componentId(selection.regionIndex));
  const components = selections.map((selection) =>
    buildComponent(
      request,
      selection,
      selection.regionIndex === 0 ? childIds : [],
      catalog,
      options,
    ),
  );

  const surface = {
    irVersion: "1.0",
    surfaceId: options.surfaceId,
    catalog: request.catalog,
    rootComponentId: "root",
    components,
    dataSources: {
      sourceData: request.sourceData,
    },
    actions: [],
    actionBindings: [],
    metadata: {
      scenario: request.plan.scenario,
      ...(request.context?.locale ? { locale: request.context.locale } : {}),
      ...(request.context?.theme ? { theme: request.context.theme } : {}),
    },
  } satisfies UISurfaceIR;

  const validation = validateUISurfaceIR(surface);
  if (!validation.success) {
    fail({
      code: "UI_IR_INVALID",
      message: validation.error.message,
      stage: "schema-validation",
      retryable: false,
      path: validation.error.path,
      constraint: validation.error.constraint,
    });
  }
  return validation.value;
}

export function buildSummaryUIIR(
  request: UICompileRequest,
  selection: SummarySelection,
  catalog: ComponentCatalog,
  options: CompileOptions,
): UISurfaceIR {
  return buildUIIR(request, [selection], catalog, options);
}
