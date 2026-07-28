import {
  catalogReferenceSchema,
  uiPlanSchema,
} from "@generative-ui/presentation-contract";
import { jsonValueSchema } from "@generative-ui/shared-types";
import { Ajv } from "ajv";
import { describe, expect, expectTypeOf, it } from "vitest";
import {
  type A2UIOperation,
  a2UIComponentSchema,
  a2UIDataBindingSchema,
  a2UIDataModelSchema,
  a2UIDynamicValueSchema,
  a2UIEventActionSchema,
  a2UIOperationSchema,
  a2UIOperationSequenceSchema,
  actionIRSchema,
  actionParameterIRSchema,
  type CatalogContentHash,
  type CompileError,
  catalogContentHashSchema,
  compileContextSchema,
  compileErrorCodeSchema,
  compileErrorSchema,
  compileMetadataSchema,
  compileStageSchema,
  componentActionBindingIRSchema,
  componentIRSchema,
  createSurfaceOperationSchema,
  layoutIRSchema,
  propBindingIRSchema,
  surfaceIdSchema,
  type UICompileRequest,
  type UICompileResult,
  type UISurfaceIR,
  uiCompileRequestSchema,
  uiCompileResultSchema,
  uiSurfaceIRSchema,
  updateComponentsOperationSchema,
  updateDataModelOperationSchema,
  validateA2UIOperation,
  validateA2UIOperationSequence,
  validateCatalogContentHash,
  validateCompileError,
  validateSurfaceId,
  validateUICompileRequest,
  validateUICompileResult,
  validateUISurfaceIR,
} from "../src/index.js";
import {
  a2UIOperationSequenceExample,
  catalogContentHash,
  compileErrorExample,
  compileRequestExample,
  completedCompileResultExample,
  degradedCompileResultExample,
  failedCompileResultExample,
  uiSurfaceIRExample,
} from "./fixtures/compiler-contract-examples.js";
import upstreamSimpleTextFixture from "./fixtures/upstream/a2ui-v0.9.1-simple-text.json" with {
  type: "json",
};

const schemaReferences = [
  jsonValueSchema,
  catalogReferenceSchema,
  uiPlanSchema,
  surfaceIdSchema,
  catalogContentHashSchema,
  compileContextSchema,
  compileStageSchema,
  compileErrorCodeSchema,
  compileErrorSchema,
  propBindingIRSchema,
  layoutIRSchema,
  componentIRSchema,
  actionParameterIRSchema,
  actionIRSchema,
  componentActionBindingIRSchema,
  a2UIDataBindingSchema,
  a2UIDynamicValueSchema,
  a2UIEventActionSchema,
  a2UIComponentSchema,
  a2UIDataModelSchema,
  createSurfaceOperationSchema,
  updateComponentsOperationSchema,
  updateDataModelOperationSchema,
  a2UIOperationSchema,
  a2UIOperationSequenceSchema,
  compileMetadataSchema,
] as const;

describe("compiler-contract JSON Schemas", () => {
  it.each([
    uiCompileRequestSchema,
    uiSurfaceIRSchema,
    a2UIOperationSchema,
    a2UIOperationSequenceSchema,
    uiCompileResultSchema,
  ])("is a valid Draft 7 Schema with a stable identifier", (schema) => {
    const ajv = new Ajv({
      strict: true,
      validateSchema: true,
    });
    for (const reference of schemaReferences) {
      ajv.addSchema(reference);
    }

    expect(schema.$id).toMatch(
      /^https:\/\/generative-ui\.dev\/schemas\/compiler\//,
    );
    expect(() => ajv.compile(schema)).not.toThrow();
  });
});

describe("Catalog and Surface identities", () => {
  it("accepts the normative content hash representation", () => {
    expect(validateCatalogContentHash(catalogContentHash)).toEqual({
      success: true,
      value: catalogContentHash,
    });
    expect(validateSurfaceId("surface-15")).toEqual({
      success: true,
      value: "surface-15",
    });
  });

  it.each([
    "sha256:ABCDEF",
    `sha256:${"A".repeat(64)}`,
    "md5:0123456789abcdef0123456789abcdef",
    "",
  ])("rejects a non-normative Catalog content hash", (hash) => {
    expect(validateCatalogContentHash(hash)).toMatchObject({
      success: false,
      error: {
        code: "CATALOG_CONTENT_HASH_INVALID",
        constraint: "format",
      },
    });
  });

  it("rejects an empty Surface ID", () => {
    expect(validateSurfaceId("")).toMatchObject({
      success: false,
      error: {
        code: "SURFACE_ID_INVALID",
      },
    });
  });
});

