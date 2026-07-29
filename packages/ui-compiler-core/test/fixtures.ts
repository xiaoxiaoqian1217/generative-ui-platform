import type { UICompileRequest } from "@generative-ui/compiler-contract";
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

const anyJsonType = [
  "string",
  "number",
  "boolean",
  "object",
  "array",
  "null",
] as const;

export const displayCatalog = {
  schemaVersion: "1.0",
  catalogId: "display",
  catalogVersion: "1.0.0",
  components: [
    {
      componentType: "Card",
      displayName: "Card",
      description: "Groups summary, status, comparison, and detail content.",
      category: "common",
      domainTags: [],
      propsSchema: {
        $schema: objectSchemaDialect,
        type: "object",
        properties: {
          title: { type: "string", minLength: 1 },
          content: { type: anyJsonType },
          status: { type: anyJsonType },
        },
        required: ["title"],
        additionalProperties: false,
      },
      allowedActions: [],
      nesting: {
        canHaveChildren: true,
        allowedChildTypes: [
          "Card",
          "Text",
          "List",
          "Table",
          "Alert",
          "Timeline",
          "Steps",
        ],
        maxChildren: 4,
      },
    },
    {
      componentType: "Text",
      displayName: "Text",
      description: "Renders concise summary text.",
      category: "common",
      domainTags: [],
      propsSchema: {
        $schema: objectSchemaDialect,
        type: "object",
        properties: {
          text: { type: "string" },
        },
        required: ["text"],
        additionalProperties: false,
      },
      allowedActions: [],
      nesting: {
        canHaveChildren: false,
      },
    },
    {
      componentType: "List",
      displayName: "Detail List",
      description: "Renders a compact list of detail records.",
      category: "common",
      domainTags: [],
      propsSchema: {
        $schema: objectSchemaDialect,
        type: "object",
        properties: {
          items: { type: "array" },
          title: { type: "string" },
        },
        required: ["items"],
        additionalProperties: false,
      },
      allowedActions: [],
      nesting: {
        canHaveChildren: false,
      },
    },
    {
      componentType: "Table",
      displayName: "Data Table",
      description: "Renders large status, comparison, and detail collections.",
      category: "common",
      domainTags: [],
      propsSchema: {
        $schema: objectSchemaDialect,
        type: "object",
        properties: {
          rows: { type: "array" },
          title: { type: "string" },
        },
        required: ["rows"],
        additionalProperties: false,
      },
      allowedActions: [],
      nesting: {
        canHaveChildren: false,
      },
    },
    {
      componentType: "Alert",
      displayName: "Status Alert",
      description: "Highlights an important service status.",
      category: "common",
      domainTags: [],
      propsSchema: {
        $schema: objectSchemaDialect,
        type: "object",
        properties: {
          title: { type: "string" },
          message: { type: "string" },
          status: { type: "string" },
        },
        required: ["message", "status"],
        additionalProperties: false,
      },
      allowedActions: [],
      nesting: {
        canHaveChildren: false,
      },
    },
    {
      componentType: "Timeline",
      displayName: "Timeline",
      description: "Renders a comfortable chronological timeline.",
      category: "common",
      domainTags: [],
      propsSchema: {
        $schema: objectSchemaDialect,
        type: "object",
        properties: {
          items: { type: "array" },
          title: { type: "string" },
          status: { type: "string" },
        },
        required: ["items"],
        additionalProperties: false,
      },
      allowedActions: [],
      nesting: {
        canHaveChildren: false,
      },
    },
    {
      componentType: "Steps",
      displayName: "Compact Steps",
      description: "Renders compact timeline steps on narrow viewports.",
      category: "common",
      domainTags: [],
      propsSchema: {
        $schema: objectSchemaDialect,
        type: "object",
        properties: {
          steps: { type: "array" },
          title: { type: "string" },
          status: { type: "string" },
        },
        required: ["steps"],
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

export const displayCompileOptions = {
  ...compileOptions,
  surfaceId: "surface-18",
  catalog: displayCatalog,
  catalogContentHash: computeCatalogContentHash(displayCatalog),
} as const;

const displayRequestBase = {
  fallbackMarkdown: "安全降级内容。",
  catalog: {
    catalogId: "display",
    catalogVersion: "1.0.0",
  },
} as const;

export const statusRequest = {
  ...displayRequestBase,
  requestId: "status-18",
  plan: {
    version: "1.0",
    scenario: "status",
    regions: [
      {
        regionId: "service-status",
        purpose: "Service status",
        bindings: [
          {
            sourcePointer: "/service/status",
            role: "status",
          },
        ],
        componentPreferences: [
          { componentType: "Card" },
          { componentType: "Alert", reason: "service status" },
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
    service: {
      status: "degraded",
    },
  },
} as const satisfies UICompileRequest;

export const comparisonRequest = {
  ...displayRequestBase,
  requestId: "comparison-18",
  plan: {
    version: "1.0",
    scenario: "comparison",
    regions: [
      {
        regionId: "plans",
        purpose: "Plan comparison",
        bindings: [
          {
            sourcePointer: "/plans",
            role: "collection",
          },
        ],
        componentPreferences: [
          { componentType: "Card" },
          { componentType: "Table", reason: "comparison records" },
        ],
        layout: {
          flow: "grid",
          density: "comfortable",
          minColumns: 2,
          maxColumns: 3,
        },
      },
    ],
  },
  sourceKind: "structured-data",
  sourceData: {
    plans: [
      { name: "A", price: 1 },
      { name: "B", price: 2 },
      { name: "C", price: 3 },
      { name: "D", price: 4 },
      { name: "E", price: 5 },
    ],
  },
  context: {
    viewport: {
      width: 1280,
      height: 800,
    },
  },
} as const satisfies UICompileRequest;

export const timelineRequest = {
  ...displayRequestBase,
  requestId: "timeline-18",
  plan: {
    version: "1.0",
    scenario: "timeline",
    regions: [
      {
        regionId: "history",
        purpose: "Deployment timeline",
        bindings: [
          {
            sourcePointer: "/events",
            role: "collection",
          },
        ],
        componentPreferences: [
          { componentType: "Timeline" },
          { componentType: "Steps", reason: "compact timeline steps" },
        ],
        layout: {
          flow: "horizontal",
          density: "compact",
        },
      },
    ],
  },
  sourceKind: "structured-data",
  sourceData: {
    events: [
      { at: "09:00", title: "Queued" },
      { at: "09:15", title: "Deployed" },
    ],
  },
  context: {
    viewport: {
      width: 480,
      height: 800,
    },
  },
} as const satisfies UICompileRequest;

export const detailRequest = {
  ...displayRequestBase,
  requestId: "detail-18",
  plan: {
    version: "1.0",
    scenario: "detail",
    regions: [
      {
        regionId: "records",
        purpose: "Record details",
        bindings: [
          {
            sourcePointer: "/records",
            role: "collection",
          },
        ],
        componentPreferences: [
          { componentType: "Table" },
          { componentType: "List", reason: "detail records" },
          { componentType: "Card" },
        ],
        layout: {
          flow: "vertical",
          density: "compact",
        },
      },
    ],
  },
  sourceKind: "structured-data",
  sourceData: {
    records: [{ name: "First" }, { name: "Second" }],
  },
  context: {
    viewport: {
      width: 720,
      height: 800,
    },
  },
} as const satisfies UICompileRequest;
