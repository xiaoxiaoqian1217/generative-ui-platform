import type {
  CompileError,
  UICompileRequest,
} from "@generative-ui/compiler-contract";
import {
  type ComponentCatalog,
  computeCatalogContentHash,
  defaultCatalogSchemaLimits,
} from "@generative-ui/component-catalog-schema";
import { describe, expect, it } from "vitest";
import { compileUI } from "../src/index.js";
import type { CompileOptions } from "../src/types.js";

const objectSchemaDialect = "http://json-schema.org/draft-07/schema#" as const;

const interactionCatalog = {
  schemaVersion: "1.0",
  catalogId: "interactions",
  catalogVersion: "1.0.0",
  components: [
    {
      componentType: "Card",
      displayName: "Card",
      description: "Groups confirmation content and controls.",
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
        canHaveChildren: true,
        allowedChildTypes: ["Button"],
        maxChildren: 1,
      },
    },
    {
      componentType: "Button",
      displayName: "Button",
      description: "Triggers one confirmed operation.",
      category: "common",
      domainTags: [],
      propsSchema: {
        $schema: objectSchemaDialect,
        type: "object",
        properties: {
          label: {
            type: "string",
            minLength: 1,
          },
        },
        required: ["label"],
        additionalProperties: false,
      },
      allowedActions: ["confirm"],
      nesting: {
        canHaveChildren: false,
        allowedParentTypes: ["Card"],
      },
    },
    {
      componentType: "Form",
      displayName: "Form",
      description: "Collects and submits structured values.",
      category: "common",
      domainTags: [],
      propsSchema: {
        $schema: objectSchemaDialect,
        type: "object",
        properties: {
          value: {
            type: "object",
          },
          submitLabel: {
            type: "string",
            minLength: 1,
          },
        },
        required: ["value", "submitLabel"],
        additionalProperties: false,
      },
      allowedActions: ["submit"],
      nesting: {
        canHaveChildren: false,
      },
    },
    {
      componentType: "AccountSummary",
      displayName: "Account Summary",
      description: "Displays account-specific summary data.",
      category: "domain",
      domainTags: ["accounts"],
      propsSchema: {
        $schema: objectSchemaDialect,
        type: "object",
        properties: {
          content: {
            type: "object",
          },
        },
        required: ["content"],
        additionalProperties: false,
      },
      allowedActions: [],
      nesting: {
        canHaveChildren: false,
      },
    },
  ],
  actions: [
    {
      actionType: "confirm",
      description: "Confirms the requested operation.",
      payloadSchema: {
        $schema: objectSchemaDialect,
        type: "object",
        properties: {
          taskId: {
            type: "string",
            minLength: 1,
          },
        },
        required: ["taskId"],
        additionalProperties: false,
      },
      destructive: false,
      requiresApproval: true,
    },
    {
      actionType: "submit",
      description: "Submits the form values.",
      payloadSchema: {
        $schema: objectSchemaDialect,
        type: "object",
        properties: {
          formData: {
            type: "object",
          },
        },
        required: ["formData"],
        additionalProperties: false,
      },
      destructive: false,
      requiresApproval: false,
    },
  ],
} as const satisfies ComponentCatalog;

const formRequest = {
  requestId: "request-19-form",
  plan: {
    version: "1.0",
    scenario: "form",
    regions: [
      {
        regionId: "profile-form",
        purpose: "Edit profile",
        bindings: [
          {
            sourcePointer: "/profile",
            role: "form-data",
          },
        ],
        componentPreferences: [
          {
            componentType: "Form",
          },
        ],
        layout: {
          flow: "vertical",
          density: "comfortable",
        },
        actions: [
          {
            actionId: "save-profile",
            actionType: "submit",
            label: "Save profile",
            targetRegionId: "profile-form",
            payload: {
              formData: {
                kind: "source-binding",
                sourcePointer: "/profile",
              },
            },
            destructive: false,
            requiresApproval: false,
          },
        ],
      },
    ],
  },
  sourceKind: "structured-data",
  sourceData: {
    profile: {
      name: "Ada",
    },
  },
  fallbackMarkdown: "Profile form is unavailable.",
  catalog: {
    catalogId: "interactions",
    catalogVersion: "1.0.0",
  },
} as const satisfies UICompileRequest;

const confirmationRequest = {
  requestId: "request-19-confirmation",
  plan: {
    version: "1.0",
    scenario: "confirmation",
    regions: [
      {
        regionId: "confirmation-card",
        purpose: "Approve task",
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
      },
      {
        regionId: "confirm-button",
        purpose: "Approve",
        bindings: [],
        componentPreferences: [
          {
            componentType: "Button",
          },
        ],
        layout: {
          flow: "horizontal",
          density: "compact",
        },
        actions: [
          {
            actionId: "approve-task",
            actionType: "confirm",
            label: "Approve",
            targetRegionId: "confirm-button",
            payload: {
              taskId: {
                kind: "literal",
                value: "task-19",
              },
            },
            destructive: false,
            requiresApproval: true,
          },
        ],
      },
    ],
  },
  sourceKind: "structured-data",
  sourceData: {
    task: {
      id: "task-19",
      title: "Review profile",
    },
  },
  fallbackMarkdown: "Task confirmation is unavailable.",
  catalog: {
    catalogId: "interactions",
    catalogVersion: "1.0.0",
  },
} as const satisfies UICompileRequest;

