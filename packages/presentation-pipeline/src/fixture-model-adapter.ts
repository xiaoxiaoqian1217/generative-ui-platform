import type { ComponentCatalog } from "@generative-ui/component-catalog-schema";
import type {
  ModelAdapter,
  ModelPresentationRequest,
} from "./presentation-router.js";

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

export interface FixtureModelAdapterOptions {
  readonly mode?: FixturePresentationMode;
  readonly structuredDataPointer?: `/${string}`;
}

export function createFixtureModelAdapter(
  options: FixtureModelAdapterOptions = {},
): ModelAdapter {
  const mode = options.mode ?? "auto";
  const structuredDataPointer = options.structuredDataPointer ?? "/summary";

  return Object.freeze({
    async generatePresentationDecisionCandidate(
      request: ModelPresentationRequest,
    ) {
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
