import {
  agentContentSchema,
  catalogReferenceSchema,
  presentationContextSchema,
  presentationResultSchema,
} from "@generative-ui/presentation-contract";
import { jsonValueSchema } from "@generative-ui/shared-types";
import { type Static, Type } from "@sinclair/typebox";

const nonEmptyStringSchema = Type.String({ minLength: 1 });
const jsonValueReferenceSchema = Type.Ref(jsonValueSchema);

export const runtimeProtocolVersionSchema = Type.Literal("1.0", {
  $id: "https://generative-ui.dev/schemas/runtime/protocol-version/1.0",
});

export type RuntimeProtocolVersion = Static<
  typeof runtimeProtocolVersionSchema
>;

export const platformErrorCodeSchema = Type.Union(
  [
    Type.Literal("REQUEST_INVALID"),
    Type.Literal("REQUEST_TIMEOUT"),
    Type.Literal("REQUEST_CANCELLED"),
    Type.Literal("RUN_NOT_FOUND"),
    Type.Literal("ACTION_INVALID"),
    Type.Literal("ACTION_FORBIDDEN"),
    Type.Literal("ACTION_CONFLICT"),
    Type.Literal("SURFACE_NOT_FOUND"),
    Type.Literal("BUSINESS_AGENT_UNAVAILABLE"),
    Type.Literal("BUSINESS_AGENT_TIMEOUT"),
    Type.Literal("BUSINESS_AGENT_PROTOCOL_INVALID"),
    Type.Literal("BUSINESS_AGENT_ERROR"),
    Type.Literal("PRESENTATION_PIPELINE_ERROR"),
    Type.Literal("PRESENTATION_RESULT_INVALID"),
    Type.Literal("INTERNAL_ERROR"),
  ],
  {
    $id: "https://generative-ui.dev/schemas/runtime/error-code/1.0",
  },
);

export type PlatformErrorCode = Static<typeof platformErrorCodeSchema>;

export const platformErrorSchema = Type.Object(
  {
    code: Type.Ref(platformErrorCodeSchema),
    message: nonEmptyStringSchema,
    retryable: Type.Boolean(),
    requestId: Type.Optional(nonEmptyStringSchema),
    threadId: Type.Optional(nonEmptyStringSchema),
    runId: Type.Optional(nonEmptyStringSchema),
    presentationRequestId: Type.Optional(nonEmptyStringSchema),
    surfaceId: Type.Optional(nonEmptyStringSchema),
    actionId: Type.Optional(nonEmptyStringSchema),
    path: Type.Optional(Type.String()),
    constraint: Type.Optional(nonEmptyStringSchema),
  },
  {
    $id: "https://generative-ui.dev/schemas/runtime/error/1.0",
    additionalProperties: false,
  },
);

export type PlatformError = Static<typeof platformErrorSchema>;

export const runtimeDiagnosticStageNameSchema = Type.Union(
  [
    Type.Literal("runtime"),
    Type.Literal("request-validation"),
    Type.Literal("business-agent"),
    Type.Literal("action-validation"),
    Type.Literal("presentation-pipeline"),
    Type.Literal("response-validation"),
    Type.Literal("input-validation"),
    Type.Literal("content-serialization"),
    Type.Literal("catalog-resolution"),
    Type.Literal("presentation-routing"),
    Type.Literal("model-analysis"),
    Type.Literal("ui-plan-validation"),
    Type.Literal("ui-compilation"),
  ],
  {
    $id: "https://generative-ui.dev/schemas/runtime/diagnostic-stage-name/1.0",
  },
);

export type RuntimeDiagnosticStageName = Static<
  typeof runtimeDiagnosticStageNameSchema
>;

