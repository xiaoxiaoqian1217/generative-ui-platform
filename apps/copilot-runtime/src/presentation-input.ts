/**
 * Source-neutral PresentationInput (Issue #213).
 *
 * The single input contract consumed by the Presentation layer. It is
 * produced by the thin AgentContent Projection from native AG-UI events
 * (or hand-authored in scenario fixtures) and never carries source-specific
 * fields such as `sdar.*`. Declared next to its only consumer inside the
 * copilot-runtime presentation boundary; not a cross-module contract.
 */

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface StructuredPresentationContent {
  readonly kind: "structured";
  readonly mediaType: "application/json";
  readonly value: JsonValue;
  readonly artifactId?: string;
}

export interface TextPresentationContent {
  readonly kind: "text";
  readonly value: string;
}

export type PresentationContent =
  | StructuredPresentationContent
  | TextPresentationContent;

/**
 * `stable` is only reached when the source published an explicit terminal
 * state; a bare successful RUN_FINISHED is merely `observation-ended`.
 */
export type PresentationLifecycle =
  | "stable"
  | "observation-ended"
  | "interrupted"
  | "failed";

export interface PresentationProvenance {
  readonly eventType: string;
  readonly eventName?: string;
  readonly messageId?: string;
}

export interface PresentationInput {
  readonly content: PresentationContent;
  readonly context: {
    readonly task?: JsonValue;
    readonly allowedActions: readonly string[];
  };
  readonly lifecycle: PresentationLifecycle;
  readonly provenance: readonly PresentationProvenance[];
}

const LIFECYCLES: readonly PresentationLifecycle[] = [
  "stable",
  "observation-ended",
  "interrupted",
  "failed",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (isRecord(value)) return Object.values(value).every(isJsonValue);
  return false;
}

/**
 * Structural admission of an untrusted PresentationInput (scenario fixture,
 * projection output). Throws on the first violated invariant.
 */
export function parsePresentationInput(value: unknown): PresentationInput {
  if (!isRecord(value)) throw new Error("PRESENTATION_INPUT_NOT_AN_OBJECT");
  const content = value.content;
  if (!isRecord(content)) throw new Error("PRESENTATION_INPUT_CONTENT_INVALID");
  if (content.kind === "structured") {
    if (content.mediaType !== "application/json" || !isJsonValue(content.value))
      throw new Error("PRESENTATION_INPUT_STRUCTURED_CONTENT_INVALID");
  } else if (content.kind === "text") {
    if (typeof content.value !== "string")
      throw new Error("PRESENTATION_INPUT_TEXT_CONTENT_INVALID");
  } else {
    throw new Error("PRESENTATION_INPUT_CONTENT_KIND_UNKNOWN");
  }
  const context = value.context;
  if (
    !isRecord(context) ||
    !Array.isArray(context.allowedActions) ||
    !context.allowedActions.every((action) => typeof action === "string")
  )
    throw new Error("PRESENTATION_INPUT_CONTEXT_INVALID");
  if (
    typeof value.lifecycle !== "string" ||
    !LIFECYCLES.includes(value.lifecycle as PresentationLifecycle)
  )
    throw new Error("PRESENTATION_INPUT_LIFECYCLE_INVALID");
  if (
    !Array.isArray(value.provenance) ||
    !value.provenance.every(
      (entry) => isRecord(entry) && typeof entry.eventType === "string",
    )
  )
    throw new Error("PRESENTATION_INPUT_PROVENANCE_INVALID");
  return value as unknown as PresentationInput;
}

/**
 * Deterministic serialization handed to the Secondary LLM. Structured
 * content is stringified verbatim so every business fact reaches the model
 * exactly; text content passes through untouched.
 */
export function serializePresentationInputContent(
  input: PresentationInput,
): string {
  return input.content.kind === "text"
    ? input.content.value
    : JSON.stringify(input.content.value);
}
