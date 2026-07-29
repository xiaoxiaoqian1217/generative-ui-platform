import type {
  ActionIR,
  ComponentActionBindingIR,
  ComponentIR,
  PropBindingIR,
  UICompileRequest,
  UISurfaceIR,
} from "@generative-ui/compiler-contract";
import { validateUISurfaceIR } from "@generative-ui/compiler-contract";
import {
  type ActionDefinition,
  type ComponentCatalog,
  validateActionPayload,
  validateComponentProps,
} from "@generative-ui/component-catalog-schema";
import type { JsonValue } from "@generative-ui/shared-types";
import { componentMapping } from "./component-mappings.js";
import type { ComponentSelection } from "./component-selection.js";
import { fail } from "./failure.js";
import { resolveJsonPointer } from "./json-pointer.js";
import { normalizeLayout } from "./layout.js";
import type { CompileOptions } from "./types.js";

interface LoweredActions {
  actions: ActionIR[];
  actionBindings: ComponentActionBindingIR[];
}

function componentId(regionIndex: number): string {
  return regionIndex === 0 ? "root" : `region-${regionIndex}`;
}

function actionError(
  code: "ACTION_BINDING_UNRESOLVED" | "ACTION_PAYLOAD_INVALID",
  message: string,
  path: string,
  constraint: string,
  stage: "action-binding" | "schema-validation" = "action-binding",
): never {
  return fail({
    code,
    message,
    stage,
    retryable: false,
    path,
    constraint,
  });
}