export const runtimeDiagnosticStageStatusSchema = Type.Union(
  [
    Type.Literal("not-started"),
    Type.Literal("not-configured"),
    Type.Literal("unavailable"),
    Type.Literal("skipped"),
    Type.Literal("completed"),
    Type.Literal("degraded"),
    Type.Literal("failed"),
    Type.Literal("cancelled"),
    Type.Literal("timed-out"),
  ],
  {
    $id: "https://generative-ui.dev/schemas/runtime/diagnostic-stage-status/1.0",
  },
);

export type RuntimeDiagnosticStageStatus = Static<
  typeof runtimeDiagnosticStageStatusSchema
>;

export const runtimeDiagnosticStageSchema = Type.Object(
  {
    name: Type.Ref(runtimeDiagnosticStageNameSchema),
    status: Type.Ref(runtimeDiagnosticStageStatusSchema),
    durationMs: Type.Optional(Type.Number({ minimum: 0 })),
    errorCode: Type.Optional(Type.Ref(platformErrorCodeSchema)),
  },
  {
    $id: "https://generative-ui.dev/schemas/runtime/diagnostic-stage/1.0",
    additionalProperties: false,
  },
);

export type RuntimeDiagnosticStage = Static<
  typeof runtimeDiagnosticStageSchema
>;

export const normalizedModelUsageSchema = Type.Object(
  {
    inputTokens: Type.Optional(Type.Number({ minimum: 0 })),
    outputTokens: Type.Optional(Type.Number({ minimum: 0 })),
    totalTokens: Type.Optional(Type.Number({ minimum: 0 })),
  },
  {
    $id: "https://generative-ui.dev/schemas/runtime/normalized-model-usage/1.0",
    additionalProperties: false,
  },
);

export type NormalizedModelUsage = Static<typeof normalizedModelUsageSchema>;

export const runtimeDiagnosticsCorrelationSchema = Type.Object(
  {
    agentId: Type.Optional(nonEmptyStringSchema),
    presentationRequestId: Type.Optional(nonEmptyStringSchema),
    surfaceId: Type.Optional(nonEmptyStringSchema),
    actionId: Type.Optional(nonEmptyStringSchema),
  },
  {
    $id: "https://generative-ui.dev/schemas/runtime/diagnostics-correlation/1.0",
    additionalProperties: false,
  },
);

export type RuntimeDiagnosticsCorrelation = Static<
  typeof runtimeDiagnosticsCorrelationSchema
>;

export const runtimeDiagnosticsSummarySchema = Type.Object(
  {
    stages: Type.Array(Type.Ref(runtimeDiagnosticStageSchema)),
    correlation: Type.Optional(Type.Ref(runtimeDiagnosticsCorrelationSchema)),
    presentationDecisionMode: Type.Optional(
      Type.Union([Type.Literal("markdown"), Type.Literal("generative-ui")]),
    ),
    presentationMode: Type.Optional(
      Type.Union([Type.Literal("markdown"), Type.Literal("generative-ui")]),
    ),
    modelProvider: Type.Optional(nonEmptyStringSchema),
    modelName: Type.Optional(nonEmptyStringSchema),
    modelLatencyMs: Type.Optional(Type.Number({ minimum: 0 })),
    compilerLatencyMs: Type.Optional(Type.Number({ minimum: 0 })),
    uiPlanValidationStatus: Type.Optional(
      Type.Union([
        Type.Literal("not-started"),
        Type.Literal("not-applicable"),
        Type.Literal("valid"),
        Type.Literal("invalid"),
      ]),
    ),
    degradationReasonCode: Type.Optional(nonEmptyStringSchema),
    normalizedErrorCode: Type.Optional(Type.Ref(platformErrorCodeSchema)),
    normalizedModelUsage: Type.Optional(Type.Ref(normalizedModelUsageSchema)),
  },
  {
    $id: "https://generative-ui.dev/schemas/runtime/diagnostics-summary/1.0",
    additionalProperties: false,
  },
);

export type RuntimeDiagnosticsSummary = Static<
  typeof runtimeDiagnosticsSummarySchema
>;

