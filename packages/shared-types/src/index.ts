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

/**
 * Public, user-visible plan for map work.
 *
 * This contract contains an Agent-authored goal and execution explanation.
 * It intentionally excludes private reasoning. `operationNames` correlates a
 * semantic plan stage with the Frontend Tool events that provide action facts
 * and completion evidence.
 */
export const MAP_PLAN_ACTIVITY_TYPE = "map-plan";
export const MAP_PLAN_ACTIVITY_SCHEMA_VERSION = "1.0";

export const MAP_PLAN_STATUSES = [
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
] as const;

export type MapPlanStatus = (typeof MAP_PLAN_STATUSES)[number];

export interface MapPlanActivityStep {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  readonly operationNames: readonly string[];
  readonly status: MapPlanStatus;
}

export interface MapPlanActivityContent {
  readonly schemaVersion: typeof MAP_PLAN_ACTIVITY_SCHEMA_VERSION;
  readonly goal: string;
  readonly status: MapPlanStatus;
  readonly steps: readonly MapPlanActivityStep[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMapPlanStatus(value: unknown): value is MapPlanStatus {
  return (
    typeof value === "string" &&
    MAP_PLAN_STATUSES.includes(value as MapPlanStatus)
  );
}

function isMapPlanStep(value: unknown): value is MapPlanActivityStep {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.label === "string" &&
    value.label.length > 0 &&
    typeof value.detail === "string" &&
    value.detail.length > 0 &&
    Array.isArray(value.operationNames) &&
    value.operationNames.length > 0 &&
    value.operationNames.every(
      (operationName) =>
        typeof operationName === "string" && operationName.length > 0,
    ) &&
    isMapPlanStatus(value.status)
  );
}

export function isMapPlanActivityContent(
  value: unknown,
): value is MapPlanActivityContent {
  if (!isRecord(value)) return false;
  return (
    value.schemaVersion === MAP_PLAN_ACTIVITY_SCHEMA_VERSION &&
    typeof value.goal === "string" &&
    value.goal.length > 0 &&
    isMapPlanStatus(value.status) &&
    Array.isArray(value.steps) &&
    value.steps.length > 0 &&
    value.steps.every(isMapPlanStep)
  );
}
