import type { AGUIEvent, RunAgentInput } from "@ag-ui/core";
import type { z } from "zod";
import {
  agUIEventSchema,
  agUIEventSequenceSchema,
  agUIRunInputSchema,
} from "./schemas.js";

export type AGUIValidationResult<T> =
  | { readonly success: true; readonly value: T }
  | {
      readonly success: false;
      readonly error: {
        readonly code:
          | "AG_UI_EVENT_INVALID"
          | "AG_UI_EVENT_SEQUENCE_INVALID"
          | "AG_UI_RUN_INPUT_INVALID";
        readonly message: string;
        readonly path: string;
      };
    };

function validationFailure(
  code: Extract<
    AGUIValidationResult<never>,
    { success: false }
  >["error"]["code"],
  error: z.ZodError,
): AGUIValidationResult<never> {
  const issue = error.issues[0];
  return {
    success: false,
    error: {
      code,
      message: issue?.message ?? "Value does not match the AG-UI contract.",
      path: issue === undefined ? "" : `/${issue.path.join("/")}`,
    },
  };
}

export function validateAGUIRunInput(
  input: unknown,
): AGUIValidationResult<RunAgentInput> {
  const parsed = agUIRunInputSchema.safeParse(input);
  return parsed.success
    ? { success: true, value: parsed.data }
    : validationFailure("AG_UI_RUN_INPUT_INVALID", parsed.error);
}

export function validateAGUIEvent(
  input: unknown,
): AGUIValidationResult<AGUIEvent> {
  const parsed = agUIEventSchema.safeParse(input);
  return parsed.success
    ? { success: true, value: parsed.data }
    : validationFailure("AG_UI_EVENT_INVALID", parsed.error);
}

function sequenceFailure(message: string, path: string) {
  return {
    success: false as const,
    error: {
      code: "AG_UI_EVENT_SEQUENCE_INVALID" as const,
      message,
      path,
    },
  };
}

export function validateAGUIEventSequence(
  input: unknown,
): AGUIValidationResult<readonly AGUIEvent[]> {
  const parsed = agUIEventSequenceSchema.safeParse(input);
  if (!parsed.success)
    return validationFailure("AG_UI_EVENT_SEQUENCE_INVALID", parsed.error);

  const events = parsed.data;
  const first = events[0];
  const last = events.at(-1);
  if (first?.type !== "RUN_STARTED")
    return sequenceFailure("RUN_STARTED must be the first event.", "/0");
  if (last?.type !== "RUN_FINISHED" && last?.type !== "RUN_ERROR")
    return sequenceFailure(
      "RUN_FINISHED or RUN_ERROR must be the last event.",
      `/${events.length - 1}`,
    );

  for (const [index, event] of events.entries()) {
    if (index > 0 && event.type === "RUN_STARTED")
      return sequenceFailure("A run can start only once.", `/${index}`);
    if (
      index < events.length - 1 &&
      (event.type === "RUN_FINISHED" || event.type === "RUN_ERROR")
    )
      return sequenceFailure("A terminal event must be last.", `/${index}`);
  }

  if (
    last.type === "RUN_FINISHED" &&
    (last.threadId !== first.threadId || last.runId !== first.runId)
  )
    return sequenceFailure(
      "Run correlation must remain stable.",
      `/${events.length - 1}`,
    );

  return { success: true, value: events };
}