describe("UICompileRequest", () => {
  it("accepts complete structured SourceData", () => {
    expect(validateUICompileRequest(compileRequestExample)).toEqual({
      success: true,
      value: compileRequestExample,
    });
  });

  it("accepts sanitized Markdown only in the normalized SourceData shape", () => {
    const request: UICompileRequest = {
      ...compileRequestExample,
      sourceKind: "markdown",
      sourceData: {
        markdown: "# Safe content",
      },
      fallbackMarkdown: "# Safe content",
    };

    expect(validateUICompileRequest(request)).toEqual({
      success: true,
      value: request,
    });
  });

  it.each([
    {
      ...compileRequestExample,
      sourceKind: "markdown",
      sourceData: {
        markdown: "# Safe content",
        rawMarkdown: "<script>unsafe()</script>",
      },
      fallbackMarkdown: "# Safe content",
    },
    {
      ...compileRequestExample,
      sourceKind: "markdown",
      sourceData: {
        markdown: "# Safe content",
      },
      fallbackMarkdown: "# Different content",
    },
    {
      ...compileRequestExample,
      fallbackMarkdown: "",
    },
    {
      ...compileRequestExample,
      catalog: {
        catalogId: "",
        catalogVersion: "1.0.0",
      },
    },
    {
      ...compileRequestExample,
      surfaceId: "candidate-controlled",
    },
  ])("rejects an invalid or unsafe compile request shape", (request) => {
    expect(validateUICompileRequest(request)).toMatchObject({
      success: false,
      error: {
        code: "UI_COMPILE_REQUEST_INVALID",
      },
    });
  });
});

describe("CompileError", () => {
  it("accepts stable code, stage, retryability, and safe diagnostics", () => {
    expect(validateCompileError(compileErrorExample)).toEqual({
      success: true,
      value: compileErrorExample,
    });
  });

  it("rejects arbitrary error codes without exposing Ajv messages", () => {
    const result = validateCompileError({
      ...compileErrorExample,
      code: "must NOT have additional properties",
    });

    expect(result).toMatchObject({
      success: false,
      error: {
        code: "COMPILE_ERROR_INVALID",
        message: "Compile Error does not match its contract.",
      },
    });
    expect(JSON.stringify(result)).not.toContain("must be equal");
  });
});

describe("UISurfaceIR", () => {
  it("accepts a normalized, connected component graph", () => {
    expect(validateUISurfaceIR(uiSurfaceIRExample)).toEqual({
      success: true,
      value: uiSurfaceIRExample,
    });
  });

  it("accepts an Action parameter that preserves a source binding", () => {
    const surface = {
      ...uiSurfaceIRExample,
      actions: uiSurfaceIRExample.actions.map((action) => ({
        ...action,
        payload: {
          taskId: {
            kind: "source-binding",
            sourcePointer: "/task/id",
          },
        },
      })),
    };

    expect(validateUISurfaceIR(surface)).toEqual({
      success: true,
      value: surface,
    });
  });

  it.each([
    {
      ...uiSurfaceIRExample,
      components: [
        ...uiSurfaceIRExample.components,
        uiSurfaceIRExample.components[0],
      ],
    },
    {
      ...uiSurfaceIRExample,
      components: uiSurfaceIRExample.components.map((component, index) =>
        index === 0
          ? {
              ...component,
              children: ["missing"],
              slots: {},
            }
          : component,
      ),
    },
    {
      ...uiSurfaceIRExample,
      components: uiSurfaceIRExample.components.map((component, index) =>
        index === 0
          ? {
              ...component,
              children: ["task-title"],
              slots: {
                content: ["task-title"],
              },
            }
          : component,
      ),
    },
    {
      ...uiSurfaceIRExample,
      components: uiSurfaceIRExample.components.map((component) =>
        component.componentId === "task-title"
          ? {
              ...component,
              children: ["root"],
            }
          : component,
      ),
    },
    {
      ...uiSurfaceIRExample,
      components: uiSurfaceIRExample.components.map((component, index) =>
        index === 0
          ? {
              ...component,
              slots: {
                content: ["task-title"],
              },
            }
          : component,
      ),
    },
    {
      ...uiSurfaceIRExample,
      actionBindings: [],
    },
    {
      ...uiSurfaceIRExample,
      actionBindings: [
        ...uiSurfaceIRExample.actionBindings,
        {
          componentId: "approve-button",
          actionId: "approve-task",
          event: "submit",
        },
      ],
    },
    {
      ...uiSurfaceIRExample,
      actions: uiSurfaceIRExample.actions.map((action) => ({
        ...action,
        payload: {
          taskId: {
            kind: "literal",
            value: null,
          },
        },
      })),
    },
    {
      ...uiSurfaceIRExample,
      actions: uiSurfaceIRExample.actions.map((action) => ({
        ...action,
        payload: {
          actionId: {
            kind: "literal",
            value: "payload-owned-id",
          },
        },
      })),
    },
    {
      ...uiSurfaceIRExample,
      actions: uiSurfaceIRExample.actions.map((action) => ({
        ...action,
        payload: {
          taskId: {
            kind: "source-binding",
            sourcePointer: "/task/missing",
          },
        },
      })),
    },
    {
      ...uiSurfaceIRExample,
      components: uiSurfaceIRExample.components.map((component) =>
        component.componentId === "task-title"
          ? {
              ...component,
              bindings: [
                {
                  prop: "text",
                  source: "sourceData",
                  path: "/task/missing",
                },
              ],
            }
          : component,
      ),
    },
    {
      ...uiSurfaceIRExample,
      components: uiSurfaceIRExample.components.map((component) =>
        component.componentId === "task-title"
          ? {
              ...component,
              bindings: [
                {
                  prop: "text",
                  source: "derivedData",
                  path: "/summary",
                },
              ],
            }
          : component,
      ),
    },
    {
      ...uiSurfaceIRExample,
      executableCode: "return <Card />",
    },
  ])("rejects a broken UI IR invariant", (surface) => {
    expect(validateUISurfaceIR(surface)).toMatchObject({
      success: false,
      error: {
        code: "UI_IR_INVALID",
      },
    });
  });
});

