import {
  buildA2UIEnvelope,
  DEFAULT_SURFACE_ID,
  prepareA2UIRequest,
  runA2UIGenerationWithRecovery,
} from "@ag-ui/a2ui-toolkit";
import { type AbstractAgent, Middleware } from "@ag-ui/client";
import {
  type ActivitySnapshotEvent,
  type BaseEvent,
  EventType,
  type RunAgentInput,
} from "@ag-ui/core";
import { PLATFORM_A2UI_CATALOG_ID } from "@generative-ui/shared-types";
import { Observable } from "rxjs";
import {
  dynamicA2uiCatalogSchema,
  dynamicA2uiValidationCatalog,
  isValidNativeA2uiSurface,
} from "./dynamic-a2ui.js";
import type { InvokeSubagent } from "./secondary-llm.js";

export const A2UI_GENERATION_ERROR_ACTIVITY_TYPE = "a2ui-generation-error";

export type A2uiGenerationErrorCode =
  | "A2UI_GENERATION_FAILED"
  | "A2UI_GENERATION_UNAVAILABLE";

export interface A2uiGenerationErrorContent {
  readonly code: A2uiGenerationErrorCode;
  readonly errors?: readonly string[];
  readonly message: string;
}

/**
 * The Workbench -> Runtime presentation request channel (Issue #210):
 * `requestedMode` is only written by Workbench scenarios / tests, never by
 * the Secondary LLM; `clientCapabilities` carries the A2UI negotiation.
 */
export interface PresentationForwardedProps {
  readonly clientCapabilities?: {
    readonly a2ui?: boolean;
  };
  readonly requestedMode?: "dynamic";
}

export interface DynamicA2uiPresentationPolicyOptions {
  readonly invokeSubagent?: InvokeSubagent;
}

function readForwardedProps(
  forwardedProps: unknown,
): PresentationForwardedProps {
  if (typeof forwardedProps !== "object" || forwardedProps === null) return {};
  const props = forwardedProps as Record<string, unknown>;
  const capabilities = props.clientCapabilities;
  return {
    ...(props.requestedMode === "dynamic"
      ? { requestedMode: "dynamic" as const }
      : {}),
    ...(typeof capabilities === "object" && capabilities !== null
      ? {
          clientCapabilities: {
            a2ui: (capabilities as Record<string, unknown>).a2ui === true,
          },
        }
      : {}),
  };
}

const CONTROLLED_BUSINESS_ACTIVITY_TYPE = "inspection-summary";

function serializeControlledBusinessActivity(
  content: unknown,
): string | undefined {
  if (typeof content !== "object" || content === null || Array.isArray(content))
    return undefined;
  const record = content as Record<string, unknown>;
  if (
    typeof record.contentType !== "string" ||
    record.contentType.length === 0 ||
    typeof record.schemaVersion !== "string" ||
    record.schemaVersion.length === 0 ||
    typeof record.payload !== "object" ||
    record.payload === null
  )
    return undefined;
  try {
    return JSON.stringify(content);
  } catch {
    return undefined;
  }
}

function isSuccessfulRunFinished(event: BaseEvent): boolean {
  if (event.type !== EventType.RUN_FINISHED) return false;
  const outcome = (event as { outcome?: unknown }).outcome;
  if (outcome === undefined) return true;
  return (
    typeof outcome === "object" &&
    outcome !== null &&
    (outcome as { type?: unknown }).type === "success"
  );
}

/**
 * Thin, deterministic Presentation Policy (ADR-0030 whitelist, Issue #210
 * minimal subset):
 *
 * 1. Native A2UI Passthrough - a run that already produced an `a2ui-surface`
 *    activity is forwarded untouched, even under `requestedMode: "dynamic"`.
 * 2. Explicit `requestedMode: "dynamic"` (via forwardedProps) - a controlled
 *    business ACTIVITY_SNAPSHOT is validated and, at the successful
 *    RUN_FINISHED checkpoint, handed to the Secondary LLM through
 *    `runA2UIGenerationWithRecovery`; the resulting operations are stitched
 *    into the current run as an `a2ui-surface` ACTIVITY_SNAPSHOT.
 * 3. Plain Content Fallback - when the explicit mode is not executable
 *    (capability / configuration / content / generation failure), the
 *    original content is preserved and an explicit `a2ui-generation-error`
 *    activity is emitted instead of silently switching presentation paths.
 *
 * The policy never inspects natural language, never asks the Secondary LLM
 * whether to run, and only triggers once per run at the stable checkpoint.
 */
export class DynamicA2uiPresentationPolicy extends Middleware {
  readonly #invokeSubagent: InvokeSubagent | undefined;

  constructor(options: DynamicA2uiPresentationPolicyOptions) {
    super();
    this.#invokeSubagent = options.invokeSubagent;
  }

