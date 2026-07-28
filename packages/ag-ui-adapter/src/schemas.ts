import { uiCompileRequestSchema } from "@generative-ui/compiler-contract";
import {
  presentationErrorSchema,
  presentationResultSchema,
} from "@generative-ui/presentation-contract";
import { type Static, Type } from "@sinclair/typebox";

const nonEmptyStringSchema = Type.String({ minLength: 1 });
const correlationKeys = ["requestId", "threadId", "runId"] as const;

export const agUIRequestCorrelationSchema = Type.Object(
  {
    requestId: Type.Optional(nonEmptyStringSchema),
    threadId: Type.Optional(nonEmptyStringSchema),
    runId: Type.Optional(nonEmptyStringSchema),
  },
  {
    $id: "https://generative-ui.dev/schemas/ag-ui/request-correlation/1.0",
    additionalProperties: false,
  },
);

export type AGUIRequestCorrelation = Static<
  typeof agUIRequestCorrelationSchema
>;

export const agUICompileRequestBodySchema = Type.Omit(
  uiCompileRequestSchema,
  correlationKeys,
  {
    $id: "https://generative-ui.dev/schemas/ag-ui/compile-request-body/1.0",
  },
);

export type AGUICompileRequestBody = Static<
  typeof agUICompileRequestBodySchema
>;

export const agUICompileRequestSchema = Type.Object(
  {
    requestId: Type.Optional(nonEmptyStringSchema),
    threadId: Type.Optional(nonEmptyStringSchema),
    runId: Type.Optional(nonEmptyStringSchema),
    compileRequest: Type.Ref(agUICompileRequestBodySchema),
  },
  {
    $id: "https://generative-ui.dev/schemas/ag-ui/compile-request/1.0",
    additionalProperties: false,
  },
);

export type AGUICompileRequest = Static<typeof agUICompileRequestSchema>;

export const agUIRequestContextSchema = Type.Object(
  {
    requestId: nonEmptyStringSchema,
    threadId: nonEmptyStringSchema,
    runId: nonEmptyStringSchema,
  },
  {
    $id: "https://generative-ui.dev/schemas/ag-ui/request-context/1.0",
    additionalProperties: false,
  },
);

export type AGUIRequestContext = Static<typeof agUIRequestContextSchema>;

export const parsedAGUICompileRequestSchema = Type.Object(
  {
    request: Type.Ref(uiCompileRequestSchema),
    context: Type.Ref(agUIRequestContextSchema),
  },
  {
    $id: "https://generative-ui.dev/schemas/ag-ui/parsed-compile-request/1.0",
    additionalProperties: false,
  },
);

export type ParsedAGUICompileRequest = Static<
  typeof parsedAGUICompileRequestSchema
>;

export const runStartedEventSchema = Type.Object(
  {
    type: Type.Literal("RUN_STARTED"),
    threadId: nonEmptyStringSchema,
    runId: nonEmptyStringSchema,
    timestamp: Type.Optional(Type.Number({ minimum: 0 })),
  },
  {
    $id: "https://generative-ui.dev/schemas/ag-ui/event/run-started/1.0",
    additionalProperties: false,
  },
);

export type RunStartedEvent = Static<typeof runStartedEventSchema>;

export const runFinishedEventSchema = Type.Object(
  {
    type: Type.Literal("RUN_FINISHED"),
    threadId: nonEmptyStringSchema,
    runId: nonEmptyStringSchema,
    timestamp: Type.Optional(Type.Number({ minimum: 0 })),
  },
  {
    $id: "https://generative-ui.dev/schemas/ag-ui/event/run-finished/1.0",
    additionalProperties: false,
  },
);

export type RunFinishedEvent = Static<typeof runFinishedEventSchema>;

export const runErrorEventSchema = Type.Object(
  {
    type: Type.Literal("RUN_ERROR"),
    message: nonEmptyStringSchema,
    code: Type.Optional(nonEmptyStringSchema),
    timestamp: Type.Optional(Type.Number({ minimum: 0 })),
  },
  {
    $id: "https://generative-ui.dev/schemas/ag-ui/event/run-error/1.0",
    additionalProperties: false,
  },
);

export type RunErrorEvent = Static<typeof runErrorEventSchema>;

