import type { ComponentApi } from "@a2ui/web_core/v0_9";
import {
  AudioPlayerApi,
  ButtonApi,
  CardApi,
  CheckBoxApi,
  ChoicePickerApi,
  ColumnApi,
  DateTimeInputApi,
  DividerApi,
  IconApi,
  ImageApi,
  ListApi,
  ModalApi,
  RowApi,
  SliderApi,
  TabsApi,
  TextApi,
  TextFieldApi,
  VideoApi,
} from "@a2ui/web_core/v0_9/basic_catalog";
import {
  type A2UIValidationCatalog,
  validateA2UIComponents,
} from "@ag-ui/a2ui-toolkit";
import {
  infoRowApi,
  metricApi,
  statusBadgeApi,
} from "@generative-ui/a2ui-catalog";
import { PLATFORM_A2UI_CATALOG_ID } from "@generative-ui/shared-types";
import { zodToJsonSchema } from "zod-to-json-schema";

const basicComponentApis: readonly ComponentApi[] = [
  TextApi,
  ImageApi,
  IconApi,
  VideoApi,
  AudioPlayerApi,
  RowApi,
  ColumnApi,
  ListApi,
  CardApi,
  TabsApi,
  DividerApi,
  ModalApi,
  ButtonApi,
  TextFieldApi,
  CheckBoxApi,
  ChoicePickerApi,
  SliderApi,
  DateTimeInputApi,
];

/**
 * The Final Catalog generation boundary: CopilotKit Basic Catalog plus the
 * shared Platform Catalog definitions from `@generative-ui/a2ui-catalog`.
 * Workbench (renderer) and Runtime (generation validation) read the same
 * source, so the two boundaries cannot drift apart.
 */
const platformComponentApis: readonly ComponentApi[] = [
  metricApi,
  statusBadgeApi,
  infoRowApi,
];

function componentJsonSchema(api: ComponentApi): Record<string, unknown> {
  const propsSchema = zodToJsonSchema(api.schema, {
    $refStrategy: "none",
    target: "jsonSchema2019-09",
  }) as {
    additionalProperties?: boolean;
    properties?: Record<string, unknown>;
    required?: string[];
  };
  return {
    type: "object",
    properties: {
      id: { type: "string" },
      component: { const: api.name },
      ...propsSchema.properties,
    },
    required: ["id", "component", ...(propsSchema.required ?? [])],
    additionalProperties: propsSchema.additionalProperties ?? false,
  };
}

const allComponentApis = [...basicComponentApis, ...platformComponentApis];

export const dynamicA2uiCatalogSchema = Object.freeze({
  catalogId: PLATFORM_A2UI_CATALOG_ID,
  components: Object.freeze(
    Object.fromEntries(
      allComponentApis.map((api) => [api.name, componentJsonSchema(api)]),
    ),
  ),
});

export const dynamicA2uiValidationCatalog = {
  components: dynamicA2uiCatalogSchema.components,
} satisfies A2UIValidationCatalog;

export const DYNAMIC_A2UI_COMPONENT_NAMES = Object.freeze(
  Object.keys(dynamicA2uiCatalogSchema.components),
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Admit Native A2UI only when the complete snapshot is structurally valid,
 * targets the Catalog registered by Workbench, and contains a component tree
 * accepted by the same validation boundary used for Dynamic A2UI.
 */
export function isValidNativeA2uiSurface(content: unknown): boolean {
  if (!isRecord(content)) return false;
  const operations = content.a2ui_operations;
  if (!Array.isArray(operations) || operations.length === 0) return false;

  let surfaceId: string | undefined;
  let hasCreateSurface = false;
  let components: Array<Record<string, unknown>> | undefined;
  let data: Record<string, unknown> | undefined;

  const readSurfaceId = (operation: Record<string, unknown>) => {
    const candidate = operation.surfaceId;
    if (typeof candidate !== "string" || candidate.length === 0) return false;
    if (surfaceId !== undefined && surfaceId !== candidate) return false;
    surfaceId = candidate;
    return true;
  };

  for (const operation of operations) {
    if (!isRecord(operation) || operation.version !== "v0.9") return false;
    const operationKeys = [
      "createSurface",
      "updateComponents",
      "updateDataModel",
    ].filter((key) => key in operation);
    if (operationKeys.length !== 1) return false;

    if ("createSurface" in operation) {
      if (hasCreateSurface || !isRecord(operation.createSurface)) return false;
      if (!readSurfaceId(operation.createSurface)) return false;
      if (operation.createSurface.catalogId !== PLATFORM_A2UI_CATALOG_ID)
        return false;
      hasCreateSurface = true;
      continue;
    }

    if ("updateComponents" in operation) {
      if (components !== undefined || !isRecord(operation.updateComponents))
        return false;
      if (!readSurfaceId(operation.updateComponents)) return false;
      const candidateComponents = operation.updateComponents.components;
      if (
        !Array.isArray(candidateComponents) ||
        !candidateComponents.every(isRecord)
      )
        return false;
      components = candidateComponents;
      continue;
    }

    if (!isRecord(operation.updateDataModel)) return false;
    if (!readSurfaceId(operation.updateDataModel)) return false;
    if (
      operation.updateDataModel.path !== undefined &&
      typeof operation.updateDataModel.path !== "string"
    )
      return false;
    if (!("value" in operation.updateDataModel)) return false;
    if (
      (operation.updateDataModel.path === undefined ||
        operation.updateDataModel.path === "/") &&
      isRecord(operation.updateDataModel.value)
    ) {
      data = operation.updateDataModel.value;
    }
  }

  if (!hasCreateSurface || components === undefined) return false;
  return validateA2UIComponents({
    catalog: dynamicA2uiValidationCatalog,
    components,
    ...(data === undefined ? {} : { data }),
    validateBindings: true,
  }).valid;
}
