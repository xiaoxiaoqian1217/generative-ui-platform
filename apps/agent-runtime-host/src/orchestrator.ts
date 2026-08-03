import { randomUUID } from "node:crypto";
import type { BusinessAgentAdapter } from "@generative-ui/business-agent-adapter";
import { defaultCatalogSchemaLimits, type ComponentCatalog, validateActionPayload } from "@generative-ui/component-catalog-schema";
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
import type { SurfaceContextStore } from "./surface-context-store.js";

export interface RuntimeOrchestratorConfiguration {
  readonly totalTimeoutMs: number;
  readonly maxConcurrentRuns: number;
  readonly catalog: { readonly catalogId: string; readonly catalogVersion: string };
  readonly catalogDefinition: ComponentCatalog;
  readonly agentId: string;
}

export interface RunOrchestrator {
  run(input: unknown, signal?: AbortSignal): Promise<RuntimeRunResult>;
  action(input: unknown, signal?: AbortSignal): Promise<RuntimeActionResult>;
  readonly capacity: { readonly maxConcurrentRuns: number; readonly activeRuns: () => number };
}

function error(code: PlatformError["code"], message: string, request: Partial<RuntimeRunRequest> = {}): PlatformError {
  return {
    code,
    message,
    retryable: code === "BUSINESS_AGENT_UNAVAILABLE",
    ...(request.requestId === undefined ? {} : { requestId: request.requestId }),
    ...(request.threadId === undefined ? {} : { threadId: request.threadId }),
    ...(request.runId === undefined ? {} : { runId: request.runId }),
  };
}

function stringField(input: unknown, field: string, fallback: string): string {
  if (typeof input !== "object" || input === null) return fallback;
  const value = (input as Record<string, unknown>)[field];
  return typeof value === "string" ? value : fallback;
}

function fallbackMarkdown(content: { contentType: string; markdown?: string; fallbackMarkdown?: string }): string {
  if (content.contentType === "markdown") return content.markdown ?? "内容暂时不可展示。";
  return content.fallbackMarkdown ?? "结构化业务结果已生成，但暂时无法以界面展示。";
}

function withBudget(signal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("Runtime request timed out.")), timeoutMs);
  const abort = () => controller.abort(signal?.reason ?? new Error("Runtime request cancelled."));
  signal?.addEventListener("abort", abort, { once: true });
  return { signal: controller.signal, dispose: () => { clearTimeout(timer); signal?.removeEventListener("abort", abort); } };
}