describe("A2UI 0.9.1 Profile", () => {
  it.each(a2UIOperationSequenceExample)(
    "accepts each supported upstream-compatible v0.9 operation",
    (operation) => {
      expect(validateA2UIOperation(operation)).toEqual({
        success: true,
        value: operation,
      });
    },
  );

  it.each(upstreamSimpleTextFixture.messages)(
    "accepts an operation from the fixed upstream A2UI v0.9 fixture",
    (operation) => {
      expect(validateA2UIOperation(operation)).toEqual({
        success: true,
        value: operation,
      });
    },
  );

  it("accepts the complete create, components, and data sequence", () => {
    expect(validateA2UIOperationSequence(a2UIOperationSequenceExample)).toEqual(
      {
        success: true,
        value: a2UIOperationSequenceExample,
      },
    );
  });

  it("does not infer Catalog Prop semantics from names or object shapes", () => {
    const operation = {
      version: "v0.9",
      updateComponents: {
        surfaceId: "surface-15",
        components: [
          {
            id: "root",
            component: "CatalogOwnedComponent",
            children: ["catalog-owned-value"],
            configuration: {
              path: "catalog-owned-label",
              presentation: "compact",
            },
          },
        ],
      },
    };

    expect(validateA2UIOperation(operation)).toEqual({
      success: true,
      value: operation,
    });
  });

  it.each([
    {
      version: "v0.9.1",
      createSurface: {
        surfaceId: "surface-15",
        catalogId: "default",
      },
    },
    {
      version: "v0.9",
      deleteSurface: {
        surfaceId: "surface-15",
      },
    },
    {
      version: "v0.9",
      replaceSurface: {
        surfaceId: "surface-15",
      },
    },
    {
      version: "v0.9",
      createSurface: {
        surfaceId: "surface-15",
        catalogId: "default",
        sendDataModel: true,
      },
    },
    {
      version: "v0.9",
      updateComponents: {
        surfaceId: "surface-15",
        components: [
          {
            id: "root",
            component: "Button",
            action: {
              event: {
                name: "task.approve",
                context: {
                  actionId: "approve-task",
                  payload: {
                    taskId: "task-1",
                  },
                  requiresApproval: true,
                  destructive: false,
                },
              },
            },
          },
        ],
      },
    },
  ])("rejects an operation outside the MVP Profile", (operation) => {
    expect(validateA2UIOperation(operation)).toMatchObject({
      success: false,
      error: {
        code: "A2UI_INVALID",
      },
    });
  });

  it.each([
    {
      operations: [
        a2UIOperationSequenceExample[1],
        a2UIOperationSequenceExample[0],
        a2UIOperationSequenceExample[2],
      ],
    },
    {
      operations: [
        a2UIOperationSequenceExample[0],
        {
          ...a2UIOperationSequenceExample[1],
          updateComponents: {
            ...a2UIOperationSequenceExample[1].updateComponents,
            surfaceId: "surface-other",
          },
        },
        a2UIOperationSequenceExample[2],
      ],
    },
    {
      operations: [
        a2UIOperationSequenceExample[0],
        {
          ...a2UIOperationSequenceExample[1],
          updateComponents: {
            ...a2UIOperationSequenceExample[1].updateComponents,
            components:
              a2UIOperationSequenceExample[1].updateComponents.components.filter(
                (component) => component.id !== "root",
              ),
          },
        },
        a2UIOperationSequenceExample[2],
      ],
    },
  ])("rejects an incomplete or inconsistent full Surface", ({ operations }) => {
    expect(validateA2UIOperationSequence(operations)).toMatchObject({
      success: false,
      error: {
        code: "A2UI_INVALID",
      },
    });
  });

  it("derives a closed operation union from the Profile Schema", () => {
    expectTypeOf<A2UIOperation>().toMatchTypeOf<
      | {
          version: "v0.9";
          createSurface: {
            surfaceId: string;
            catalogId: string;
          };
        }
      | {
          version: "v0.9";
          updateComponents: {
            surfaceId: string;
            components: unknown[];
          };
        }
      | {
          version: "v0.9";
          updateDataModel: {
            surfaceId: string;
            path: "/";
            value: unknown;
          };
        }
    >();
  });
});