  override run(
    input: RunAgentInput,
    next: AbstractAgent,
  ): Observable<BaseEvent> {
    const props = readForwardedProps(input.forwardedProps);
    if (props.requestedMode !== "dynamic") {
      return this.runNext(input, next);
    }
    const invokeSubagent = this.#invokeSubagent;
    const activityMessageId = `dynamic-a2ui-${input.runId}`;

    return new Observable<BaseEvent>((subscriber) => {
      let hasNativeA2uiSurface = false;
      let hasRunError = false;
      let heldFinished: BaseEvent | undefined;
      let controlledBusinessContent: string | undefined;

      const emitGenerationError = (content: A2uiGenerationErrorContent) => {
        const event: ActivitySnapshotEvent = {
          activityType: A2UI_GENERATION_ERROR_ACTIVITY_TYPE,
          content: { ...content },
          messageId: activityMessageId,
          replace: true,
          type: EventType.ACTIVITY_SNAPSHOT,
        };
        subscriber.next(event);
      };

      const generateAndStitch = async (
        invoke: InvokeSubagent,
        businessContent: string,
      ) => {
        const prepared = prepareA2UIRequest({
          messages: [],
          state: {
            "ag-ui": {
              a2ui_schema: JSON.stringify(dynamicA2uiCatalogSchema),
              context: [
                {
                  description:
                    "Business content to present as one A2UI surface. Preserve every business fact exactly; do not invent, alter, or drop values.",
                  value: businessContent,
                },
              ],
            },
          },
        });
        if (prepared.error !== undefined) {
          emitGenerationError({
            code: "A2UI_GENERATION_FAILED",
            message: prepared.error,
          });
          return;
        }
        const result = await runA2UIGenerationWithRecovery({
          basePrompt: prepared.prompt,
          buildEnvelope: (args) =>
            buildA2UIEnvelope({
              args,
              defaultCatalogId: PLATFORM_A2UI_CATALOG_ID,
              defaultSurfaceId: DEFAULT_SURFACE_ID,
              isUpdate: prepared.isUpdate,
            }),
          catalog: dynamicA2uiValidationCatalog,
          config: { maxAttempts: 2 },
          invokeSubagent: invoke,
        });
        if (!result.ok) {
          emitGenerationError({
            code: "A2UI_GENERATION_FAILED",
            errors: result.attempts.flatMap((attempt) =>
              attempt.errors.map(
                (error) => `[${error.code}] ${error.path}: ${error.message}`,
              ),
            ),
            message:
              "Dynamic A2UI generation did not satisfy the catalog boundary.",
          });
          return;
        }
        const event: ActivitySnapshotEvent = {
          activityType: "a2ui-surface",
          content: JSON.parse(result.envelope) as Record<string, unknown>,
          messageId: activityMessageId,
          replace: true,
          type: EventType.ACTIVITY_SNAPSHOT,
        };
        subscriber.next(event);
      };

      const presentControlledActivity = async () => {
        try {
          if (hasNativeA2uiSurface) return;
          if (props.clientCapabilities?.a2ui !== true) {
            emitGenerationError({
              code: "A2UI_GENERATION_UNAVAILABLE",
              message:
                "The client did not declare A2UI capability for the requested dynamic presentation.",
            });
            return;
          }
          if (invokeSubagent === undefined) {
            emitGenerationError({
              code: "A2UI_GENERATION_UNAVAILABLE",
              message:
                "A2UI Secondary LLM is not configured (A2UI_SECONDARY_LLM_API_KEY).",
            });
            return;
          }
          if (controlledBusinessContent === undefined) {
            emitGenerationError({
              code: "A2UI_GENERATION_FAILED",
              message:
                "The run did not produce a valid inspection-summary ACTIVITY_SNAPSHOT with contentType, schemaVersion, and payload.",
            });
            return;
          }
          await generateAndStitch(invokeSubagent, controlledBusinessContent);
        } catch (error) {
          emitGenerationError({
            code: "A2UI_GENERATION_FAILED",
            message:
              error instanceof Error
                ? error.message
                : "Dynamic A2UI generation failed.",
          });
        }
      };

      const subscription = this.runNext(input, next).subscribe({
        complete: () => {
          const finished = heldFinished;
          if (
            finished === undefined ||
            hasRunError ||
            !isSuccessfulRunFinished(finished)
          ) {
            if (finished !== undefined) subscriber.next(finished);
            subscriber.complete();
            return;
          }
          void presentControlledActivity().finally(() => {
            subscriber.next(finished);
            subscriber.complete();
          });
        },
        error: (error: unknown) => subscriber.error(error),
        next: (event) => {
          if (event.type === EventType.RUN_FINISHED) {
            heldFinished = event;
            return;
          }
          if (event.type === EventType.RUN_ERROR) hasRunError = true;
          if (
            event.type === EventType.ACTIVITY_SNAPSHOT &&
            event.activityType === CONTROLLED_BUSINESS_ACTIVITY_TYPE
          ) {
            controlledBusinessContent = serializeControlledBusinessActivity(
              event.content,
            );
          }
          if (
            event.type === EventType.ACTIVITY_SNAPSHOT &&
            event.activityType === "a2ui-surface"
          ) {
            if (isValidNativeA2uiSurface(event.content)) {
              hasNativeA2uiSurface = true;
            } else {
              emitGenerationError({
                code: "A2UI_GENERATION_FAILED",
                message:
                  "Native A2UI operations did not satisfy the registered Catalog boundary.",
              });
              return;
            }
          }
          subscriber.next(event);
        },
      });
      return () => subscription.unsubscribe();
    });
  }
}
