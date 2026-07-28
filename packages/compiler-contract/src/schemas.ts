import {
  catalogReferenceSchema,
  layoutConstraintSchema,
  uiPlanSchema,
} from "@generative-ui/presentation-contract";
import { jsonValueSchema } from "@generative-ui/shared-types";
import { type Static, Type } from "@sinclair/typebox";

const nonEmptyStringSchema = Type.String({ minLength: 1 });
const jsonValueReferenceSchema = Type.Ref(jsonValueSchema);
const jsonPointerSchema = Type.String({
  pattern: "^/(?:[^~/]|~0|~1)*(?:/(?:[^~/]|~0|~1)*)*$",
});
const stringMapSchema = Type.Record(Type.String(), jsonValueReferenceSchema);

export const surfaceIdSchema = Type.String({
  $id: "https://generative-ui.dev/schemas/compiler/surface-id/1.0",
  minLength: 1,
});

export type SurfaceId = Static<typeof surfaceIdSchema>;

export const catalogContentHashSchema = Type.Intersect(
  [
    Type.TemplateLiteral([Type.Literal("sha256:"), Type.String()]),
    Type.String({ pattern: "^sha256:[0-9a-f]{64}$" }),
  ],
  {
    $id: "https://generative-ui.dev/schemas/compiler/catalog-content-hash/1.0",
  },
);

export type CatalogContentHash = Static<typeof catalogContentHashSchema>;

export const compileStageSchema = Type.Union(
  [
    Type.Literal("input-validation"),
    Type.Literal("ui-plan-validation"),
    Type.Literal("catalog-validation"),
    Type.Literal("semantic-resolution"),
    Type.Literal("composition-planning"),
    Type.Literal("component-selection"),
    Type.Literal("props-resolution"),
    Type.Literal("action-binding"),
    Type.Literal("ui-ir-building"),
    Type.Literal("schema-validation"),
    Type.Literal("a2ui-compilation"),
    Type.Literal("a2ui-validation"),
  ],
  {
    $id: "https://generative-ui.dev/schemas/compiler/stage/1.0",
  },
);

export type CompileStage = Static<typeof compileStageSchema>;

export const compileErrorCodeSchema = Type.Union(
  [
    Type.Literal("UI_COMPILE_REQUEST_INVALID"),
    Type.Literal("UI_PLAN_INVALID"),
    Type.Literal("DATA_DEPTH_EXCEEDED"),
    Type.Literal("DATA_ITEMS_EXCEEDED"),
    Type.Literal("COMPONENT_CATALOG_INVALID"),
    Type.Literal("CATALOG_REFERENCE_MISMATCH"),
    Type.Literal("CATALOG_CONTENT_HASH_MISMATCH"),
    Type.Literal("SCHEMA_DEFINITION_INVALID"),
    Type.Literal("SCHEMA_LIMIT_EXCEEDED"),
    Type.Literal("SCHEMA_COMPILATION_FAILED"),
    Type.Literal("NO_COMPATIBLE_COMPOSITION"),
    Type.Literal("COMPONENT_NOT_ALLOWED"),
    Type.Literal("NO_COMPATIBLE_COMPONENT"),
    Type.Literal("PROPS_RESOLUTION_FAILED"),
    Type.Literal("COMPONENT_PROPS_INVALID"),
    Type.Literal("ACTION_PAYLOAD_INVALID"),
    Type.Literal("ACTION_BINDING_UNRESOLVED"),
    Type.Literal("UI_IR_INVALID"),
    Type.Literal("A2UI_INVALID"),
    Type.Literal("COMPILE_TIMEOUT"),
    Type.Literal("REQUEST_CANCELLED"),
    Type.Literal("INTERNAL_ERROR"),
  ],
  {
    $id: "https://generative-ui.dev/schemas/compiler/error-code/1.0",
  },
);

export type CompileErrorCode = Static<typeof compileErrorCodeSchema>;

export const compileErrorSchema = Type.Object(
  {
    code: Type.Ref(compileErrorCodeSchema),
    message: nonEmptyStringSchema,
    stage: Type.Ref(compileStageSchema),
    retryable: Type.Boolean(),
    path: Type.Optional(Type.String()),
    constraint: Type.Optional(nonEmptyStringSchema),
  },
  {
    $id: "https://generative-ui.dev/schemas/compiler/error/1.0",
    additionalProperties: false,
  },
);

export type CompileError = Static<typeof compileErrorSchema>;

export const compileContextSchema = Type.Object(
  {
    locale: Type.Optional(nonEmptyStringSchema),
    theme: Type.Optional(nonEmptyStringSchema),
    viewport: Type.Optional(
      Type.Object(
        {
          width: Type.Number({ exclusiveMinimum: 0 }),
          height: Type.Number({ exclusiveMinimum: 0 }),
        },
        {
          additionalProperties: false,
        },
      ),
    ),
  },
  {
    $id: "https://generative-ui.dev/schemas/compiler/context/1.0",
    additionalProperties: false,
  },
);