const domainComponentRequest = {
  requestId: "request-19-domain",
  plan: {
    version: "1.0",
    scenario: "summary",
    regions: [
      {
        regionId: "account-summary",
        purpose: "Account summary",
        bindings: [
          {
            sourcePointer: "/account",
            role: "content",
          },
        ],
        componentPreferences: [
          {
            componentType: "AccountSummary",
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
    account: {
      balance: 125,
      currency: "CNY",
    },
  },
  fallbackMarkdown: "Account summary is unavailable.",
  catalog: {
    catalogId: "interactions",
    catalogVersion: "1.0.0",
  },
} as const satisfies UICompileRequest;

function compileOptions(
  catalog: ComponentCatalog,
  surfaceId: string,
): CompileOptions {
  return {
    surfaceId,
    catalog,
    catalogContentHash: computeCatalogContentHash(catalog),
    limits: {
      maxDataDepth: 16,
      maxDataItems: 256,
      catalogSchema: defaultCatalogSchemaLimits,
    },
  };
}

type ActionIntent = NonNullable<
  UICompileRequest["plan"]["regions"][number]["actions"]
>[number];

function formRequestWithAction(
  overrides: Partial<ActionIntent>,
): UICompileRequest {
  const region = formRequest.plan.regions[0];
  const action = region.actions[0];
  return {
    ...formRequest,
    plan: {
      ...formRequest.plan,
      regions: [
        {
          ...region,
          actions: [
            {
              ...action,
              ...overrides,
            },
          ],
        },
      ],
    },
  };
}

function catalogWithComponentOverride(
  componentType: string,
  overrides: (
    component: ComponentCatalog["components"][number],
  ) => Partial<ComponentCatalog["components"][number]>,
): ComponentCatalog {
  return {
    ...interactionCatalog,
    components: interactionCatalog.components.map((component) =>
      component.componentType === componentType
        ? {
            ...component,
            ...overrides(component),
          }
        : component,
    ),
  } as ComponentCatalog;
}

function expectDegradedWithCode(
  result: ReturnType<typeof compileUI>,
  code: CompileError["code"],
  stage?: CompileError["stage"],
): void {
  expect(result).toMatchObject({
    success: true,
    degraded: true,
    fallback: {
      format: "markdown",
    },
    errors: [
      {
        code,
        retryable: false,
        ...(stage ? { stage } : {}),
      },
    ],
  });
}

describe("interactive component tracer bullets", () => {
  it("compiles a Form Action to the versioned A2UI event Envelope", () => {
    const result = compileUI(
      formRequest,
      compileOptions(interactionCatalog, "surface-19-form"),
    );

    expect(result).toMatchObject({
      success: true,
      degraded: false,
      surfaceId: "surface-19-form",
      operations: [
        {
          version: "v0.9",
          createSurface: {
            surfaceId: "surface-19-form",
            catalogId: "interactions",
          },
        },
        {
          version: "v0.9",
          updateComponents: {
            surfaceId: "surface-19-form",
            components: [
              {
                id: "root",
                component: "Form",
                value: {
                  path: "/sourceData/profile",
                },
                submitLabel: "Save profile",
                action: {
                  event: {
                    name: "submit",
                    context: {
                      actionId: "save-profile",
                      formData: {
                        path: "/sourceData/profile",
                      },
                      destructive: false,
                      requiresApproval: false,
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
            surfaceId: "surface-19-form",
            path: "/",
            value: {
              sourceData: formRequest.sourceData,
            },
          },
        },
      ],
    });
  });

  it("compiles a nested confirmation to Card and Button A2UI components", () => {
    const result = compileUI(
      confirmationRequest,
      compileOptions(interactionCatalog, "surface-19-confirmation"),
    );

    expect(result).toMatchObject({
      success: true,
      degraded: false,
      operations: [
        {},
        {
          updateComponents: {
            components: [
              {
                id: "root",
                component: "Card",
                title: "Approve task",
                content: {
                  path: "/sourceData/task",
                },
                children: ["region-1"],
              },
              {
                id: "region-1",
                component: "Button",
                label: "Approve",
                action: {
                  event: {
                    name: "confirm",
                    context: {
                      actionId: "approve-task",
                      taskId: "task-19",
                      destructive: false,
                      requiresApproval: true,
                    },
                  },
                },
              },
            ],
          },
        },
        {},
      ],
    });
  });

  it("selects a Catalog-declared domain component through the common flow", () => {
    const result = compileUI(
      domainComponentRequest,
      compileOptions(interactionCatalog, "surface-19-domain"),
    );

    expect(result).toMatchObject({
      success: true,
      degraded: false,
      operations: [
        {},
        {
          updateComponents: {
            components: [
              {
                id: "root",
                component: "AccountSummary",
                content: {
                  path: "/sourceData/account",
                },
              },
            ],
          },
        },
        {},
      ],
    });
  });

  it("rejects a domain component that is not declared by the active Catalog", () => {
    const result = compileUI(
      {
        ...domainComponentRequest,
        plan: {
          ...domainComponentRequest.plan,
          regions: [
            {
              ...domainComponentRequest.plan.regions[0],
              componentPreferences: [
                {
                  componentType: "UnregisteredAccountPanel",
                },
              ],
            },
          ],
        },
      },
      compileOptions(interactionCatalog, "surface-19-domain-rejected"),
    );

    expectDegradedWithCode(result, "NO_COMPATIBLE_COMPONENT");
  });

  it("validates domain component Props through its Catalog Schema", () => {
    const catalog = catalogWithComponentOverride(
      "AccountSummary",
      (component) => ({
        propsSchema: {
          ...component.propsSchema,
          properties: {
            content: {
              type: "string",
            },
          },
        },
      }),
    );

    const result = compileUI(
      domainComponentRequest,
      compileOptions(catalog, "surface-19-domain-props"),
    );

    expectDegradedWithCode(result, "COMPONENT_PROPS_INVALID");
  });

  it("rejects Props that do not satisfy the selected component Schema", () => {
    const catalog = catalogWithComponentOverride("Form", (component) => ({
      propsSchema: {
        ...component.propsSchema,
        properties: {
          ...component.propsSchema.properties,
          schemaVersion: {
            type: "string",
          },
        },
        required: ["value", "submitLabel", "schemaVersion"],
      },
    }));

    const result = compileUI(
      formRequest,
      compileOptions(catalog, "surface-19-invalid-props"),
    );

    expectDegradedWithCode(result, "COMPONENT_PROPS_INVALID");
  });

  it("rejects an Action type that is not declared by the active Catalog", () => {
    const result = compileUI(
      formRequestWithAction({
        actionType: "unregistered-submit",
      }),
      compileOptions(interactionCatalog, "surface-19-action-type"),
    );

    expectDegradedWithCode(
      result,
      "ACTION_BINDING_UNRESOLVED",
      "schema-validation",
    );
  });

  it("rejects an Action payload that violates its Catalog Schema", () => {
    const result = compileUI(
      formRequestWithAction({
        payload: {
          formData: {
            kind: "literal",
            value: "not-an-object",
          },
        },
      }),
      compileOptions(interactionCatalog, "surface-19-action-payload"),
    );

    expectDegradedWithCode(result, "ACTION_PAYLOAD_INVALID", "action-binding");
  });

  it("rejects an Action payload binding that does not resolve", () => {
    const result = compileUI(
      formRequestWithAction({
        payload: {
          formData: {
            kind: "source-binding",
            sourcePointer: "/missing-profile",
          },
        },
      }),
      compileOptions(interactionCatalog, "surface-19-action-pointer"),
    );

    expectDegradedWithCode(result, "ACTION_PAYLOAD_INVALID", "action-binding");
  });

  it("rejects an Action not permitted by its target component", () => {
    const catalog = catalogWithComponentOverride("Form", () => ({
      allowedActions: [],
    }));

    const result = compileUI(
      formRequest,
      compileOptions(catalog, "surface-19-action-permission"),
    );

    expectDegradedWithCode(
      result,
      "ACTION_BINDING_UNRESOLVED",
      "schema-validation",
    );
  });

  it("rejects Action safety flags that disagree with the Catalog", () => {
    const result = compileUI(
      formRequestWithAction({
        destructive: true,
      }),
      compileOptions(interactionCatalog, "surface-19-action-safety"),
    );

    expectDegradedWithCode(
      result,
      "ACTION_BINDING_UNRESOLVED",
      "schema-validation",
    );
  });

  it("rejects an Action target that does not resolve to a plan region", () => {
    const result = compileUI(
      formRequestWithAction({
        targetRegionId: "missing-region",
      }),
      compileOptions(interactionCatalog, "surface-19-action-target"),
    );

    expectDegradedWithCode(result, "UI_PLAN_INVALID");
  });

  it("rejects a confirmation that violates Catalog nesting", () => {
    const catalog = catalogWithComponentOverride("Card", () => ({
      nesting: {
        canHaveChildren: false,
      },
    }));

    const result = compileUI(
      confirmationRequest,
      compileOptions(catalog, "surface-19-nesting"),
    );

    expectDegradedWithCode(result, "NO_COMPATIBLE_COMPOSITION");
  });
});
