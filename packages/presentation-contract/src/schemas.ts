import { jsonValueSchema } from "@generative-ui/shared-types";
import { type Static, Type } from "@sinclair/typebox";

const nonEmptyStringSchema = Type.String({ minLength: 1 });
const jsonValueReferenceSchema = Type.Ref(jsonValueSchema);
const jsonPointerSchema = Type.String({
  pattern: "^/(?:[^~/]|~0|~1)*(?:/(?:[^~/]|~0|~1)*)*$",
});

const markdownContentSchema = Type.Object(
  {
    contentType: Type.Literal("markdown"),
    markdown: nonEmptyStringSchema,
  },
  {
    additionalProperties: false,
  },
);

const structuredDataContentSchema = Type.Object(
  {
    contentType: Type.Literal("structured-data"),
    data: jsonValueReferenceSchema,
    fallbackMarkdown: Type.Optional(nonEmptyStringSchema),
  },
  {
    additionalProperties: false,
  },
);

export const agentContentSchema = Type.Union(
  [markdownContentSchema, structuredDataContentSchema],
  {
    $id: "https://generative-ui.dev/schemas/presentation/agent-content/1.0",
  },
);

export type AgentContent = Static<typeof agentContentSchema>;

export const presentationContextSchema = Type.Object(
  {
    userMessage: Type.Optional(nonEmptyStringSchema),
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
    domain: Type.Optional(nonEmptyStringSchema),
  },
  {
    $id: "https://generative-ui.dev/schemas/presentation/context/1.0",
    additionalProperties: false,
  },
);

export type PresentationContext = Static<typeof presentationContextSchema>;

export const catalogReferenceSchema = Type.Object(
  {
    catalogId: nonEmptyStringSchema,
    catalogVersion: nonEmptyStringSchema,
  },
  {
    $id: "https://generative-ui.dev/schemas/presentation/catalog-reference/1.0",
    additionalProperties: false,
  },
);

export type CatalogReference = Static<typeof catalogReferenceSchema>;

export const presentationRequestSchema = Type.Object(
  {
    requestId: nonEmptyStringSchema,
    threadId: Type.Optional(nonEmptyStringSchema),
    runId: Type.Optional(nonEmptyStringSchema),
    content: agentContentSchema,
    context: Type.Optional(presentationContextSchema),
    catalog: catalogReferenceSchema,
  },
  {
    $id: "https://generative-ui.dev/schemas/presentation/request/1.0",
    additionalProperties: false,
  },
);

export type PresentationRequest = Static<typeof presentationRequestSchema>;

export const sourceDataBindingSchema = Type.Object(
  {
    sourcePointer: jsonPointerSchema,
    role: Type.Union([
      Type.Literal("title"),
      Type.Literal("content"),
      Type.Literal("collection"),
      Type.Literal("status"),
      Type.Literal("form-data"),
    ]),
  },
  {
    $id: "https://generative-ui.dev/schemas/presentation/source-data-binding/1.0",
    additionalProperties: false,
  },
);

export type SourceDataBinding = Static<typeof sourceDataBindingSchema>;

export const componentPreferenceSchema = Type.Object(
  {
    componentType: nonEmptyStringSchema,
    reason: Type.Optional(nonEmptyStringSchema),
  },
  {
    $id: "https://generative-ui.dev/schemas/presentation/component-preference/1.0",
    additionalProperties: false,
  },
);

export type ComponentPreference = Static<typeof componentPreferenceSchema>;

export const layoutConstraintSchema = Type.Object(
  {
    flow: Type.Union([
      Type.Literal("vertical"),
      Type.Literal("horizontal"),
      Type.Literal("grid"),
    ]),
    density: Type.Union([Type.Literal("compact"), Type.Literal("comfortable")]),
    minColumns: Type.Optional(Type.Integer({ minimum: 1 })),
    maxColumns: Type.Optional(Type.Integer({ minimum: 1 })),
  },
  {
    $id: "https://generative-ui.dev/schemas/presentation/layout-constraint/1.0",
    additionalProperties: false,
  },
);

export type LayoutConstraint = Static<typeof layoutConstraintSchema>;

const actionParameterIntentSchema = Type.Union([
  Type.Object(
    {
      kind: Type.Literal("source-binding"),
      sourcePointer: jsonPointerSchema,
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("literal"),
      value: Type.Union([
        Type.String(),
        Type.Number(),
        Type.Boolean(),
        Type.Null(),
      ]),
    },
    { additionalProperties: false },
  ),
]);

const actionPayloadIntentSchema = Type.Record(
  Type.String({ pattern: "^[A-Za-z][A-Za-z0-9_-]*$" }),
  actionParameterIntentSchema,
  { additionalProperties: false },
);

export const actionIntentSchema = Type.Object(
  {
    actionId: nonEmptyStringSchema,
    actionType: nonEmptyStringSchema,
    label: nonEmptyStringSchema,
    targetRegionId: Type.Optional(nonEmptyStringSchema),
    payload: Type.Optional(actionPayloadIntentSchema),
    destructive: Type.Boolean(),
    requiresApproval: Type.Boolean(),
  },
  {
    $id: "https://generative-ui.dev/schemas/presentation/action-intent/1.0",
    additionalProperties: false,
  },
);