export const runtimeActionEnvelopeSchema = Type.Object(
  {
    actionId: nonEmptyStringSchema,
    actionType: nonEmptyStringSchema,
    surfaceId: nonEmptyStringSchema,
    payload: Type.Optional(jsonValueReferenceSchema),
    approved: Type.Optional(Type.Boolean()),
  },
  {
    $id: "https://generative-ui.dev/schemas/runtime/action-envelope/1.0",
    additionalProperties: false,
  },
);

export type RuntimeActionEnvelope = Static<typeof runtimeActionEnvelopeSchema>;

export const businessAgentContextSchema = Type.Object(
  {
    locale: Type.Optional(nonEmptyStringSchema),
    timezone: Type.Optional(nonEmptyStringSchema),
    domain: Type.Optional(nonEmptyStringSchema),
    metadata: Type.Optional(
      Type.Record(nonEmptyStringSchema, jsonValueReferenceSchema),
    ),
  },
  {
    $id: "https://generative-ui.dev/schemas/runtime/business-agent/context/1.0",
    additionalProperties: false,
  },
);

export type BusinessAgentContext = Static<typeof businessAgentContextSchema>;

const businessAgentRequestFields = {
  protocolVersion: Type.Ref(runtimeProtocolVersionSchema),
  requestId: nonEmptyStringSchema,
  threadId: nonEmptyStringSchema,
  runId: nonEmptyStringSchema,
  agentId: Type.Optional(nonEmptyStringSchema),
  context: Type.Optional(Type.Ref(businessAgentContextSchema)),
};

export const businessAgentRunRequestSchema = Type.Object(
  {
    ...businessAgentRequestFields,
    input: Type.Object(
      {
        message: nonEmptyStringSchema,
      },
      {
        additionalProperties: false,
      },
    ),
  },
  {
    $id: "https://generative-ui.dev/schemas/runtime/business-agent/run-request/1.0",
    additionalProperties: false,
  },
);

export type BusinessAgentRunRequest = Static<
  typeof businessAgentRunRequestSchema
>;

export const businessAgentResumeActionRequestSchema = Type.Object(
  {
    ...businessAgentRequestFields,
    action: Type.Ref(runtimeActionEnvelopeSchema),
  },
  {
    $id: "https://generative-ui.dev/schemas/runtime/business-agent/resume-action-request/1.0",
    additionalProperties: false,
  },
);

export type BusinessAgentResumeActionRequest = Static<
  typeof businessAgentResumeActionRequestSchema
>;

const businessAgentResultFields = {
  protocolVersion: Type.Ref(runtimeProtocolVersionSchema),
  requestId: nonEmptyStringSchema,
  threadId: nonEmptyStringSchema,
  runId: nonEmptyStringSchema,
  diagnostics: Type.Optional(Type.Ref(runtimeDiagnosticsSummarySchema)),
};

export const completedBusinessAgentRunResultSchema = Type.Object(
  {
    ...businessAgentResultFields,
    status: Type.Literal("completed"),
    content: Type.Ref(agentContentSchema),
  },
  {
    $id: "https://generative-ui.dev/schemas/runtime/business-agent/completed-run-result/1.0",
    additionalProperties: false,
  },
);

export const failedBusinessAgentRunResultSchema = Type.Object(
  {
    ...businessAgentResultFields,
    status: Type.Literal("failed"),
    error: Type.Ref(platformErrorSchema),
  },
  {
    $id: "https://generative-ui.dev/schemas/runtime/business-agent/failed-run-result/1.0",
    additionalProperties: false,
  },
);

export const businessAgentRunResultSchema = Type.Union(
  [completedBusinessAgentRunResultSchema, failedBusinessAgentRunResultSchema],
  {
    $id: "https://generative-ui.dev/schemas/runtime/business-agent/run-result/1.0",
  },
);

export type BusinessAgentRunResult = Static<
  typeof businessAgentRunResultSchema
>;

