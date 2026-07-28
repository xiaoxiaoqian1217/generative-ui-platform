import {
  compileContextSchema,
  uiCompileRequestSchema,
} from "@generative-ui/compiler-contract";
import {
  catalogReferenceSchema,
  presentationErrorSchema,
  presentationResultSchema,
  uiPlanSchema,
} from "@generative-ui/presentation-contract";
import {
  jsonValueSchema,
  type ValidationResult,
} from "@generative-ui/shared-types";
import type { TSchema } from "@sinclair/typebox";
import { Ajv, type ErrorObject, type ValidateFunction } from "ajv";
import {
  type AGUICompileRequest,
  type AGUIEvent,
  type AGUIEventSequence,
  type AGUIRequestContext,
  agUICompileRequestBodySchema,
  agUICompileRequestSchema,
  agUIEventSchema,
  agUIEventSequenceSchema,
  consumablePresentationResultSchema,
  presentationErrorCustomEventSchema,
  presentationErrorPayloadSchema,
  presentationResultCustomEventSchema,
  presentationResultPayloadSchema,
  runErrorEventSchema,
  runFinishedEventSchema,
  runStartedEventSchema,
  stepFinishedEventSchema,
  stepStartedEventSchema,
} from "./schemas.js";

type AGUIValidationCode =
  | "AG_UI_REQUEST_INVALID"
  | "AG_UI_EVENT_INVALID"
  | "AG_UI_EVENT_SEQUENCE_INVALID";

const ajvOptions = {
  strict: true,
  allErrors: false,
  coerceTypes: false,
  removeAdditional: false,
  useDefaults: false,
  validateSchema: true,
  $data: false,
} as const;

const eventSchemas = [
  runStartedEventSchema,
  runFinishedEventSchema,
  runErrorEventSchema,
  stepStartedEventSchema,
  stepFinishedEventSchema,
  consumablePresentationResultSchema,
  presentationResultPayloadSchema,
  presentationErrorPayloadSchema,
  presentationResultCustomEventSchema,
  presentationErrorCustomEventSchema,
  agUIEventSchema,
];

const compileRequestSchemas = [
  catalogReferenceSchema,
  uiPlanSchema,
  compileContextSchema,
  uiCompileRequestSchema,
  agUICompileRequestBodySchema,
];

function failure<TCode extends AGUIValidationCode>(
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
    case "const":
      return "literal";
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
    default:
      return "contract";
  }
}

function createValidator<T, TCode extends AGUIValidationCode>(
  schema: TSchema,
  code: TCode,
  contractName: string,
  referencedSchemas: TSchema[],
): (input: unknown) => ValidationResult<T, TCode> {
  const ajv = new Ajv(ajvOptions);
  ajv.addSchema(jsonValueSchema);
  ajv.addSchema(presentationErrorSchema);
  ajv.addSchema(presentationResultSchema);
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

export const validateAGUIEvent = createValidator<
  AGUIEvent,
  "AG_UI_EVENT_INVALID"
>(
  agUIEventSchema,
  "AG_UI_EVENT_INVALID",
  "AG-UI Event",
  eventSchemas.filter((schema) => schema !== agUIEventSchema),
);

export const validateAGUICompileRequest = createValidator<
  AGUICompileRequest,
  "AG_UI_REQUEST_INVALID"
>(
  agUICompileRequestSchema,
  "AG_UI_REQUEST_INVALID",
  "AG-UI Compile Request",
  compileRequestSchemas,
);

const validateAGUIEventSequenceSchema = createValidator<
  AGUIEventSequence,
  "AG_UI_EVENT_SEQUENCE_INVALID"
>(
  agUIEventSequenceSchema,
  "AG_UI_EVENT_SEQUENCE_INVALID",
  "AG-UI Event Sequence",
  eventSchemas,
);

function sequenceFailure(
  path: string,
  constraint: string,
): ValidationResult<never, "AG_UI_EVENT_SEQUENCE_INVALID"> {
  return failure(
    "AG_UI_EVENT_SEQUENCE_INVALID",
    path,
    constraint,
    "AG-UI Event Sequence",
  );
}

export function validateAGUIEventSequence(
  input: unknown,
  expectedContext?: AGUIRequestContext,
): ValidationResult<AGUIEventSequence, "AG_UI_EVENT_SEQUENCE_INVALID"> {
  const schemaResult = validateAGUIEventSequenceSchema(input);
  if (!schemaResult.success) {
    return schemaResult;
  }

  const events = schemaResult.value;
  const firstEvent = events[0];
  const lastEvent = events.at(-1);
  if (firstEvent?.type !== "RUN_STARTED") {
    return sequenceFailure("/0", "run-started-first");
  }
  if (lastEvent?.type !== "RUN_FINISHED" && lastEvent?.type !== "RUN_ERROR") {
    return sequenceFailure(`/${events.length - 1}`, "terminal-event-last");
  }
  if (
    expectedContext !== undefined &&
    (firstEvent.threadId !== expectedContext.threadId ||
      firstEvent.runId !== expectedContext.runId)
  ) {
    return sequenceFailure("/0", "run-context-consistency");
  }

  const openSteps: string[] = [];
  let resultEventCount = 0;
  let errorEventCount = 0;

  for (const [index, event] of events.entries()) {
    if (index > 0 && event.type === "RUN_STARTED") {
      return sequenceFailure(`/${index}`, "single-run-started");
    }
    if (
      index < events.length - 1 &&
      (event.type === "RUN_FINISHED" || event.type === "RUN_ERROR")
    ) {
      return sequenceFailure(`/${index}`, "terminal-event-last");
    }

    if (event.type === "STEP_STARTED") {
      openSteps.push(event.stepName);
    } else if (event.type === "STEP_FINISHED") {
      const activeStep = openSteps.pop();
      if (activeStep !== event.stepName) {
        return sequenceFailure(`/${index}/stepName`, "step-pair-order");
      }
    } else if (
      event.type === "CUSTOM" &&
      event.name === "generative-ui.presentation-result"
    ) {
      if (
        expectedContext !== undefined &&
        event.value.result.requestId !== expectedContext.requestId
      ) {
        return sequenceFailure(
          `/${index}/value/result/requestId`,
          "request-correlation-consistency",
        );
      }
      resultEventCount += 1;
    } else if (
      event.type === "CUSTOM" &&
      event.name === "generative-ui.presentation-error"
    ) {
      errorEventCount += 1;
    }
  }

  if (openSteps.length > 0) {
    return sequenceFailure(`/${events.length - 1}`, "step-finished-required");
  }

  const penultimateEvent = events.at(-2);
  if (lastEvent.type === "RUN_FINISHED") {
    if (
      lastEvent.threadId !== firstEvent.threadId ||
      lastEvent.runId !== firstEvent.runId
    ) {
      return sequenceFailure(
        `/${events.length - 1}`,
        "run-correlation-consistency",
      );
    }
    if (
      resultEventCount !== 1 ||
      errorEventCount !== 0 ||
      penultimateEvent?.type !== "CUSTOM" ||
      penultimateEvent.name !== "generative-ui.presentation-result"
    ) {
      return sequenceFailure(
        `/${events.length - 2}`,
        "result-before-run-finished",
      );
    }
  } else if (
    errorEventCount !== 1 ||
    resultEventCount !== 0 ||
    penultimateEvent?.type !== "CUSTOM" ||
    penultimateEvent.name !== "generative-ui.presentation-error"
  ) {
    return sequenceFailure(`/${events.length - 2}`, "error-before-run-error");
  }

  return schemaResult;
}