export type ActionIntent = Static<typeof actionIntentSchema>;

export const uiPlanRegionSchema = Type.Object(
  {
    regionId: nonEmptyStringSchema,
    purpose: nonEmptyStringSchema,
    bindings: Type.Array(sourceDataBindingSchema),
    componentPreferences: Type.Array(componentPreferenceSchema, {
      minItems: 1,
    }),
    layout: layoutConstraintSchema,
    actions: Type.Optional(Type.Array(actionIntentSchema)),
  },
  {
    $id: "https://generative-ui.dev/schemas/presentation/ui-plan-region/1.0",
    additionalProperties: false,
  },
);

export type UIPlanRegion = Static<typeof uiPlanRegionSchema>;

export const uiPlanSchema = Type.Object(
  {
    version: Type.Literal("1.0"),
    scenario: Type.Union([
      Type.Literal("summary"),
      Type.Literal("status"),
      Type.Literal("comparison"),
      Type.Literal("timeline"),
      Type.Literal("confirmation"),
      Type.Literal("form"),
      Type.Literal("detail"),
    ]),
    regions: Type.Array(uiPlanRegionSchema, { minItems: 1 }),
  },
  {
    $id: "https://generative-ui.dev/schemas/presentation/ui-plan/1.0",
    additionalProperties: false,
  },
);

export type UIPlan = Static<typeof uiPlanSchema>;

const markdownDecisionSchema = Type.Object(
  {
    mode: Type.Literal("markdown"),
    reason: nonEmptyStringSchema,
  },
  {
    additionalProperties: false,
  },
);

const generativeUIDecisionSchema = Type.Object(
  {
    mode: Type.Literal("generative-ui"),
    reason: nonEmptyStringSchema,
    plan: uiPlanSchema,
  },
  {
    additionalProperties: false,
  },
);

export const presentationDecisionSchema = Type.Union(
  [markdownDecisionSchema, generativeUIDecisionSchema],
  {
    $id: "https://generative-ui.dev/schemas/presentation/decision/1.0",
  },
);

export type PresentationDecision = Static<typeof presentationDecisionSchema>;

export const presentationErrorSchema = Type.Object(
  {
    code: nonEmptyStringSchema,
    message: nonEmptyStringSchema,
    stage: Type.Union([
      Type.Literal("input-validation"),
      Type.Literal("content-serialization"),
      Type.Literal("presentation-routing"),
      Type.Literal("model-analysis"),
      Type.Literal("ui-plan-validation"),
      Type.Literal("ui-compilation"),
    ]),
    retryable: Type.Boolean(),
    details: Type.Optional(jsonValueReferenceSchema),
  },
  {
    $id: "https://generative-ui.dev/schemas/presentation/error/1.0",
    additionalProperties: false,
  },
);

export type PresentationError = Static<typeof presentationErrorSchema>;

const serializedOperationObjectSchema = Type.Object(
  {},
  {
    additionalProperties: jsonValueReferenceSchema,
    minProperties: 1,
  },
);

const completedMarkdownResultSchema = Type.Object(
  {
    requestId: nonEmptyStringSchema,
    status: Type.Literal("completed"),
    mode: Type.Literal("markdown"),
    markdown: nonEmptyStringSchema,
  },
  {
    additionalProperties: false,
  },
);

const completedGenerativeUIResultSchema = Type.Object(
  {
    requestId: nonEmptyStringSchema,
    status: Type.Literal("completed"),
    mode: Type.Literal("generative-ui"),
    surfaceId: nonEmptyStringSchema,
    operations: Type.Array(serializedOperationObjectSchema, {
      minItems: 1,
    }),
  },
  {
    additionalProperties: false,
  },
);

const degradedMarkdownResultSchema = Type.Object(
  {
    requestId: nonEmptyStringSchema,
    status: Type.Literal("degraded"),
    mode: Type.Literal("markdown"),
    markdown: nonEmptyStringSchema,
    errors: Type.Array(Type.Ref(presentationErrorSchema), { minItems: 1 }),
  },
  {
    additionalProperties: false,
  },
);

const failedPresentationResultSchema = Type.Object(
  {
    requestId: nonEmptyStringSchema,
    status: Type.Literal("failed"),
    errors: Type.Array(Type.Ref(presentationErrorSchema), { minItems: 1 }),
  },
  {
    additionalProperties: false,
  },
);

export const presentationResultSchema = Type.Union(
  [
    completedMarkdownResultSchema,
    completedGenerativeUIResultSchema,
    degradedMarkdownResultSchema,
    failedPresentationResultSchema,
  ],
  {
    $id: "https://generative-ui.dev/schemas/presentation/result/1.0",
  },
);

export type PresentationResult = Static<typeof presentationResultSchema>;
