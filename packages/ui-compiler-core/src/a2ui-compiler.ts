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
): A2UIComponent {
  const output: Record<string, JsonValue> = {
    id: component.componentId,
    component: component.componentType,
    ...component.props,
  };

  if (component.children.length > 0) {
    output.children = component.children;
  }
  for (const [slot, references] of Object.entries(component.slots ?? {})) {
    output[slot] = references;
  }

  for (const binding of component.bindings ?? []) {
    const prefix =
      binding.source === "sourceData" ? "/sourceData" : "/derivedData";
    output[binding.prop] = {
      path: `${prefix}${binding.path}`,
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
        components: surface.components.map(compileComponent),
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
