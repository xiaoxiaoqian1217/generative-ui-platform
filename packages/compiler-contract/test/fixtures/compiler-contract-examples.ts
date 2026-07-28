import type {
  A2UIOperationSequence,
  CompileError,
  CompileMetadata,
  UICompileRequest,
  UICompileResult,
  UISurfaceIR,
} from "../../src/index.js";

export const catalogContentHash =
  "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" as const;

export const compileRequestExample = {
  requestId: "request-15",
  threadId: "thread-15",
  runId: "run-15",
  plan: {
    version: "1.0",
    scenario: "confirmation",
    regions: [
      {
        regionId: "confirmation",
        purpose: "Confirm the selected task.",
        bindings: [
          {
            sourcePointer: "/task",
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
        actions: [
          {
            actionId: "approve-task",
            actionType: "task.approve",
            label: "Approve",
            payload: {
              taskId: {
                kind: "source-binding",
                sourcePointer: "/task/id",
              },
            },
            destructive: false,
            requiresApproval: true,
          },
        ],
      },
    ],
  },
  sourceData: {
    task: {
      id: "task-1",
      title: "Review contract",
    },
  },
  sourceKind: "structured-data",
  fallbackMarkdown: "Review contract before approval.",
  catalog: {
    catalogId: "default",
    catalogVersion: "1.0.0",
  },
  context: {
    locale: "en-US",
    viewport: {
      width: 1280,
      height: 720,
    },
  },
} as const satisfies UICompileRequest;

export const uiSurfaceIRExample = {
  irVersion: "1.0",
  surfaceId: "surface-15",
  catalog: {
    catalogId: "default",
    catalogVersion: "1.0.0",
  },
  rootComponentId: "root",
  components: [
    {
      componentId: "root",
      componentType: "Card",
      props: {
        title: "Task approval",
      },
      slots: {
        content: ["task-title"],
        actions: ["approve-button"],
      },
      children: [],
      layout: {
        flow: "vertical",
        density: "comfortable",
      },
      sourceRegionIds: ["confirmation"],
    },
    {
      componentId: "task-title",
      componentType: "Text",
      props: {},
      bindings: [
        {
          prop: "text",
          source: "sourceData",
          path: "/task/title",
        },
      ],
      children: [],
      sourceRegionIds: ["confirmation"],
    },
    {
      componentId: "approve-button",
      componentType: "Button",
      props: {
        label: "Approve",
      },
      children: [],
      sourceRegionIds: ["confirmation"],
    },
  ],
  dataSources: {
    sourceData: compileRequestExample.sourceData,
  },
  actions: [
    {
      actionId: "approve-task",
      actionType: "task.approve",
      label: "Approve",
      payload: {
        taskId: {
          kind: "literal",
          value: "task-1",
        },
      },
      requiresApproval: true,
      destructive: false,
    },
  ],
  actionBindings: [
    {
      componentId: "approve-button",
      actionId: "approve-task",
      event: "click",
    },
  ],
  metadata: {
    scenario: "confirmation",
    locale: "en-US",
  },
} as const satisfies UISurfaceIR;

export const a2UIOperationSequenceExample = [
  {
    version: "v0.9",
    createSurface: {
      surfaceId: "surface-15",
      catalogId: "default",
      sendDataModel: false,
    },
  },
  {
    version: "v0.9",
    updateComponents: {
      surfaceId: "surface-15",
      components: [
        {
          id: "root",
          component: "Card",
          title: "Task approval",
          children: ["task-title", "approve-button"],
        },
        {
          id: "task-title",
          component: "Text",
          text: {
            path: "/sourceData/task/title",
          },
        },
        {
          id: "approve-button",
          component: "Button",
          label: "Approve",
          action: {
            event: {
              name: "task.approve",
              context: {
                actionId: "approve-task",
                taskId: "task-1",
                requiresApproval: true,
                destructive: false,
              },
            },
          },
        },
      ],
    },
  },
  {
    version: "v0.9",
    updateDataModel: {
      surfaceId: "surface-15",
      path: "/",
      value: {
        sourceData: compileRequestExample.sourceData,
      },
    },
  },
] as const satisfies A2UIOperationSequence;

export const compileMetadataExample = {
  compilerVersion: "0.1.0",
  catalog: {
    catalogId: "default",
    catalogVersion: "1.0.0",
  },
  catalogContentHash,
  durationMs: 12,
  completedStages: [
    "input-validation",
    "ui-plan-validation",
    "catalog-validation",
    "semantic-resolution",
    "composition-planning",
    "component-selection",
    "props-resolution",
    "action-binding",
    "ui-ir-building",
    "schema-validation",
    "a2ui-compilation",
    "a2ui-validation",
  ],
} as const satisfies CompileMetadata;

export const compileErrorExample = {
  code: "COMPONENT_NOT_ALLOWED",
  message: "The requested component is not available.",
  stage: "component-selection",
  retryable: false,
  path: "/plan/regions/0/componentPreferences/0",
  constraint: "catalog-component",
} as const satisfies CompileError;

export const completedCompileResultExample = {
  requestId: "request-15",
  threadId: "thread-15",
  runId: "run-15",
  success: true,
  degraded: false,
  surfaceId: "surface-15",
  operations: a2UIOperationSequenceExample,
  metadata: compileMetadataExample,
} as const satisfies UICompileResult;

export const degradedCompileResultExample = {
  requestId: "request-15",
  success: true,
  degraded: true,
  fallback: {
    format: "markdown",
    markdown: "Review contract before approval.",
  },
  errors: [compileErrorExample],
  metadata: {
    ...compileMetadataExample,
    completedStages: [
      "input-validation",
      "ui-plan-validation",
      "catalog-validation",
      "component-selection",
    ],
  },
} as const satisfies UICompileResult;

export const failedCompileResultExample = {
  requestId: "request-15",
  success: false,
  degraded: false,
  errors: [compileErrorExample],
  metadata: {
    ...compileMetadataExample,
    completedStages: [
      "input-validation",
      "ui-plan-validation",
      "catalog-validation",
      "component-selection",
    ],
  },
} as const satisfies UICompileResult;
