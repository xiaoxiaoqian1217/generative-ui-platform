/**
 * The explicit presentation request a quick scenario may carry (Issue #210).
 *
 * It is not a session mode and never a user-facing switch: everyday natural
 * language input carries no request, and the Runtime deterministic
 * presentation policy decides the presentation path per content unit
 * (Native A2UI Passthrough / explicit request / Plain Content Fallback).
 * The Issue reserves `auto | fixed | text` for later phases; only the
 * dynamic request is implemented now.
 */
export type RequestedPresentationMode = "dynamic";

export interface PresentationForwardedProps {
  readonly clientCapabilities: {
    readonly a2ui: true;
  };
  readonly requestedMode: RequestedPresentationMode;
}

/**
 * Map a scenario's presentation request onto AG-UI forwardedProps,
 * composing it with the Workbench A2UI capability declaration.
 * Returns `undefined` when the scenario makes no explicit request, so
 * ordinary runs stay untouched.
 */
export function presentationForwardedProps(
  mode: RequestedPresentationMode | undefined,
): PresentationForwardedProps | undefined {
  if (mode !== "dynamic") return undefined;
  return {
    clientCapabilities: { a2ui: true },
    requestedMode: "dynamic",
  };
}