describe("UICompileResult", () => {
  it.each([
    completedCompileResultExample,
    degradedCompileResultExample,
    failedCompileResultExample,
  ])("accepts each mutually exclusive result state", (result) => {
    expect(validateUICompileResult(result)).toEqual({
      success: true,
      value: result,
    });
  });

  it.each([
    {
      ...completedCompileResultExample,
      fallback: {
        format: "markdown",
        markdown: "Fallback",
      },
    },
    {
      ...completedCompileResultExample,
      errors: [compileErrorExample],
    },
    {
      ...degradedCompileResultExample,
      operations: a2UIOperationSequenceExample,
    },
    {
      ...failedCompileResultExample,
      fallback: {
        format: "markdown",
        markdown: "Fallback",
      },
    },
    {
      ...completedCompileResultExample,
      surfaceId: "surface-other",
    },
    {
      ...completedCompileResultExample,
      metadata: {
        ...completedCompileResultExample.metadata,
        catalog: {
          catalogId: "other",
          catalogVersion: "1.0.0",
        },
      },
    },
    {
      ...completedCompileResultExample,
      metadata: {
        ...completedCompileResultExample.metadata,
        completedStages:
          completedCompileResultExample.metadata.completedStages.filter(
            (stage) => stage !== "a2ui-validation",
          ),
      },
    },
  ])("rejects contradictory or incomplete result states", (result) => {
    expect(validateUICompileResult(result)).toMatchObject({
      success: false,
      error: {
        code: "UI_COMPILE_RESULT_INVALID",
      },
    });
  });

  it("derives the three public branches from the result Schema", () => {
    expectTypeOf<UICompileResult>().toMatchTypeOf<
      | {
          success: true;
          degraded: false;
          surfaceId: string;
          operations: unknown;
        }
      | {
          success: true;
          degraded: true;
          fallback: {
            format: "markdown";
            markdown: string;
          };
          errors: CompileError[];
        }
      | {
          success: false;
          degraded: false;
          errors: CompileError[];
        }
    >();
  });

  it("keeps request SourceData and result Operations request-bound", () => {
    const secondRequest: UICompileRequest = {
      ...compileRequestExample,
      requestId: "request-16",
      sourceData: {
        task: {
          id: "task-2",
          title: "Different request",
        },
      },
    };
    const secondResult: UICompileResult = {
      ...completedCompileResultExample,
      requestId: secondRequest.requestId,
      surfaceId: "surface-16",
      operations: [
        {
          ...a2UIOperationSequenceExample[0],
          createSurface: {
            ...a2UIOperationSequenceExample[0].createSurface,
            surfaceId: "surface-16",
          },
        },
        {
          ...a2UIOperationSequenceExample[1],
          updateComponents: {
            ...a2UIOperationSequenceExample[1].updateComponents,
            surfaceId: "surface-16",
          },
        },
        {
          ...a2UIOperationSequenceExample[2],
          updateDataModel: {
            ...a2UIOperationSequenceExample[2].updateDataModel,
            surfaceId: "surface-16",
            value: {
              sourceData: secondRequest.sourceData,
            },
          },
        },
      ],
    };

    expect(validateUICompileResult(secondResult).success).toBe(true);
    expect(secondResult.surfaceId).not.toBe(
      completedCompileResultExample.surfaceId,
    );
    expect(secondResult.operations[2].updateDataModel.value).not.toEqual(
      completedCompileResultExample.operations[2].updateDataModel.value,
    );
  });
});

describe("public TypeScript contracts", () => {
  it("derive request, IR, hash, error, and result types from Schemas", () => {
    expectTypeOf(compileRequestExample).toMatchTypeOf<UICompileRequest>();
    expectTypeOf(uiSurfaceIRExample).toMatchTypeOf<UISurfaceIR>();
    expectTypeOf(catalogContentHash).toMatchTypeOf<CatalogContentHash>();
    expectTypeOf(compileErrorExample).toMatchTypeOf<CompileError>();
    expectTypeOf(
      completedCompileResultExample,
    ).toMatchTypeOf<UICompileResult>();
  });
});
