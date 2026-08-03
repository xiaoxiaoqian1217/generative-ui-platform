import type {
  PlatformErrorCode,
  RuntimeDiagnosticStage,
  RuntimeDiagnosticsSummary,
} from "@generative-ui/runtime-contract";
import type {
  PresentationPipelineObservabilityPort,
  SafeStageObservation,
} from "@generative-ui/presentation-pipeline";
import type { PresentationResult } from "@generative-ui/presentation-contract";

const pipelineStages = [
  "input-validation",
  "content-serialization",
  "catalog-resolution",
  "presentation-routing",
  "model-analysis",
  "ui-plan-validation",
  "ui-compilation",
] as const;

type PipelineStageName = (typeof pipelineStages)[number];

function stageStatus(
  result: SafeStageObservation["result"],
): RuntimeDiagnosticStage["status"] {
  if (result === "completed" || result === "skipped") return result;
  if (result === "cancelled" || result === "timed-out") return result;
  return result === "failed" ? "failed" : "unavailable";
}

function presentationErrorCode(
  presentation: PresentationResult,
): PlatformErrorCode | undefined {
  return "errors" in presentation
    ? "PRESENTATION_PIPELINE_ERROR"
    : undefined;
}

/**
 * Collects a fixed, payload-free projection of the embedded Presentation Pipeline.
 * It deliberately has no logging or tracing SDK dependency.
 */
export function createRuntimeDiagnostics(input: {
  agentId: string;
  presentationRequestId?: string;
  actionId?: string;
  modelProvider?: string;
  modelName?: string;
}): {
  readonly pipelineObservation: PresentationPipelineObservabilityPort;
  setPresentationRequestId(value: string): void;
  forBusinessAgent(input: {
    status: "completed" | "failed";
    durationMs: number;
    errorCode?: PlatformErrorCode;
  }): RuntimeDiagnosticsSummary;
  forValidationFailure(
    errorCode: PlatformErrorCode,
    actionId?: string,
  ): RuntimeDiagnosticsSummary;
  forPresentation(presentation: PresentationResult): RuntimeDiagnosticsSummary;
} {
  let presentationRequestId = input.presentationRequestId;
  const stages = new Map<PipelineStageName, RuntimeDiagnosticStage>(
    pipelineStages.map((name) => [name, { name, status: "not-started" }]),
  );
  const pipelineObservation: PresentationPipelineObservabilityPort = {
    recordStageCompletion(observation) {
      stages.set(observation.stage, {
        name: observation.stage,
        status: stageStatus(observation.result),
        durationMs: observation.durationMs,
        ...(observation.errorCode === undefined
          ? {}
          : { errorCode: "PRESENTATION_PIPELINE_ERROR" }),
      });
    },
  };
  const summary = (extra: {
    presentation?: PresentationResult;
    businessAgentStatus?: "completed" | "failed";
    errorCode?: PlatformErrorCode;
    businessAgentDurationMs?: number;
  }): RuntimeDiagnosticsSummary => {
    const presentation = extra.presentation;
    const errorCode = extra.errorCode ??
      (presentation === undefined ? undefined : presentationErrorCode(presentation));
    const uiPlanStage = stages.get("ui-plan-validation");
    const modelLatencyMs = stages.get("model-analysis")?.durationMs;
    const compilerLatencyMs = stages.get("ui-compilation")?.durationMs;
    return {
      correlation: {
        agentId: input.agentId,
        ...(presentationRequestId === undefined
          ? {}
          : { presentationRequestId }),
        ...(input.actionId === undefined ? {} : { actionId: input.actionId }),
        ...(presentation !== undefined && "mode" in presentation && presentation.mode === "generative-ui"
          ? { surfaceId: presentation.surfaceId }
          : {}),
      },
      stages: [
        {
          name: "business-agent",
          status:
            extra.businessAgentStatus === "failed" ? "failed" : "completed",
          ...(extra.businessAgentDurationMs === undefined
            ? {}
            : { durationMs: extra.businessAgentDurationMs }),
          ...(extra.businessAgentStatus === "failed" && errorCode !== undefined
            ? { errorCode }
            : {}),
        },
        ...pipelineStages.flatMap((name) => {
          const stage = stages.get(name);
          return stage === undefined ? [] : [stage];
        }),
      ],
      ...(presentation === undefined || !("mode" in presentation)
        ? {}
        : {
            presentationDecisionMode: presentation.mode,
            presentationMode: presentation.mode,
            ...(input.modelProvider === undefined
              ? {}
              : { modelProvider: input.modelProvider }),
            ...(input.modelName === undefined ? {} : { modelName: input.modelName }),
            ...(modelLatencyMs === undefined
              ? {}
              : { modelLatencyMs }),
            ...(compilerLatencyMs === undefined
              ? {}
              : { compilerLatencyMs }),
            uiPlanValidationStatus:
              presentation.mode === "markdown"
                ? uiPlanStage?.status === "failed"
                  ? "invalid"
                  : "not-applicable"
                : uiPlanStage?.status === "failed"
                  ? "invalid"
                  : "valid",
            ...(presentation.status === "degraded" && errorCode !== undefined
              ? { degradationReasonCode: errorCode }
              : {}),
          }),
      ...(errorCode === undefined ? {} : { normalizedErrorCode: errorCode }),
    };
  };

  return Object.freeze({
    pipelineObservation,
    setPresentationRequestId: (value) => {
      presentationRequestId = value;
    },
    forBusinessAgent: ({ status, durationMs, errorCode }) =>
      summary({
        businessAgentStatus: status,
        businessAgentDurationMs: durationMs,
        ...(errorCode === undefined ? {} : { errorCode }),
      }),
    forValidationFailure: (errorCode, actionId) => ({
      correlation: {
        agentId: input.agentId,
        ...(actionId === undefined ? {} : { actionId }),
      },
      stages: [
        { name: "action-validation", status: "failed", errorCode },
        ...pipelineStages.map((name) => ({ name, status: "not-started" as const })),
      ],
      normalizedErrorCode: errorCode,
    }),
    forPresentation: (presentation) => summary({ presentation }),
  });
}