function targetAction(
  request: UICompileRequest,
  regionId: string,
):
  | NonNullable<UICompileRequest["plan"]["regions"][number]["actions"]>[number]
  | undefined {
  const actions = request.plan.regions.flatMap((ownerRegion) =>
    (ownerRegion.actions ?? []).filter(
      (action) => (action.targetRegionId ?? ownerRegion.regionId) === regionId,
    ),
  );
  if (actions.length > 1) {
    actionError(
      "ACTION_BINDING_UNRESOLVED",
      "A component cannot own more than one Action in the MVP.",
      "/plan/regions",
      "single-component-action",
      "schema-validation",
    );
  }
  return actions[0];
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
  const mapping = componentMapping(selection.component);
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

  const action = targetAction(request, selection.region.regionId);
  if (mapping.actionLabelProp && action) {
    props[mapping.actionLabelProp] = action.label;
    resolvedProps[mapping.actionLabelProp] = action.label;
    boundProps.add(mapping.actionLabelProp);
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

function actionDefinition(
  catalog: ComponentCatalog,
  actionType: string,
  path: string,
): ActionDefinition {
  const definition = catalog.actions.find(
    (candidate) => candidate.actionType === actionType,
  );
  if (!definition) {
    actionError(
      "ACTION_BINDING_UNRESOLVED",
      "The Action type is not declared by the active Catalog.",
      path,
      "catalog-action-type",
      "schema-validation",
    );
  }
  return definition;
}

function lowerActions(
  request: UICompileRequest,
  selections: ComponentSelection[],
  catalog: ComponentCatalog,
  options: CompileOptions,
): LoweredActions {
  const actions: ActionIR[] = [];
  const actionBindings: ComponentActionBindingIR[] = [];
  const boundComponents = new Set<string>();

  for (const [
    ownerRegionIndex,
    ownerRegion,
  ] of request.plan.regions.entries()) {
    for (const [actionIndex, action] of (ownerRegion.actions ?? []).entries()) {
      const actionPath = `/plan/regions/${ownerRegionIndex}/actions/${actionIndex}`;
      const targetRegionId = action.targetRegionId ?? ownerRegion.regionId;
      const target = selections.find(
        (selection) => selection.region.regionId === targetRegionId,
      );
      if (!target) {
        actionError(
          "ACTION_BINDING_UNRESOLVED",
          "The Action target cannot be resolved to a selected component.",
          `${actionPath}/targetRegionId`,
          "action-target-component",
          "schema-validation",
        );
      }

      const definition = actionDefinition(
        catalog,
        action.actionType,
        `${actionPath}/actionType`,
      );
      if (!target.component.allowedActions.includes(action.actionType)) {
        actionError(
          "ACTION_BINDING_UNRESOLVED",
          "The target component does not permit this Action type.",
          `${actionPath}/targetRegionId`,
          "component-action-permission",
          "schema-validation",
        );
      }
      if (
        action.destructive !== definition.destructive ||
        action.requiresApproval !== definition.requiresApproval
      ) {
        actionError(
          "ACTION_BINDING_UNRESOLVED",
          "Action safety flags do not match the active Catalog.",
          actionPath,
          "catalog-action-safety",
          "schema-validation",
        );
      }

      const targetComponentId = componentId(target.regionIndex);
      if (boundComponents.has(targetComponentId)) {
        actionError(
          "ACTION_BINDING_UNRESOLVED",
          "A component cannot own more than one Action in the MVP.",
          `${actionPath}/targetRegionId`,
          "single-component-action",
          "schema-validation",
        );
      }

      const payload: NonNullable<ActionIR["payload"]> = {};
      const resolvedPayload: Record<string, JsonValue> = {};
      for (const [parameterName, parameter] of Object.entries(
        action.payload ?? {},
      )) {
        if (
          parameterName === "actionId" ||
          parameterName === "requiresApproval" ||
          parameterName === "destructive"
        ) {
          actionError(
            "ACTION_PAYLOAD_INVALID",
            "Action payload uses a reserved Envelope context key.",
            `${actionPath}/payload/${parameterName}`,
            "reserved-action-context",
          );
        }

        if (parameter.kind === "source-binding") {
          const resolved = resolveJsonPointer(
            request.sourceData,
            parameter.sourcePointer,
          );
          if (!resolved.found || resolved.value === undefined) {
            actionError(
              "ACTION_PAYLOAD_INVALID",
              "Action payload binding does not resolve against sourceData.",
              `${actionPath}/payload/${parameterName}/sourcePointer`,
              "action-data-binding-reference",
            );
          }
          resolvedPayload[parameterName] = resolved.value;
          payload[parameterName] = parameter;
          continue;
        }

        if (parameter.value === null) {
          actionError(
            "ACTION_PAYLOAD_INVALID",
            "Action literal cannot be represented as an A2UI DynamicValue.",
            `${actionPath}/payload/${parameterName}/value`,
            "a2ui-dynamic-value",
          );
        }
        resolvedPayload[parameterName] = parameter.value;
        payload[parameterName] = {
          kind: "literal",
          value: parameter.value,
        };
      }

      const payloadResult = validateActionPayload(
        catalog,
        action.actionType,
        resolvedPayload,
        options.limits.catalogSchema,
      );
      if (!payloadResult.success) {
        fail({
          code: payloadResult.error.code,
          message: payloadResult.error.message,
          stage: "action-binding",
          retryable: false,
          path: `${actionPath}/payload${payloadResult.error.path}`,
          constraint: payloadResult.error.constraint,
        });
      }

      actions.push({
        actionId: action.actionId,
        actionType: action.actionType,
        label: action.label,
        ...(Object.keys(payload).length > 0 ? { payload } : {}),
        requiresApproval: action.requiresApproval,
        destructive: action.destructive,
      });
      actionBindings.push({
        componentId: targetComponentId,
        actionId: action.actionId,
        event:
          target.component.componentType === "Form" ||
          action.actionType === "submit"
            ? "submit"
            : "click",
      });
      boundComponents.add(targetComponentId);
    }
  }

  return { actions, actionBindings };
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
  const loweredActions = lowerActions(request, selections, catalog, options);

  const surface = {
    irVersion: "1.0",
    surfaceId: options.surfaceId,
    catalog: request.catalog,
    rootComponentId: "root",
    components,
    dataSources: {
      sourceData: request.sourceData,
    },
    actions: loweredActions.actions,
    actionBindings: loweredActions.actionBindings,
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