export const stepStartedEventSchema = Type.Object(
  {
    type: Type.Literal("STEP_STARTED"),
    stepName: nonEmptyStringSchema,
    timestamp: Type.Optional(Type.Number({ minimum: 0 })),
  },
  {
    $id: "https://generative-ui.dev/schemas/ag-ui/event/step-started/1.0",
    additionalProperties: false,
  },
);

export type StepStartedEvent = Static<typeof stepStartedEventSchema>;

export const stepFinishedEventSchema = Type.Object(
  {
    type: Type.Literal("STEP_FINISHED"),
    stepName: nonEmptyStringSchema,
    timestamp: Type.Optional(Type.Number({ minimum: 0 })),
  },
  {
    $id: "https://generative-ui.dev/schemas/ag-ui/event/step-finished/1.0",
    additionalProperties: false,
  },
);

export type StepFinishedEvent = Static<typeof stepFinishedEventSchema>;

export const consumablePresentationResultSchema = Type.Exclude(
  presentationResultSchema,
  Type.Object({
    status: Type.Literal("failed"),
  }),
  {
    $id: "https://generative-ui.dev/schemas/ag-ui/consumable-presentation-result/1.0",
  },
);

export type ConsumablePresentationResult = Static<
  typeof consumablePresentationResultSchema
>;

export const presentationResultPayloadSchema = Type.Object(
  {
    mappingVersion: Type.Literal("1.0"),
    result: Type.Ref(consumablePresentationResultSchema),
  },
  {
    $id: "https://generative-ui.dev/schemas/ag-ui/payload/presentation-result/1.0",
    additionalProperties: false,
  },
);

export type PresentationResultPayload = Static<
  typeof presentationResultPayloadSchema
>;

export const presentationErrorPayloadSchema = Type.Object(
  {
    mappingVersion: Type.Literal("1.0"),
    errors: Type.Array(Type.Ref(presentationErrorSchema), { minItems: 1 }),
  },
  {
    $id: "https://generative-ui.dev/schemas/ag-ui/payload/presentation-error/1.0",
    additionalProperties: false,
  },
);

export type PresentationErrorPayload = Static<
  typeof presentationErrorPayloadSchema
>;

export const presentationResultCustomEventSchema = Type.Object(
  {
    type: Type.Literal("CUSTOM"),
    name: Type.Literal("generative-ui.presentation-result"),
    value: Type.Ref(presentationResultPayloadSchema),
    timestamp: Type.Optional(Type.Number({ minimum: 0 })),
  },
  {
    $id: "https://generative-ui.dev/schemas/ag-ui/event/presentation-result/1.0",
    additionalProperties: false,
  },
);

export type PresentationResultCustomEvent = Static<
  typeof presentationResultCustomEventSchema
>;

export const presentationErrorCustomEventSchema = Type.Object(
  {
    type: Type.Literal("CUSTOM"),
    name: Type.Literal("generative-ui.presentation-error"),
    value: Type.Ref(presentationErrorPayloadSchema),
    timestamp: Type.Optional(Type.Number({ minimum: 0 })),
  },
  {
    $id: "https://generative-ui.dev/schemas/ag-ui/event/presentation-error/1.0",
    additionalProperties: false,
  },
);

export type PresentationErrorCustomEvent = Static<
  typeof presentationErrorCustomEventSchema
>;

export const agUIEventSchema = Type.Union(
  [
    Type.Ref(runStartedEventSchema),
    Type.Ref(stepStartedEventSchema),
    Type.Ref(stepFinishedEventSchema),
    Type.Ref(presentationResultCustomEventSchema),
    Type.Ref(presentationErrorCustomEventSchema),
    Type.Ref(runFinishedEventSchema),
    Type.Ref(runErrorEventSchema),
  ],
  {
    $id: "https://generative-ui.dev/schemas/ag-ui/event/1.0",
  },
);

export type AGUIEvent = Static<typeof agUIEventSchema>;

export const agUIEventSequenceSchema = Type.Array(Type.Ref(agUIEventSchema), {
  $id: "https://generative-ui.dev/schemas/ag-ui/event-sequence/1.0",
  minItems: 3,
});

export type AGUIEventSequence = Static<typeof agUIEventSequenceSchema>;