export const completedBusinessAgentResumeActionResultSchema = Type.Object(
  {
    ...businessAgentResultFields,
    status: Type.Literal("completed"),
    content: Type.Ref(agentContentSchema),
  },
  {
    $id: "https://generative-ui.dev/schemas/runtime/business-agent/completed-resume-action-result/1.0",
    additionalProperties: false,
  },
);

export const failedBusinessAgentResumeActionResultSchema = Type.Object(
  {
    ...businessAgentResultFields,
    status: Type.Literal("failed"),
    error: Type.Ref(platformErrorSchema),
  },
  {
    $id: "https://generative-ui.dev/schemas/runtime/business-agent/failed-resume-action-result/1.0",
    additionalProperties: false,
  },
);

export const businessAgentResumeActionResultSchema = Type.Union(
  [
    completedBusinessAgentResumeActionResultSchema,
    failedBusinessAgentResumeActionResultSchema,
  ],
  {
    $id: "https://generative-ui.dev/schemas/runtime/business-agent/resume-action-result/1.0",
  },
);

export type BusinessAgentResumeActionResult = Static<
  typeof businessAgentResumeActionResultSchema
>;

export const runtimeRunRequestSchema = Type.Object(
  {
    protocolVersion: Type.Ref(runtimeProtocolVersionSchema),
    requestId: nonEmptyStringSchema,
    threadId: Type.Optional(nonEmptyStringSchema),
    runId: Type.Optional(nonEmptyStringSchema),
    agentId: Type.Optional(nonEmptyStringSchema),
    message: Type.Object(
      {
        role: Type.Literal("user"),
        content: nonEmptyStringSchema,
      },
      {
        additionalProperties: false,
      },
    ),
    presentation: Type.Optional(
      Type.Object(
        {
          catalog: Type.Optional(Type.Ref(catalogReferenceSchema)),
          context: Type.Optional(Type.Ref(presentationContextSchema)),
        },
        {
          additionalProperties: false,
        },
      ),
    ),
  },
  {
    $id: "https://generative-ui.dev/schemas/runtime/run-request/1.0",
    additionalProperties: false,
  },
);

export type RuntimeRunRequest = Static<typeof runtimeRunRequestSchema>;

export const runtimeActionRequestSchema = Type.Object(
  {
    protocolVersion: Type.Ref(runtimeProtocolVersionSchema),
    requestId: nonEmptyStringSchema,
    threadId: nonEmptyStringSchema,
    runId: nonEmptyStringSchema,
    action: Type.Ref(runtimeActionEnvelopeSchema),
  },
  {
    $id: "https://generative-ui.dev/schemas/runtime/action-request/1.0",
    additionalProperties: false,
  },
);

export type RuntimeActionRequest = Static<typeof runtimeActionRequestSchema>;

const runtimeResultFields = {
  protocolVersion: Type.Ref(runtimeProtocolVersionSchema),
  requestId: nonEmptyStringSchema,
  threadId: nonEmptyStringSchema,
  runId: nonEmptyStringSchema,
  presentationRequestId: Type.Optional(nonEmptyStringSchema),
  diagnostics: Type.Optional(Type.Ref(runtimeDiagnosticsSummarySchema)),
};

export const completedRuntimeRunResultSchema = Type.Object(
  {
    ...runtimeResultFields,
    presentationRequestId: nonEmptyStringSchema,
    status: Type.Union([Type.Literal("completed"), Type.Literal("degraded")]),
    presentation: Type.Ref(presentationResultSchema),
  },
  {
    $id: "https://generative-ui.dev/schemas/runtime/completed-run-result/1.0",
    additionalProperties: false,
  },
);

export const failedRuntimeRunResultSchema = Type.Object(
  {
    ...runtimeResultFields,
    status: Type.Literal("failed"),
    error: Type.Ref(platformErrorSchema),
    presentation: Type.Optional(Type.Ref(presentationResultSchema)),
  },
  {
    $id: "https://generative-ui.dev/schemas/runtime/failed-run-result/1.0",
    additionalProperties: false,
  },
);

