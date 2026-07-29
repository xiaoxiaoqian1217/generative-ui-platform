import {
  type A2UIComponent,
  type A2UIOperationSequence,
  type UISurfaceIR,
  validateA2UIOperationSequence,
} from "@generative-ui/compiler-contract";
import type { JsonValue } from "@generative-ui/shared-types";
import { fail } from "./failure.js";

function compileComponent(
  component: UISurfaceIR["components"][number],
  surface: UISurfaceIR,
): A2UIComponent {
  const output: Record<string, JsonValue> = {
    id: component.componentId,
    component: component.componentType,
    ...component.props,
  };

  if (component.children.length > 0) {
    output.children = component.children;
  }
  for (const [slot, componentIds] of Object.entries(component.slots ?? {})) {
    output[slot] = componentIds;
  }
  for (const binding of component.bindings ?? []) {
    const prefix =
      binding.source === "sourceData" ? "/sourceData" : "/derivedData";
    output[binding.prop] = {
      path: `${prefix}${binding.path}`,
    };
  }

  const actionBinding = surface.actionBindings.find(
    (binding) => binding.componentId === component.componentId,
  );
  if (actionBinding) {
    const action = surface.actions.find(
      (candidate) => candidate.actionId === actionBinding.actionId,
    );
    if (!action) {
      fail({
        code: "UI_IR_INVALID",
        message: "Component Action binding references a missing Action.",
        stage: "schema-validation",
        retryable: false,
        path: "/actionBindings",
        constraint: "action-reference",
      });
    }

    const context: Record<string, JsonValue> = {
      actionId: action.actionId,
      requiresApproval: action.requiresApproval,
      destructive: action.destructive,
    };
    for (const [parameterName, parameter] of Object.entries(
      action.payload ?? {},
    )) {
      context[parameterName] =
        parameter.kind === "source-binding"
          ? { path: `/sourceData${parameter.sourcePointer}` }
          : parameter.value;
    }
    output.action = {
      event: {
        name: action.actionType,
        context,
      },
    };
  }

  return output as A2UIComponent;
}

export function compileA2UI(surface: UISurfaceIR): A2UIOperationSequence {
  const operations = [
    {
      version: "v0.9",
      createSurface: {
        surfaceId: surface.surfaceId,
        catalogId: surface.catalog.catalogId,
        sendDataModel: false,
      },
    },
    {
      version: "v0.9",
      updateComponents: {
        surfaceId: surface.surfaceId,
        components: surface.components.map((component) =>
          compileComponent(component, surface),
        ),
      },
    },
    {
      version: "v0.9",
      updateDataModel: {
        surfaceId: surface.surfaceId,
        path: "/",
        value: surface.dataSources,
      },
    },
  ] satisfies A2UIOperationSequence;

  const validation = validateA2UIOperationSequence(operations);
  if (!validation.success) {
    fail({
      code: "A2UI_INVALID",
      message: validation.error.message,
      stage: "a2ui-validation",
      retryable: false,
      path: validation.error.path,
      constraint: validation.error.constraint,
    });
  }
  return validation.value;
}
