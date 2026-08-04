import { randomUUID } from "node:crypto";
import type { BusinessAgentAdapter } from "@generative-ui/business-agent-adapter";
import {
  type ComponentCatalog,
  defaultCatalogSchemaLimits,
  validateActionPayload,
} from "@generative-ui/component-catalog-schema";
import type { PresentationPipeline } from "@generative-ui/presentation-pipeline";
import type {
  PlatformError,
  RuntimeActionRequest,
  RuntimeActionResult,
  RuntimeRunRequest,
  RuntimeRunResult,
} from "@generative-ui/runtime-contract";
import {
  validateRuntimeActionRequest,
  validateRuntimeRunRequest,
} from "@generative-ui/runtime-contract";
import { createRuntimeDiagnostics } from "./runtime-diagnostics.js";
import type { SurfaceContextStore } from "./surface-context-store.js";

export interface RuntimeOrchestratorConfiguration {
  readonly totalTimeoutMs: number;
  readonly maxConcurrentRuns: number;
  readonly catalog: {
    readonly catalogId: string;
    readonly catalogVersion: string;
  };
  readonly catalogDefinition: ComponentCatalog;
  readonly agentId: string;
  readonly modelProvider?: string;
  readonly modelName?: string;
}

export interface RunOrchestrator {
  run(input: unknown, signal?: AbortSignal): Promise<RuntimeRunResult>;
  action(input: unknown, signal?: AbortSignal): Promise<RuntimeActionResult>;
  readonly capacity: {
    readonly maxConcurrentRuns: number;
    readonly activeRuns: () => number;
  };
}

function error(
  code: PlatformError["code"],
  message: string,
  request: Partial<RuntimeRunRequest> = {},
): PlatformError {
  return {
    code,
    message,
    retryable: code === "BUSINESS_AGENT_UNAVAILABLE",
    ...(request.requestId === undefined
      ? {}
      : { requestId: request.requestId }),
    ...(request.threadId === undefined ? {} : { threadId: request.threadId }),
    ...(request.runId === undefined ? {} : { runId: request.runId }),
  };
}

function stringField(input: unknown, field: string, fallback: string): string {
  if (typeof input !== "object" || input === null) return fallback;
  const value = (input as Record<string, unknown>)[field];
  return typeof value === "string" ? value : fallback;
}

function fallbackMarkdown(content: {
  contentType: string;
  markdown?: string;
  fallbackMarkdown?: string;
}): string {
  if (content.contentType === "markdown")
    return content.markdown ?? "内容暂时不可展示。";
  return (
    content.fallbackMarkdown ?? "结构化业务结果已生成，但暂时无法以界面展示。"
  );
}

function withBudget(signal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new Error("Runtime request timed out.")),
    timeoutMs,
  );
  const abort = () =>
    controller.abort(signal?.reason ?? new Error("Runtime request cancelled."));
  signal?.addEventListener("abort", abort, { once: true });
  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    },
  };
}

function durationSince(startedAt: number): number {
  return Math.max(0, Math.trunc(performance.now() - startedAt));
}

interface TextConfirmationIntent {
  readonly pausedRunId: string;
  readonly actionId: string;
  readonly actionType: string;
}

function textConfirmationIntent(
  content: unknown,
): TextConfirmationIntent | undefined {
  if (typeof content !== "object" || content === null) return undefined;
  const data = (content as Record<string, unknown>).data;
  if (typeof data !== "object" || data === null) return undefined;
  const value = data as Record<string, unknown>;
  if (
    value.kind !== "confirmation-intent" ||
    typeof value.pausedRunId !== "string" ||
    typeof value.actionId !== "string" ||
    typeof value.actionType !== "string"
  )
    return undefined;
  return {
    pausedRunId: value.pausedRunId,
    actionId: value.actionId,
    actionType: value.actionType,
  };
}

