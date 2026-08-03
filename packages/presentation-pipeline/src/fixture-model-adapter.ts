import type { ComponentCatalog } from "@generative-ui/component-catalog-schema";
import type {
  ModelAdapter,
  ModelCallOptions,
  ModelPresentationRequest,
} from "./presentation-router.js";
import { ModelAdapterError } from "./presentation-router.js";

export const FIXTURE_COMPONENT_CATALOG = Object.freeze({
  schemaVersion: "1.0",
  catalogId: "fixture",
  catalogVersion: "1.0.0",
  components: [
    {
      componentType: "Card",
      displayName: "Card",
      description: "Groups deterministic fixture summary content.",
      category: "common",
      domainTags: [],
      propsSchema: {
        $schema: "http://json-schema.org/draft-07/schema#",
        type: "object",
        properties: {
          title: { type: "string" },
          content: { type: ["object", "array"] },
        },
        required: ["title"],
        additionalProperties: false,
      },
      allowedActions: ["patrol.confirm"],
      nesting: { canHaveChildren: true, allowedChildTypes: ["Button"] },
    },
    {
      componentType: "Button",
      displayName: "Button",
      description: "Confirms a deterministic fixture action.",
      category: "common",
      domainTags: [],
      propsSchema: {
        $schema: "http://json-schema.org/draft-07/schema#",
        type: "object",
        properties: { label: { type: "string" } },
        required: ["label"],
        additionalProperties: false,
      },
      allowedActions: ["patrol.confirm"],
      nesting: { canHaveChildren: false, allowedParentTypes: ["Card"] },
    },
  ],
  actions: [
    {
      actionType: "patrol.confirm",
      description: "Explicitly confirms the generated patrol plan.",
      payloadSchema: {
        $schema: "http://json-schema.org/draft-07/schema#",
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      destructive: false,
      requiresApproval: true,
    },
  ],
} as const satisfies ComponentCatalog);

export type FixturePresentationMode = "auto" | "markdown" | "generative-ui";
export type FixtureModelFault =
  | "timeout"
  | "rate-limited"
  | "invalid-candidate"
  | "provider-failure";

export interface FixtureModelAdapterOptions {
  readonly mode?: FixturePresentationMode;
  readonly structuredDataPointer?: `/${string}`;
  readonly fault?: FixtureModelFault;
}

function waitUntilAborted(signal: AbortSignal): Promise<never> {
  if (signal.aborted) {
    return Promise.reject(new ModelAdapterError("MODEL_CANCELLED", false));
  }

  return new Promise<never>((_resolve, reject) => {
    signal.addEventListener(
      "abort",
      () => reject(new ModelAdapterError("MODEL_CANCELLED", false)),
      { once: true },
    );
  });
}

export function createFixtureModelAdapter(
  options: FixtureModelAdapterOptions = {},
): ModelAdapter {
  const mode = options.mode ?? "auto";
  const structuredDataPointer = options.structuredDataPointer;
  const fault = options.fault;

  return Object.freeze({
    async generatePresentationDecisionCandidate(
      request: ModelPresentationRequest,
      callOptions: ModelCallOptions,
    ) {
      if (fault === "timeout") {
        return waitUntilAborted(callOptions.signal);
      }
      if (fault === "rate-limited") {
        throw new ModelAdapterError("MODEL_RATE_LIMITED", true);
      }
      if (fault === "provider-failure") {
        throw new ModelAdapterError("MODEL_PROVIDER_ERROR", false);
      }
      if (fault === "invalid-candidate") {
        return { mode: "generative-ui", reason: "FIXTURE_INVALID_CANDIDATE" };
      }

      if (
        mode === "markdown" ||
        (mode === "auto" && request.content.contentType === "markdown")
      ) {
        return { mode: "markdown", reason: "FIXTURE_MARKDOWN" };
      }

      const isPatrolDraft =
        request.content.contentType === "structured-data" &&
        request.content.data !== null &&
        typeof request.content.data === "object" &&
        !Array.isArray(request.content.data) &&
        request.content.data.kind === "patrol-plan-draft";
      const structuredBinding =
        request.content.contentType !== "structured-data" ||
        request.content.data === null ||
        typeof request.content.data !== "object" ||
        Array.isArray(request.content.data)
          ? undefined
          : (() => {
              const kind = request.content.data.kind;
              const pointer =
                structuredDataPointer ??
                (kind === "device-status"
                  ? "/devices"
                  : kind === "patrol-plan-draft"
                    ? Object.hasOwn(request.content.data, "plan")
                      ? "/plan"
                      : "/summary"
                    : kind === "patrol-task"
                      ? Object.hasOwn(request.content.data, "stops")
                        ? "/stops"
                        : "/summary"
                      : undefined);
              if (!pointer) return undefined;
              return {
                sourcePointer: pointer,
                role:
                  kind === "device-status" || kind === "patrol-task"
                    ? "collection"
                    : "content",
              } as const;
            })();
      return {
        mode: "generative-ui",
        reason: "FIXTURE_GENERATIVE_UI",
        plan: {
          version: "1.0",
          scenario: isPatrolDraft ? "confirmation" : "summary",
          regions: [
            {
              regionId: "summary",
              purpose: "Deterministic fixture summary",
              bindings:
                request.content.contentType === "markdown"
                  ? [{ sourcePointer: "/markdown", role: "content" }]
                  : structuredBinding === undefined
                    ? []
                    : [structuredBinding],
              componentPreferences: [{ componentType: "Card" }],
              layout: { flow: "vertical", density: "comfortable" },
            },
            ...(isPatrolDraft
              ? [
                  {
                    regionId: "confirm",
                    purpose: "Confirm the patrol plan.",
                    bindings: [],
                    componentPreferences: [{ componentType: "Button" }],
                    layout: { flow: "vertical", density: "comfortable" },
                    actions: [
                      {
                        actionId: "confirm-patrol-plan",
                        actionType: "patrol.confirm",
                        label: "Confirm patrol plan",
                        requiresApproval: true,
                        destructive: false,
                      },
                    ],
                  },
                ]
              : []),
          ],
        },
      };
    },
  });
}
