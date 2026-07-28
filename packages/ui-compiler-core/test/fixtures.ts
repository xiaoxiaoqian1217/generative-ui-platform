import {
  type ComponentCatalog,
  computeCatalogContentHash,
  defaultCatalogSchemaLimits,
} from "@generative-ui/component-catalog-schema";

const objectSchemaDialect = "http://json-schema.org/draft-07/schema#" as const;

export const summaryCatalog = {
  schemaVersion: "1.0",
  catalogId: "summary",
  catalogVersion: "1.0.0",
  components: [
    {
      componentType: "Card",
      displayName: "Card",
      description: "Groups summary content.",
      category: "common",
      domainTags: [],
      propsSchema: {
        $schema: objectSchemaDialect,
        type: "object",
        properties: {
          title: {
            type: "string",
            minLength: 1,
          },
          content: {
            type: "object",
          },
        },
        required: ["title", "content"],
        additionalProperties: false,
      },
      allowedActions: [],
      nesting: {
        canHaveChildren: false,
      },
    },
  ],
  actions: [],
} as const satisfies ComponentCatalog;

export const summaryRequest = {
  requestId: "request-17",
  threadId: "thread-17",
  runId: "run-17",
  plan: {
    version: "1.0",
    scenario: "summary",
    regions: [
      {
        regionId: "overview",
        purpose: "Account summary",
        bindings: [
          {
            sourcePointer: "/summary",
            role: "content",
          },
        ],
        componentPreferences: [
          {
            componentType: "Card",
          },
        ],
        layout: {
          flow: "vertical",
          density: "comfortable",
        },
      },
    ],
  },
  sourceKind: "structured-data",
  sourceData: {
    summary: {
      balance: 125,
      currency: "CNY",
    },
  },
  fallbackMarkdown: "账户余额为 125 CNY。",
  catalog: {
    catalogId: "summary",
    catalogVersion: "1.0.0",
  },
} as const;

export const compileOptions = {
  surfaceId: "surface-17",
  catalog: summaryCatalog,
  catalogContentHash: computeCatalogContentHash(summaryCatalog),
  limits: {
    maxDataDepth: 16,
    maxDataItems: 256,
    catalogSchema: defaultCatalogSchemaLimits,
  },
} as const;
