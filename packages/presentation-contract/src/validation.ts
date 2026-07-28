import {
  jsonValueSchema,
  type ValidationResult,
} from "@generative-ui/shared-types";
import type { TSchema } from "@sinclair/typebox";
import { Ajv, type ErrorObject, type ValidateFunction } from "ajv";
import {
  type AgentContent,
  agentContentSchema,
  type PresentationDecision,
  type PresentationRequest,
  type PresentationResult,
  presentationDecisionSchema,
  presentationErrorSchema,
  presentationRequestSchema,
  presentationResultSchema,
  type UIPlan,
  uiPlanSchema,
} from "./schemas.js";

const ajvOptions = {
  strict: true,
  allErrors: false,
  coerceTypes: false,
  removeAdditional: false,
  useDefaults: false,
  validateSchema: true,
  $data: false,
} as const;

type PresentationValidationCode =
  | "PRESENTATION_REQUEST_INVALID"
  | "PRESENTATION_DECISION_INVALID"
  | "PRESENTATION_RESULT_INVALID"
  | "UI_PLAN_INVALID";

function failure<TCode extends PresentationValidationCode>(
  code: TCode,
  path: string,
  constraint: string,
  contractName: string,
): ValidationResult<never, TCode> {
  return {
    success: false,
    error: {
      code,
      path,
      constraint,
      message: `${contractName} does not match its contract.`,
    },
  };
}

function normalizeConstraint(error: ErrorObject | undefined): string {
  switch (error?.keyword) {
    case "additionalProperties":
      return "additional-properties";
    case "required":
      return "required";
    case "type":
      return "type";
    case "anyOf":
      return "union";
    case "minLength":
      return "minimum-length";
    case "minItems":
      return "minimum-items";
    case "pattern":
      return "format";
    default:
      return "contract";
  }
}

function createValidator<T, TCode extends PresentationValidationCode>(
  schema: TSchema,
  code: TCode,
  contractName: string,
  referencedSchemas: TSchema[] = [],
): (input: unknown) => ValidationResult<T, TCode> {
  const ajv = new Ajv(ajvOptions);
  ajv.addSchema(jsonValueSchema);
  for (const referencedSchema of referencedSchemas) {
    ajv.addSchema(referencedSchema);
  }
  const validate: ValidateFunction = ajv.compile(schema);

  return (input) => {
    if (validate(input)) {
      return {
        success: true,
        value: input as T,
      };
    }

    const firstError = validate.errors?.[0];
    return failure(
      code,
      firstError?.instancePath ?? "",
      normalizeConstraint(firstError),
      contractName,
    );
  };
}

export const validateAgentContent = createValidator<
  AgentContent,
  "PRESENTATION_REQUEST_INVALID"
>(agentContentSchema, "PRESENTATION_REQUEST_INVALID", "Agent Content");

export const validatePresentationRequest = createValidator<
  PresentationRequest,
  "PRESENTATION_REQUEST_INVALID"
>(
  presentationRequestSchema,
  "PRESENTATION_REQUEST_INVALID",
  "Presentation Request",
);

const validateUIPlanSchema = createValidator<UIPlan, "UI_PLAN_INVALID">(
  uiPlanSchema,
  "UI_PLAN_INVALID",
  "UI Plan Candidate",
);

function validateUIPlanSemantics<TCode extends PresentationValidationCode>(
  plan: UIPlan,
  code: TCode,
  pathPrefix: string,
  contractName: string,
): ValidationResult<UIPlan, TCode> {
  const regionIds = new Set<string>();
  const actionIds = new Set<string>();

  for (const [regionIndex, region] of plan.regions.entries()) {
    if (regionIds.has(region.regionId)) {
      return failure(
        code,
        `${pathPrefix}/regions/${regionIndex}/regionId`,
        "unique-region-id",
        contractName,
      );
    }
    regionIds.add(region.regionId);

    if (
      region.layout.minColumns !== undefined &&
      region.layout.maxColumns !== undefined &&
      region.layout.minColumns > region.layout.maxColumns
    ) {
      return failure(
        code,
        `${pathPrefix}/regions/${regionIndex}/layout`,
        "layout-column-range",
        contractName,
      );
    }

    for (const [actionIndex, action] of (region.actions ?? []).entries()) {
      if (actionIds.has(action.actionId)) {
        return failure(
          code,
          `${pathPrefix}/regions/${regionIndex}/actions/${actionIndex}/actionId`,
          "unique-action-id",
          contractName,
        );
      }
      actionIds.add(action.actionId);
    }
  }

  for (const [regionIndex, region] of plan.regions.entries()) {
    for (const [actionIndex, action] of (region.actions ?? []).entries()) {
      if (
        action.targetRegionId !== undefined &&
        !regionIds.has(action.targetRegionId)
      ) {
        return failure(
          code,
          `${pathPrefix}/regions/${regionIndex}/actions/${actionIndex}/targetRegionId`,
          "action-target-reference",
          contractName,
        );
      }
    }
  }

  return {
    success: true,
    value: plan,
  };
}

export function validateUIPlan(
  input: unknown,
): ValidationResult<UIPlan, "UI_PLAN_INVALID"> {
  const result = validateUIPlanSchema(input);
  if (!result.success) {
    return result;
  }

  return validateUIPlanSemantics(
    result.value,
    "UI_PLAN_INVALID",
    "",
    "UI Plan Candidate",
  );
}

const validatePresentationDecisionSchema = createValidator<
  PresentationDecision,
  "PRESENTATION_DECISION_INVALID"
>(
  presentationDecisionSchema,
  "PRESENTATION_DECISION_INVALID",
  "Presentation Decision",
);

export function validatePresentationDecision(
  input: unknown,
): ValidationResult<PresentationDecision, "PRESENTATION_DECISION_INVALID"> {
  const result = validatePresentationDecisionSchema(input);
  if (!result.success || result.value.mode === "markdown") {
    return result;
  }

  const planResult = validateUIPlanSemantics(
    result.value.plan,
    "PRESENTATION_DECISION_INVALID",
    "/plan",
    "Presentation Decision",
  );
  if (!planResult.success) {
    return planResult;
  }

  return result;
}

export const validatePresentationResult = createValidator<
  PresentationResult,
  "PRESENTATION_RESULT_INVALID"
>(
  presentationResultSchema,
  "PRESENTATION_RESULT_INVALID",
  "Presentation Result",
  [presentationErrorSchema],
);
