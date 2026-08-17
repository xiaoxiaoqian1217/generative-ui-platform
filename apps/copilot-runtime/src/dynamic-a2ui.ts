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
import type { A2UIValidationCatalog } from "@ag-ui/a2ui-toolkit";
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