export function createRunOrchestrator(dependencies: {
  businessAgentAdapter: BusinessAgentAdapter;
  presentationPipeline: PresentationPipeline;
  surfaceContextStore: SurfaceContextStore;
  configuration: RuntimeOrchestratorConfiguration;
}): RunOrchestrator {
  let active = 0;
  const acquire = async () => {
    if (active >= dependencies.configuration.maxConcurrentRuns) throw new Error("RUNTIME_CAPACITY_EXHAUSTED");
    active += 1;
    return () => { active -= 1; };
  };
  const run = async (input: unknown, externalSignal?: AbortSignal): Promise<RuntimeRunResult> => {
    const validated = validateRuntimeRunRequest(input);
    if (!validated.success) return { protocolVersion: "1.0", requestId: stringField(input, "requestId", "invalid-request"), threadId: "invalid-thread", runId: "invalid-run", status: "failed", error: error("REQUEST_INVALID", "Runtime run request is invalid.") };
    const request = validated.value;
    const threadId = request.threadId ?? request.requestId;
    const runId = request.runId ?? randomUUID();
    let release: (() => void) | undefined;
    const budget = withBudget(externalSignal, dependencies.configuration.totalTimeoutMs);
    try {
      release = await acquire();
      const agent = await dependencies.businessAgentAdapter.run({ protocolVersion: request.protocolVersion, requestId: request.requestId, threadId, runId, agentId: request.agentId ?? dependencies.configuration.agentId, input: { message: request.message.content } }, { signal: budget.signal });
      if (agent.status === "failed") return { protocolVersion: request.protocolVersion, requestId: request.requestId, threadId, runId, status: "failed", error: agent.error };
      const presentationRequestId = randomUUID();
      try {
        const presentation = await dependencies.presentationPipeline.present({ requestId: presentationRequestId, threadId, runId, content: agent.content, context: { userMessage: request.message.content, ...request.presentation?.context }, catalog: request.presentation?.catalog ?? dependencies.configuration.catalog }, { signal: budget.signal });
        if (presentation.status === "failed") return { protocolVersion: request.protocolVersion, requestId: request.requestId, threadId, runId, presentationRequestId, status: "failed", error: error("PRESENTATION_PIPELINE_ERROR", "Presentation pipeline failed.", request), presentation };
        if (presentation.mode === "generative-ui") dependencies.surfaceContextStore.remember({ ...request, threadId, runId }, presentationRequestId, presentation);
        return { protocolVersion: request.protocolVersion, requestId: request.requestId, threadId, runId, presentationRequestId, status: presentation.status, presentation };
      } catch {
        return { protocolVersion: request.protocolVersion, requestId: request.requestId, threadId, runId, presentationRequestId, status: "degraded", presentation: { requestId: presentationRequestId, status: "degraded", mode: "markdown", markdown: fallbackMarkdown(agent.content), errors: [{ code: "RUNTIME_PIPELINE_FALLBACK", message: "Presentation pipeline failed; safe Markdown was returned.", stage: "presentation-routing", retryable: false }] } };
      }
    } catch (cause) {
      const code = budget.signal.aborted ? (externalSignal?.aborted ? "REQUEST_CANCELLED" : "REQUEST_TIMEOUT") : cause instanceof Error && cause.message === "RUNTIME_CAPACITY_EXHAUSTED" ? "BUSINESS_AGENT_UNAVAILABLE" : "BUSINESS_AGENT_ERROR";
      return { protocolVersion: request.protocolVersion, requestId: request.requestId, threadId, runId, status: "failed", error: error(code, code === "REQUEST_TIMEOUT" ? "Runtime request timed out." : code === "REQUEST_CANCELLED" ? "Runtime request was cancelled." : "Business Agent invocation failed.", { ...request, threadId, runId }) };
    } finally { budget.dispose(); release?.(); }
  };
  const action = async (input: unknown, externalSignal?: AbortSignal): Promise<RuntimeActionResult> => {
    const validated = validateRuntimeActionRequest(input);
    const requestId = stringField(input, "requestId", "invalid-request");
    if (!validated.success) return { protocolVersion: "1.0", requestId, threadId: "invalid-thread", runId: "invalid-run", status: "failed", error: error("REQUEST_INVALID", "Runtime action request is invalid.") };
    const request: RuntimeActionRequest = validated.value;
    const actionLookup = { ...request.action, threadId: request.threadId, runId: request.runId };
    const context = dependencies.surfaceContextStore.get(actionLookup);
    if (!context) return { protocolVersion: request.protocolVersion, requestId: request.requestId, threadId: request.threadId, runId: request.runId, actionId: request.action.actionId, status: "failed", error: error("SURFACE_NOT_FOUND", "Action surface is unknown, expired, or already consumed.", request) };
    const actionContext = context.actions.get(request.action.actionId);
    const catalogAction = dependencies.configuration.catalogDefinition.actions.find((candidate) => candidate.actionType === request.action.actionType);
    if (!actionContext || actionContext.actionType !== request.action.actionType || !catalogAction) return { protocolVersion: request.protocolVersion, requestId: request.requestId, threadId: request.threadId, runId: request.runId, actionId: request.action.actionId, status: "failed", error: error("ACTION_INVALID", "Action is not declared by the rendered surface and Catalog.", request) };
    const payload = request.action.payload ?? {};
    const payloadValidation = validateActionPayload(dependencies.configuration.catalogDefinition, request.action.actionType, payload, defaultCatalogSchemaLimits);
    if (!payloadValidation.success) return { protocolVersion: request.protocolVersion, requestId: request.requestId, threadId: request.threadId, runId: request.runId, actionId: request.action.actionId, status: "failed", error: error("ACTION_INVALID", "Action payload does not match the Catalog schema.", request) };
    if ((actionContext.destructive || actionContext.requiresApproval || catalogAction.destructive || catalogAction.requiresApproval) && request.action.approved !== true) return { protocolVersion: request.protocolVersion, requestId: request.requestId, threadId: request.threadId, runId: request.runId, actionId: request.action.actionId, status: "failed", error: error("ACTION_FORBIDDEN", "Action requires explicit approval.", request) };
    if (!dependencies.surfaceContextStore.consume(actionLookup)) return { protocolVersion: request.protocolVersion, requestId: request.requestId, threadId: request.threadId, runId: request.runId, actionId: request.action.actionId, status: "failed", error: error("ACTION_CONFLICT", "Action was already consumed.", request) };
    const budget = withBudget(externalSignal, dependencies.configuration.totalTimeoutMs);
    try {
      const agent = await dependencies.businessAgentAdapter.resumeAction({ protocolVersion: request.protocolVersion, requestId: request.requestId, threadId: request.threadId, runId: request.runId, agentId: context.request.agentId ?? dependencies.configuration.agentId, action: { ...request.action, payload: payloadValidation.value } }, { signal: budget.signal });
      if (agent.status === "failed") return { protocolVersion: request.protocolVersion, requestId: request.requestId, threadId: request.threadId, runId: request.runId, actionId: request.action.actionId, status: "failed", error: agent.error };
      const presentationRequestId = randomUUID();
      try {
        const presentation = await dependencies.presentationPipeline.present({ requestId: presentationRequestId, threadId: request.threadId, runId: request.runId, content: agent.content, ...(context.request.presentation?.context === undefined ? {} : { context: context.request.presentation.context }), catalog: context.request.presentation?.catalog ?? dependencies.configuration.catalog }, { signal: budget.signal });
        if (presentation.status === "failed") throw new Error("PRESENTATION_PIPELINE_ERROR");
        if (presentation.mode === "generative-ui") dependencies.surfaceContextStore.remember(context.request, presentationRequestId, presentation);
        return { protocolVersion: request.protocolVersion, requestId: request.requestId, threadId: request.threadId, runId: request.runId, actionId: request.action.actionId, sourcePresentationRequestId: context.presentationRequestId, presentationRequestId, status: presentation.status, presentation };
      } catch { return { protocolVersion: request.protocolVersion, requestId: request.requestId, threadId: request.threadId, runId: request.runId, actionId: request.action.actionId, sourcePresentationRequestId: context.presentationRequestId, presentationRequestId, status: "degraded", presentation: { requestId: presentationRequestId, status: "degraded", mode: "markdown", markdown: fallbackMarkdown(agent.content), errors: [{ code: "RUNTIME_PIPELINE_FALLBACK", message: "Presentation pipeline failed; safe Markdown was returned.", stage: "presentation-routing", retryable: false }] } }; }
    } catch { return { protocolVersion: request.protocolVersion, requestId: request.requestId, threadId: request.threadId, runId: request.runId, actionId: request.action.actionId, status: "failed", error: error(budget.signal.aborted ? "REQUEST_TIMEOUT" : "BUSINESS_AGENT_ERROR", "Business Agent action resumption failed.", request) }; } finally { budget.dispose(); }
  };
  return Object.freeze({ run, action, capacity: { maxConcurrentRuns: dependencies.configuration.maxConcurrentRuns, activeRuns: () => active } });
}