export type CompileContext = Static<typeof compileContextSchema>;

const compileRequestFields = {
  requestId: nonEmptyStringSchema,
  threadId: Type.Optional(nonEmptyStringSchema),
  runId: Type.Optional(nonEmptyStringSchema),
  plan: Type.Ref(uiPlanSchema),
  fallbackMarkdown: nonEmptyStringSchema,
  catalog: Type.Ref(catalogReferenceSchema),
  context: Type.Optional(Type.Ref(compileContextSchema)),
};

const markdownCompileRequestSchema = Type.Object(
  {
    ...compileRequestFields,
    sourceKind: Type.Literal("markdown"),
    sourceData: Type.Object(
      {
        markdown: nonEmptyStringSchema,
      },
      {
        additionalProperties: false,
      },
    ),
  },
  {
    additionalProperties: false,
  },
);

const structuredDataCompileRequestSchema = Type.Object(
  {
    ...compileRequestFields,
    sourceKind: Type.Literal("structured-data"),
    sourceData: jsonValueReferenceSchema,
  },
  {
    additionalProperties: false,
  },
);

export const uiCompileRequestSchema = Type.Union(
  [markdownCompileRequestSchema, structuredDataCompileRequestSchema],
  {
    $id: "https://generative-ui.dev/schemas/compiler/request/1.0",
  },
);

export type UICompileRequest = Static<typeof uiCompileRequestSchema>;

export const propBindingIRSchema = Type.Object(
  {
    prop: nonEmptyStringSchema,
    source: Type.Union([
      Type.Literal("sourceData"),
      Type.Literal("derivedData"),
    ]),
    path: jsonPointerSchema,
  },
  {
    $id: "https://generative-ui.dev/schemas/compiler/ir/prop-binding/1.0",
    additionalProperties: false,
  },
);

export type PropBindingIR = Static<typeof propBindingIRSchema>;

export const layoutIRSchema = Type.Object(
  {
    flow: layoutConstraintSchema.properties.flow,
    density: layoutConstraintSchema.properties.density,
    columns: Type.Optional(Type.Integer({ minimum: 1 })),
  },
  {
    $id: "https://generative-ui.dev/schemas/compiler/ir/layout/1.0",
    additionalProperties: false,
  },
);

export type LayoutIR = Static<typeof layoutIRSchema>;

export const componentIRSchema = Type.Object(
  {
    componentId: nonEmptyStringSchema,
    componentType: nonEmptyStringSchema,
    props: stringMapSchema,
    bindings: Type.Optional(Type.Array(Type.Ref(propBindingIRSchema))),
    slots: Type.Optional(
      Type.Record(
        Type.String({ minLength: 1 }),
        Type.Array(nonEmptyStringSchema, { uniqueItems: true }),
      ),
    ),
    children: Type.Array(nonEmptyStringSchema, { uniqueItems: true }),
    layout: Type.Optional(Type.Ref(layoutIRSchema)),
    sourceRegionIds: Type.Array(nonEmptyStringSchema, {
      minItems: 1,
      uniqueItems: true,
    }),
  },
  {
    $id: "https://generative-ui.dev/schemas/compiler/ir/component/1.0",
    additionalProperties: false,
  },
);

export type ComponentIR = Static<typeof componentIRSchema>;

export const actionParameterIRSchema = Type.Union(
  [
    Type.Object(
      {
        kind: Type.Literal("source-binding"),
        sourcePointer: jsonPointerSchema,
      },
      {
        additionalProperties: false,
      },
    ),
    Type.Object(
      {
        kind: Type.Literal("literal"),
        value: Type.Union([Type.String(), Type.Number(), Type.Boolean()]),
      },
      {
        additionalProperties: false,
      },
    ),
  ],
  {
    $id: "https://generative-ui.dev/schemas/compiler/ir/action-parameter/1.0",
  },
);

export type ActionParameterIR = Static<typeof actionParameterIRSchema>;

export const actionIRSchema = Type.Object(
  {
    actionId: nonEmptyStringSchema,
    actionType: nonEmptyStringSchema,
    label: nonEmptyStringSchema,
    payload: Type.Optional(
      Type.Record(
        Type.String({
          pattern:
            "^(?!(?:actionId|requiresApproval|destructive)$)[A-Za-z][A-Za-z0-9_-]*$",
        }),
        Type.Ref(actionParameterIRSchema),
        {
          additionalProperties: false,
        },
      ),
    ),
    requiresApproval: Type.Boolean(),
    destructive: Type.Boolean(),
  },
  {
    $id: "https://generative-ui.dev/schemas/compiler/ir/action/1.0",
    additionalProperties: false,
  },
);