export function createRunOrchestrator(dependencies: {
  businessAgentAdapter: BusinessAgentAdapter;
  presentationPipeline: PresentationPipeline;
  surfaceContextStore: SurfaceContextStore;
  configuration: RuntimeOrchestratorConfiguration;
}): RunOrchestrator {
  let active = 0;
  const acquire = () => {
    if (active >= dependencies.configuration.maxConcurrentRuns)
      throw new Error("RUNTIME_CAPACITY_EXHAUSTED");
    active += 1;
    return () => {
      active -= 1;
    };
  };

  const run = async (
    input: unknown,
    externalSignal?: AbortSignal,
  ): Promise<RuntimeRunResult> => {
    const validated = validateRuntimeRunRequest(input);
    if (!validated.success)
      return {
        protocolVersion: "1.0",
        requestId: stringField(input, "requestId", "invalid-request"),
        threadId: "invalid-thread",
        runId: "invalid-run",
        status: "failed",
        error: error("REQUEST_INVALID", "Runtime run request is invalid."),
      };
    const request = validated.value;
    const threadId = request.threadId ?? request.requestId;
    const runId = request.runId ?? randomUUID();
    const diagnostics = createRuntimeDiagnostics({
      agentId: request.agentId ?? dependencies.configuration.agentId,
      ...(dependencies.configuration.modelProvider === undefined
        ? {}
        : { modelProvider: dependencies.configuration.modelProvider }),
      ...(dependencies.configuration.modelName === undefined
        ? {}
        : { modelName: dependencies.configuration.modelName }),
    });
    let release: (() => void) | undefined;
    const budget = withBudget(
      externalSignal,
      dependencies.configuration.totalTimeoutMs,
    );
    try {
      release = acquire();
      const businessAgentStartedAt = performance.now();
      const agent = await dependencies.businessAgentAdapter.run(
        {
          protocolVersion: request.protocolVersion,
          requestId: request.requestId,
          threadId,
          runId,
          agentId: request.agentId ?? dependencies.configuration.agentId,
          input: { message: request.message.content },
        },
        { signal: budget.signal },
      );
      if (agent.status === "failed")
        return {
          protocolVersion: request.protocolVersion,
          requestId: request.requestId,
          threadId,
          runId,
          status: "failed",
          error: agent.error,
          diagnostics: diagnostics.forBusinessAgent({
            status: "failed",
            durationMs: durationSince(businessAgentStartedAt),
            errorCode: agent.error.code,
          }),
        };
      const confirmation = textConfirmationIntent(agent.content);
      if (confirmation !== undefined) {
        const context = dependencies.surfaceContextStore.findAction({
          threadId,
          runId: confirmation.pausedRunId,
          actionId: confirmation.actionId,
          actionType: confirmation.actionType,
        });
        if (context === undefined)
          return {
            protocolVersion: request.protocolVersion,
            requestId: request.requestId,
            threadId,
            runId,
            status: "failed",
            error: error(
              "ACTION_CONFLICT",
              "The paused confirmation action is unknown, expired, or already consumed.",
              { ...request, threadId, runId },
            ),
            diagnostics: diagnostics.forBusinessAgent({
              status: "failed",
              durationMs: durationSince(businessAgentStartedAt),
              errorCode: "ACTION_CONFLICT",
            }),
          };
        const actionResult = await action(
          {
            protocolVersion: request.protocolVersion,
            requestId: request.requestId,
            threadId,
            runId: confirmation.pausedRunId,
            action: {
              actionId: confirmation.actionId,
              actionType: confirmation.actionType,
              surfaceId: context.surfaceId,
              approved: true,
            },
          },
          budget.signal,
          true,
        );
        if (actionResult.status === "failed")
          return {
            protocolVersion: request.protocolVersion,
            requestId: request.requestId,
            threadId,
            runId: confirmation.pausedRunId,
            status: "failed",
            error: actionResult.error,
            ...(actionResult.presentation === undefined
              ? {}
              : { presentation: actionResult.presentation }),
            ...(actionResult.diagnostics === undefined
              ? {}
              : { diagnostics: actionResult.diagnostics }),
          };
        return {
          protocolVersion: request.protocolVersion,
          requestId: request.requestId,
          threadId,
          runId: confirmation.pausedRunId,
          presentationRequestId: actionResult.presentationRequestId,
          status: actionResult.status,
          presentation: actionResult.presentation,
          ...(actionResult.diagnostics === undefined
            ? {}
            : { diagnostics: actionResult.diagnostics }),
        };
      }
      const presentationRequestId = randomUUID();
      diagnostics.setPresentationRequestId(presentationRequestId);
      try {
        const presentation = await dependencies.presentationPipeline.present(
          {
            requestId: presentationRequestId,
            threadId,
            runId,
            content: agent.content,
            context: {
              userMessage: request.message.content,
              ...request.presentation?.context,
            },
            catalog:
              request.presentation?.catalog ??
              dependencies.configuration.catalog,
          },
          {
            signal: budget.signal,
            observability: diagnostics.pipelineObservation,
          },
        );
        if (presentation.status === "failed")
          return {
            protocolVersion: request.protocolVersion,
            requestId: request.requestId,
            threadId,
            runId,
            presentationRequestId,
            status: "failed",
            error: error(
              "PRESENTATION_PIPELINE_ERROR",
              "Presentation pipeline failed.",
              request,
            ),
            presentation,
            diagnostics: diagnostics.forPresentation(presentation),
          };
        if (presentation.mode === "generative-ui")
          dependencies.surfaceContextStore.remember(
            { ...request, threadId, runId },
            presentationRequestId,
            presentation,
          );
        return {
          protocolVersion: request.protocolVersion,
          requestId: request.requestId,
          threadId,
          runId,
          presentationRequestId,
          status: presentation.status,
          presentation,
          diagnostics: diagnostics.forPresentation(presentation),
        };
      } catch {
        const presentation = {
          requestId: presentationRequestId,
          status: "degraded" as const,
          mode: "markdown" as const,
          markdown: fallbackMarkdown(agent.content),
          errors: [
            {
              code: "RUNTIME_PIPELINE_FALLBACK",
              message:
                "Presentation pipeline failed; safe Markdown was returned.",
              stage: "presentation-routing" as const,
              retryable: false,
            },
          ],
        };
        return {
          protocolVersion: request.protocolVersion,
          requestId: request.requestId,
          threadId,
          runId,
          presentationRequestId,
          status: "degraded",
          presentation,
          diagnostics: diagnostics.forPresentation(presentation),
        };
      }
    } catch (cause) {
      const code = budget.signal.aborted
        ? externalSignal?.aborted
          ? "REQUEST_CANCELLED"
          : "REQUEST_TIMEOUT"
        : cause instanceof Error &&
            cause.message === "RUNTIME_CAPACITY_EXHAUSTED"
          ? "BUSINESS_AGENT_UNAVAILABLE"
          : "BUSINESS_AGENT_ERROR";
      return {
        protocolVersion: request.protocolVersion,
        requestId: request.requestId,
        threadId,
        runId,
        status: "failed",
        error: error(
          code,
          code === "REQUEST_TIMEOUT"
            ? "Runtime request timed out."
            : code === "REQUEST_CANCELLED"
              ? "Runtime request was cancelled."
              : "Business Agent invocation failed.",
          { ...request, threadId, runId },
        ),
        diagnostics: diagnostics.forBusinessAgent({
          status: "failed",
          durationMs: 0,
          errorCode: code,
        }),
      };
    } finally {
      budget.dispose();
      release?.();
    }
  };

  const action = async (
    input: unknown,
    externalSignal?: AbortSignal,
    capacityAlreadyHeld = false,
  ): Promise<RuntimeActionResult> => {
    const validated = validateRuntimeActionRequest(input);
    const requestId = stringField(input, "requestId", "invalid-request");
    if (!validated.success) {
      const diagnostics = createRuntimeDiagnostics({
        agentId: dependencies.configuration.agentId,
      });
      return {
        protocolVersion: "1.0",
        requestId,
        threadId: "invalid-thread",
        runId: "invalid-run",
        status: "failed",
        error: error("REQUEST_INVALID", "Runtime action request is invalid."),
        diagnostics: diagnostics.forValidationFailure("REQUEST_INVALID"),
      };
    }
    const request: RuntimeActionRequest = validated.value;
    const diagnostics = createRuntimeDiagnostics({
      agentId: dependencies.configuration.agentId,
      actionId: request.action.actionId,
      ...(dependencies.configuration.modelProvider === undefined
        ? {}
        : { modelProvider: dependencies.configuration.modelProvider }),
      ...(dependencies.configuration.modelName === undefined
        ? {}
        : { modelName: dependencies.configuration.modelName }),
    });
    const actionLookup = {
      ...request.action,
      threadId: request.threadId,
      runId: request.runId,
    };
    const context = dependencies.surfaceContextStore.get(actionLookup);
    if (!context)
      return {
        protocolVersion: request.protocolVersion,
        requestId: request.requestId,
        threadId: request.threadId,
        runId: request.runId,
        actionId: request.action.actionId,
        status: "failed",
        error: error(
          "SURFACE_NOT_FOUND",
          "Action surface is unknown, expired, or already consumed.",
          request,
        ),
        diagnostics: diagnostics.forValidationFailure(
          "SURFACE_NOT_FOUND",
          request.action.actionId,
        ),
      };
    const actionContext = context.actions.get(request.action.actionId);
    const catalogAction =
      dependencies.configuration.catalogDefinition.actions.find(
        (candidate) => candidate.actionType === request.action.actionType,
      );
    if (
      !actionContext ||
      actionContext.actionType !== request.action.actionType ||
      !catalogAction
    )
      return {
        protocolVersion: request.protocolVersion,
        requestId: request.requestId,
        threadId: request.threadId,
        runId: request.runId,
        actionId: request.action.actionId,
        status: "failed",
        error: error(
          "ACTION_INVALID",
          "Action is not declared by the rendered surface and Catalog.",
          request,
        ),
        diagnostics: diagnostics.forValidationFailure(
          "ACTION_INVALID",
          request.action.actionId,
        ),
      };
    const payload = request.action.payload ?? {};
    const payloadValidation = validateActionPayload(
      dependencies.configuration.catalogDefinition,
      request.action.actionType,
      payload,
      defaultCatalogSchemaLimits,
    );
    if (!payloadValidation.success)
      return {
        protocolVersion: request.protocolVersion,
        requestId: request.requestId,
        threadId: request.threadId,
        runId: request.runId,
        actionId: request.action.actionId,
        status: "failed",
        error: error(
          "ACTION_INVALID",
          "Action payload does not match the Catalog schema.",
          request,
        ),
        diagnostics: diagnostics.forValidationFailure(
          "ACTION_INVALID",
          request.action.actionId,
        ),
      };
    if (
      (actionContext.destructive ||
        actionContext.requiresApproval ||
        catalogAction.destructive ||
        catalogAction.requiresApproval) &&
      request.action.approved !== true
    )
      return {
        protocolVersion: request.protocolVersion,
        requestId: request.requestId,
        threadId: request.threadId,
        runId: request.runId,
        actionId: request.action.actionId,
        status: "failed",
        error: error(
          "ACTION_FORBIDDEN",
          "Action requires explicit approval.",
          request,
        ),
        diagnostics: diagnostics.forValidationFailure(
          "ACTION_FORBIDDEN",
          request.action.actionId,
        ),
      };

    let release: (() => void) | undefined;
    try {
      if (!capacityAlreadyHeld) release = acquire();
    } catch {
      return {
        protocolVersion: request.protocolVersion,
        requestId: request.requestId,
        threadId: request.threadId,
        runId: request.runId,
        actionId: request.action.actionId,
        status: "failed",
        error: error(
          "BUSINESS_AGENT_UNAVAILABLE",
          "Runtime capacity is exhausted.",
          request,
        ),
        diagnostics: diagnostics.forBusinessAgent({
          status: "failed",
          durationMs: 0,
          errorCode: "BUSINESS_AGENT_UNAVAILABLE",
        }),
      };
    }

    if (!dependencies.surfaceContextStore.consume(actionLookup)) {
      release?.();
      return {
        protocolVersion: request.protocolVersion,
        requestId: request.requestId,
        threadId: request.threadId,
        runId: request.runId,
        actionId: request.action.actionId,
        status: "failed",
        error: error(
          "ACTION_CONFLICT",
          "Action was already consumed.",
          request,
        ),
        diagnostics: diagnostics.forValidationFailure(
          "ACTION_CONFLICT",
          request.action.actionId,
        ),
      };
    }

    const budget = withBudget(
      externalSignal,
      dependencies.configuration.totalTimeoutMs,
    );
    try {
      const businessAgentStartedAt = performance.now();
      const agent = await dependencies.businessAgentAdapter.resumeAction(
        {
          protocolVersion: request.protocolVersion,
          requestId: request.requestId,
          threadId: request.threadId,
          runId: request.runId,
          agentId:
            context.request.agentId ?? dependencies.configuration.agentId,
          action: { ...request.action, payload: payloadValidation.value },
        },
        { signal: budget.signal },
      );
      if (agent.status === "failed")
        return {
          protocolVersion: request.protocolVersion,
          requestId: request.requestId,
          threadId: request.threadId,
          runId: request.runId,
          actionId: request.action.actionId,
          status: "failed",
          error: agent.error,
          diagnostics: diagnostics.forBusinessAgent({
            status: "failed",
            durationMs: durationSince(businessAgentStartedAt),
            errorCode: agent.error.code,
          }),
        };
      const presentationRequestId = randomUUID();
      diagnostics.setPresentationRequestId(presentationRequestId);
      try {
        const presentation = await dependencies.presentationPipeline.present(
          {
            requestId: presentationRequestId,
            threadId: request.threadId,
            runId: request.runId,
            content: agent.content,
            ...(context.request.presentation?.context === undefined
              ? {}
              : { context: context.request.presentation.context }),
            catalog:
              context.request.presentation?.catalog ??
              dependencies.configuration.catalog,
          },
          {
            signal: budget.signal,
            observability: diagnostics.pipelineObservation,
          },
        );
        if (presentation.status === "failed")
          throw new Error("PRESENTATION_PIPELINE_ERROR");
        if (presentation.mode === "generative-ui")
          dependencies.surfaceContextStore.remember(
            context.request,
            presentationRequestId,
            presentation,
          );
        return {
          protocolVersion: request.protocolVersion,
          requestId: request.requestId,
          threadId: request.threadId,
          runId: request.runId,
          actionId: request.action.actionId,
          sourcePresentationRequestId: context.presentationRequestId,
          presentationRequestId,
          status: presentation.status,
          presentation,
          diagnostics: diagnostics.forPresentation(presentation),
        };
      } catch {
        const presentation = {
          requestId: presentationRequestId,
          status: "degraded" as const,
          mode: "markdown" as const,
          markdown: fallbackMarkdown(agent.content),
          errors: [
            {
              code: "RUNTIME_PIPELINE_FALLBACK",
              message:
                "Presentation pipeline failed; safe Markdown was returned.",
              stage: "presentation-routing" as const,
              retryable: false,
            },
          ],
        };
        return {
          protocolVersion: request.protocolVersion,
          requestId: request.requestId,
          threadId: request.threadId,
          runId: request.runId,
          actionId: request.action.actionId,
          sourcePresentationRequestId: context.presentationRequestId,
          presentationRequestId,
          status: "degraded",
          presentation,
          diagnostics: diagnostics.forPresentation(presentation),
        };
      }
    } catch {
      const code = budget.signal.aborted
        ? externalSignal?.aborted
          ? "REQUEST_CANCELLED"
          : "REQUEST_TIMEOUT"
        : "BUSINESS_AGENT_ERROR";
      return {
        protocolVersion: request.protocolVersion,
        requestId: request.requestId,
        threadId: request.threadId,
        runId: request.runId,
        actionId: request.action.actionId,
        status: "failed",
        error: error(
          code,
          code === "REQUEST_TIMEOUT"
            ? "Runtime request timed out."
            : code === "REQUEST_CANCELLED"
              ? "Runtime request was cancelled."
              : "Business Agent action resumption failed.",
          request,
        ),
        diagnostics: diagnostics.forBusinessAgent({
          status: "failed",
          durationMs: 0,
          errorCode: code,
        }),
      };
    } finally {
      budget.dispose();
      release?.();
    }
  };

  return Object.freeze({
    run,
    action,
    capacity: {
      maxConcurrentRuns: dependencies.configuration.maxConcurrentRuns,
      activeRuns: () => active,
    },
  });
}
