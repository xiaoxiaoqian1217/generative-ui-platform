import type {
  ComponentIR,
  PropBindingIR,
  UICompileRequest,
  UISurfaceIR,
} from "@generative-ui/compiler-contract";
import { validateUISurfaceIR } from "@generative-ui/compiler-contract";
import {
  type ComponentCatalog,
  type ComponentDefinition,
  validateComponentProps,
} from "@generative-ui/component-catalog-schema";
import type { JsonValue } from "@generative-ui/shared-types";
import type { SummarySelection } from "./component-selection.js";
import { fail } from "./failure.js";
import type { CompileOptions } from "./types.js";

interface ResolvedPointer {
  found: boolean;
  value?: JsonValue;
}

const summaryComponentMappings = {
  Card: {
    purposeProp: "title",
    bindingProps: {
      title: "title",
      content: "content",
    },
  },
  Text: {
    bindingProps: {
      title: "text",
      content: "text",
    },
  },
  List: {
    bindingProps: {
      collection: "items",
    },
  },
} as const;

function resolveJsonPointer(
  sourceData: JsonValue,
  pointer: string,
): ResolvedPointer {
  let current: JsonValue = sourceData;
  for (const encodedSegment of pointer.slice(1).split("/")) {
    const segment = encodedSegment.replaceAll("~1", "/").replaceAll("~0", "~");
    if (Array.isArray(current)) {
      if (!/^(?:0|[1-9][0-9]*)$/.test(segment)) {
        return { found: false };
      }
      const index = Number(segment);
      if (!Object.hasOwn(current, index)) {
        return { found: false };
      }
      current = current[index] as JsonValue;
      continue;
    }
    if (
      current === null ||
      typeof current !== "object" ||
      !Object.hasOwn(current, segment)
    ) {
      return { found: false };
    }
    current = current[segment] as JsonValue;
  }
  return { found: true, value: current };
}

function summaryMapping(component: ComponentDefinition) {
  return summaryComponentMappings[
    component.componentType as keyof typeof summaryComponentMappings
  ];
}

function buildComponent(
  request: UICompileRequest,
  selection: SummarySelection,
  catalog: ComponentCatalog,
  options: CompileOptions,
): ComponentIR {
  const props: Record<string, JsonValue> = {};
  const resolvedProps: Record<string, JsonValue> = {};
  const mapping = summaryMapping(selection.component);
  if (!mapping) {
    fail({
      code: "NO_COMPATIBLE_COMPONENT",
      message: "The selected component has no authorized summary mapping.",
      stage: "component-selection",
      retryable: false,
      path: "/plan/regions/0/componentPreferences",
      constraint: "core-summary-component-mapping",
    });
  }

  const bindings: PropBindingIR[] = [];
  const boundProps = new Set<string>();
  for (const binding of selection.region.bindings) {
    const prop = (
      mapping.bindingProps as Partial<Record<typeof binding.role, string>>
    )[binding.role];
    if (!prop || boundProps.has(prop)) {
      fail({
        code: "PROPS_RESOLUTION_FAILED",
        message: "Summary binding cannot be mapped to a unique component Prop.",
        stage: "props-resolution",
        retryable: false,
        path: "/plan/regions/0/bindings",
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
        message: "Summary binding does not resolve against sourceData.",
        stage: "props-resolution",
        retryable: false,
        path: "/plan/regions/0/bindings",
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

  if ("purposeProp" in mapping && !boundProps.has(mapping.purposeProp)) {
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
      path: `/components/root/props${propsResult.error.path}`,
      constraint: propsResult.error.constraint,
    });
  }

  return {
    componentId: "root",
    componentType: selection.component.componentType,
    props,
    ...(bindings.length > 0 ? { bindings } : {}),
    children: [],
    layout: {
      flow: selection.region.layout.flow,
      density: selection.region.layout.density,
      ...(selection.region.layout.minColumns !== undefined
        ? { columns: selection.region.layout.minColumns }
        : {}),
    },
    sourceRegionIds: [selection.region.regionId],
  };
}

export function buildSummaryUIIR(
  request: UICompileRequest,
  selection: SummarySelection,
  catalog: ComponentCatalog,
  options: CompileOptions,
): UISurfaceIR {
  const surface = {
    irVersion: "1.0",
    surfaceId: options.surfaceId,
    catalog: request.catalog,
    rootComponentId: "root",
    components: [buildComponent(request, selection, catalog, options)],
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