export type ActionIR = Static<typeof actionIRSchema>;

export const componentActionBindingIRSchema = Type.Object(
  {
    componentId: nonEmptyStringSchema,
    actionId: nonEmptyStringSchema,
    event: Type.Union([Type.Literal("click"), Type.Literal("submit")]),
  },
  {
    $id: "https://generative-ui.dev/schemas/compiler/ir/action-binding/1.0",
    additionalProperties: false,
  },
);

export type ComponentActionBindingIR = Static<
  typeof componentActionBindingIRSchema
>;

export const uiSurfaceIRSchema = Type.Object(
  {
    irVersion: Type.Literal("1.0"),
    surfaceId: Type.Ref(surfaceIdSchema),
    catalog: Type.Ref(catalogReferenceSchema),
    rootComponentId: Type.Literal("root"),
    components: Type.Array(Type.Ref(componentIRSchema), { minItems: 1 }),
    dataSources: Type.Object(
      {
        sourceData: jsonValueReferenceSchema,
        derivedData: Type.Optional(jsonValueReferenceSchema),
      },
      {
        additionalProperties: false,
      },
    ),
    actions: Type.Array(Type.Ref(actionIRSchema)),
    actionBindings: Type.Array(Type.Ref(componentActionBindingIRSchema)),
    metadata: Type.Object(
      {
        scenario: uiPlanSchema.properties.scenario,
        locale: Type.Optional(nonEmptyStringSchema),
        theme: Type.Optional(nonEmptyStringSchema),
      },
      {
        additionalProperties: false,
      },
    ),
  },
  {
    $id: "https://generative-ui.dev/schemas/compiler/ir/surface/1.0",
    additionalProperties: false,
  },
);

export type UISurfaceIR = Static<typeof uiSurfaceIRSchema>;

export const a2UIDataBindingSchema = Type.Object(
  {
    path: jsonPointerSchema,
  },
  {
    $id: "https://generative-ui.dev/schemas/compiler/a2ui/data-binding/0.9.1",
    additionalProperties: false,
  },
);

export type A2UIDataBinding = Static<typeof a2UIDataBindingSchema>;

export const a2UIDynamicValueSchema = Type.Union(
  [
    Type.String(),
    Type.Number(),
    Type.Boolean(),
    Type.Array(jsonValueReferenceSchema),
    Type.Ref(a2UIDataBindingSchema),
  ],
  {
    $id: "https://generative-ui.dev/schemas/compiler/a2ui/dynamic-value/0.9.1",
  },
);

export type A2UIDynamicValue = Static<typeof a2UIDynamicValueSchema>;

export const a2UIEventActionSchema = Type.Object(
  {
    event: Type.Object(
      {
        name: nonEmptyStringSchema,
        context: Type.Intersect([
          Type.Object({
            actionId: nonEmptyStringSchema,
            requiresApproval: Type.Boolean(),
            destructive: Type.Boolean(),
          }),
          Type.Record(Type.String(), Type.Ref(a2UIDynamicValueSchema)),
        ]),
      },
      {
        additionalProperties: false,
      },
    ),
  },
  {
    $id: "https://generative-ui.dev/schemas/compiler/a2ui/event-action/0.9.1",
    additionalProperties: false,
  },
);

export type A2UIEventAction = Static<typeof a2UIEventActionSchema>;

export const a2UIComponentSchema = Type.Intersect(
  [
    Type.Object({
      id: nonEmptyStringSchema,
      component: nonEmptyStringSchema,
      action: Type.Optional(Type.Ref(a2UIEventActionSchema)),
    }),
    Type.Record(Type.String(), jsonValueReferenceSchema),
  ],
  {
    $id: "https://generative-ui.dev/schemas/compiler/a2ui/component/0.9.1",
  },
);

export type A2UIComponent = Static<typeof a2UIComponentSchema>;

export const createSurfaceOperationSchema = Type.Object(
  {
    version: Type.Literal("v0.9"),
    createSurface: Type.Object(
      {
        surfaceId: Type.Ref(surfaceIdSchema),
        catalogId: nonEmptyStringSchema,
        theme: Type.Optional(stringMapSchema),
        sendDataModel: Type.Optional(Type.Literal(false)),
      },
      {
        additionalProperties: false,
      },
    ),
  },
  {
    $id: "https://generative-ui.dev/schemas/compiler/a2ui/create-surface/0.9.1",
    additionalProperties: false,
  },
);

export type CreateSurfaceOperation = Static<
  typeof createSurfaceOperationSchema
>;