export const runtimeRunResultSchema = Type.Union(
  [completedRuntimeRunResultSchema, failedRuntimeRunResultSchema],
  {
    $id: "https://generative-ui.dev/schemas/runtime/run-result/1.0",
  },
);

export type RuntimeRunResult = Static<typeof runtimeRunResultSchema>;

export const completedRuntimeActionResultSchema = Type.Object(
  {
    ...runtimeResultFields,
    sourcePresentationRequestId: nonEmptyStringSchema,
    presentationRequestId: nonEmptyStringSchema,
    actionId: nonEmptyStringSchema,
    status: Type.Union([Type.Literal("completed"), Type.Literal("degraded")]),
    presentation: Type.Ref(presentationResultSchema),
  },
  {
    $id: "https://generative-ui.dev/schemas/runtime/completed-action-result/1.0",
    additionalProperties: false,
  },
);

export const failedRuntimeActionResultSchema = Type.Object(
  {
    ...runtimeResultFields,
    actionId: Type.Optional(nonEmptyStringSchema),
    status: Type.Literal("failed"),
    error: Type.Ref(platformErrorSchema),
    presentation: Type.Optional(Type.Ref(presentationResultSchema)),
  },
  {
    $id: "https://generative-ui.dev/schemas/runtime/failed-action-result/1.0",
    additionalProperties: false,
  },
);

export const runtimeActionResultSchema = Type.Union(
  [completedRuntimeActionResultSchema, failedRuntimeActionResultSchema],
  {
    $id: "https://generative-ui.dev/schemas/runtime/action-result/1.0",
  },
);

export type RuntimeActionResult = Static<typeof runtimeActionResultSchema>;

const runtimeWebSocketRunRequestMessageSchema = Type.Object(
  {
    type: Type.Literal("runtime.run.request"),
    payload: Type.Ref(runtimeRunRequestSchema),
  },
  {
    additionalProperties: false,
  },
);

const runtimeWebSocketActionRequestMessageSchema = Type.Object(
  {
    type: Type.Literal("runtime.action.request"),
    payload: Type.Ref(runtimeActionRequestSchema),
  },
  {
    additionalProperties: false,
  },
);

export const runtimeWebSocketInboundMessageSchema = Type.Union(
  [
    runtimeWebSocketRunRequestMessageSchema,
    runtimeWebSocketActionRequestMessageSchema,
  ],
  {
    $id: "https://generative-ui.dev/schemas/runtime/ws/inbound-message/1.0",
  },
);

export type RuntimeWebSocketInboundMessage = Static<
  typeof runtimeWebSocketInboundMessageSchema
>;

const runtimeWebSocketRunResultMessageSchema = Type.Object(
  {
    type: Type.Literal("runtime.run.result"),
    payload: Type.Ref(runtimeRunResultSchema),
  },
  {
    additionalProperties: false,
  },
);

const runtimeWebSocketActionResultMessageSchema = Type.Object(
  {
    type: Type.Literal("runtime.action.result"),
    payload: Type.Ref(runtimeActionResultSchema),
  },
  {
    additionalProperties: false,
  },
);

const runtimeWebSocketErrorMessageSchema = Type.Object(
  {
    type: Type.Literal("runtime.error"),
    payload: Type.Ref(platformErrorSchema),
  },
  {
    additionalProperties: false,
  },
);

export const runtimeWebSocketOutboundMessageSchema = Type.Union(
  [
    runtimeWebSocketRunResultMessageSchema,
    runtimeWebSocketActionResultMessageSchema,
    runtimeWebSocketErrorMessageSchema,
  ],
  {
    $id: "https://generative-ui.dev/schemas/runtime/ws/outbound-message/1.0",
  },
);

export type RuntimeWebSocketOutboundMessage = Static<
  typeof runtimeWebSocketOutboundMessageSchema
>;
