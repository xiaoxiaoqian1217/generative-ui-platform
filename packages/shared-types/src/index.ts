import { type Static, Type } from "@sinclair/typebox";

/**
 * Catalog id of the merged Workbench A2UI catalog
 * (CopilotKit Basic Catalog + platform semantic components).
 *
 * The id is shared by the AGUIMock A2UI fixtures (`createSurface.catalogId`)
 * and the Web Workbench catalog registration, and intentionally does not
 * reuse the Basic Catalog id `https://a2ui.org/specification/v0_9/basic_catalog.json`.
 */
export const PLATFORM_A2UI_CATALOG_ID =
  "https://generative-ui.dev/a2ui/v0_9/platform_catalog.json";

export const jsonValueSchema = Type.Recursive(
  (jsonValue) =>
    Type.Union([
      Type.String(),
      Type.Number(),
      Type.Boolean(),
      Type.Null(),
      Type.Array(jsonValue),
      Type.Record(Type.String(), jsonValue),
    ]),
  {
    $id: "https://generative-ui.dev/schemas/shared/json-value/1.0",
  },
);

export type JsonValue = Static<typeof jsonValueSchema>;

export const validationErrorSchema = Type.Object(
  {
    code: Type.String({ minLength: 1 }),
    path: Type.String(),
    constraint: Type.String({ minLength: 1 }),
    message: Type.String({ minLength: 1 }),
  },
  {
    $id: "https://generative-ui.dev/schemas/shared/validation-error/1.0",
    additionalProperties: false,
  },
);

export type ValidationError = Static<typeof validationErrorSchema>;

export type ValidationResult<T, TCode extends string = string> =
  | {
      success: true;
      value: T;
    }
  | {
      success: false;
      error: ValidationError & {
        code: TCode;
      };
    };