export const updateComponentsOperationSchema = Type.Object(
  {
    version: Type.Literal("v0.9"),
    updateComponents: Type.Object(
      {
        surfaceId: Type.Ref(surfaceIdSchema),
        components: Type.Array(Type.Ref(a2UIComponentSchema), {
          minItems: 1,
        }),
      },
      {
        additionalProperties: false,
      },
    ),
  },
  {
    $id: "https://generative-ui.dev/schemas/compiler/a2ui/update-components/0.9.1",
    additionalProperties: false,
  },
);

export type UpdateComponentsOperation = Static<
  typeof updateComponentsOperationSchema
>;

export const a2UIDataModelSchema = Type.Object(
  {
    sourceData: jsonValueReferenceSchema,
    derivedData: Type.Optional(jsonValueReferenceSchema),
  },
  {
    $id: "https://generative-ui.dev/schemas/compiler/a2ui/data-model/0.9.1",
    additionalProperties: false,
  },
);

export type A2UIDataModel = Static<typeof a2UIDataModelSchema>;

export const updateDataModelOperationSchema = Type.Object(
  {
    version: Type.Literal("v0.9"),
    updateDataModel: Type.Object(
      {
        surfaceId: Type.Ref(surfaceIdSchema),
        path: Type.Literal("/"),
        value: Type.Ref(a2UIDataModelSchema),
      },
      {
        additionalProperties: false,
      },
    ),
  },
  {
    $id: "https://generative-ui.dev/schemas/compiler/a2ui/update-data-model/0.9.1",
    additionalProperties: false,
  },
);

export type UpdateDataModelOperation = Static<
  typeof updateDataModelOperationSchema
>;

export const a2UIOperationSchema = Type.Union(
  [
    Type.Ref(createSurfaceOperationSchema),
    Type.Ref(updateComponentsOperationSchema),
    Type.Ref(updateDataModelOperationSchema),
  ],
  {
    $id: "https://generative-ui.dev/schemas/compiler/a2ui/operation/0.9.1",
  },
);

export type A2UIOperation = Static<typeof a2UIOperationSchema>;

export const a2UIOperationSequenceSchema = Type.Tuple(
  [
    Type.Ref(createSurfaceOperationSchema),
    Type.Ref(updateComponentsOperationSchema),
    Type.Ref(updateDataModelOperationSchema),
  ],
  {
    $id: "https://generative-ui.dev/schemas/compiler/a2ui/operation-sequence/0.9.1",
  },
);

export type A2UIOperationSequence = Static<typeof a2UIOperationSequenceSchema>;

export const compileMetadataSchema = Type.Object(
  {
    compilerVersion: nonEmptyStringSchema,
    catalog: Type.Ref(catalogReferenceSchema),
    catalogContentHash: Type.Ref(catalogContentHashSchema),
    durationMs: Type.Number({ minimum: 0 }),
    completedStages: Type.Array(Type.Ref(compileStageSchema), {
      uniqueItems: true,
    }),
  },
  {
    $id: "https://generative-ui.dev/schemas/compiler/metadata/1.0",
    additionalProperties: false,
  },
);

export type CompileMetadata = Static<typeof compileMetadataSchema>;

const compileResultCorrelationFields = {
  requestId: nonEmptyStringSchema,
  threadId: Type.Optional(nonEmptyStringSchema),
  runId: Type.Optional(nonEmptyStringSchema),
  metadata: Type.Ref(compileMetadataSchema),
};

const completedCompileResultSchema = Type.Object(
  {
    ...compileResultCorrelationFields,
    success: Type.Literal(true),
    degraded: Type.Literal(false),
    surfaceId: Type.Ref(surfaceIdSchema),
    operations: Type.Ref(a2UIOperationSequenceSchema),
  },
  {
    additionalProperties: false,
  },
);

const degradedCompileResultSchema = Type.Object(
  {
    ...compileResultCorrelationFields,
    success: Type.Literal(true),
    degraded: Type.Literal(true),
    fallback: Type.Object(
      {
        format: Type.Literal("markdown"),
        markdown: nonEmptyStringSchema,
      },
      {
        additionalProperties: false,
      },
    ),
    errors: Type.Array(Type.Ref(compileErrorSchema), { minItems: 1 }),
  },
  {
    additionalProperties: false,
  },
);

const failedCompileResultSchema = Type.Object(
  {
    ...compileResultCorrelationFields,
    success: Type.Literal(false),
    degraded: Type.Literal(false),
    errors: Type.Array(Type.Ref(compileErrorSchema), { minItems: 1 }),
  },
  {
    additionalProperties: false,
  },
);

export const uiCompileResultSchema = Type.Union(
  [
    completedCompileResultSchema,
    degradedCompileResultSchema,
    failedCompileResultSchema,
  ],
  {
    $id: "https://generative-ui.dev/schemas/compiler/result/1.0",
  },
);

export type UICompileResult = Static<typeof uiCompileResultSchema>;
