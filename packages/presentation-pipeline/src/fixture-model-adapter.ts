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
          content: { type: "object" },
        },
        required: ["title", "content"],
        additionalProperties: false,
      },
      allowedActions: [],
      nesting: { canHaveChildren: false },
    },
  ],
  actions: [],
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
  const structuredDataPointer = options.structuredDataPointer ?? "/summary";
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

      return {
        mode: "generative-ui",
        reason: "FIXTURE_GENERATIVE_UI",
        plan: {
          version: "1.0",
          scenario: "summary",
          regions: [
            {
              regionId: "summary",
              purpose: "Deterministic fixture summary",
              bindings: [
                {
                  sourcePointer:
                    request.content.contentType === "markdown"
                      ? "/markdown"
                      : structuredDataPointer,
                  role: "content",
                },
              ],
              componentPreferences: [{ componentType: "Card" }],
              layout: { flow: "vertical", density: "comfortable" },
            },
          ],
        },
      };
    },
  });
}
