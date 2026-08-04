import type {
  BusinessAgentResumeActionRequest,
  BusinessAgentResumeActionResult,
  BusinessAgentRunRequest,
  BusinessAgentRunResult,
  PlatformError,
} from "@generative-ui/runtime-contract";
import { Command, isInterrupted } from "@langchain/langgraph";
import {
  CONFIRM_PATROL_ACTION_ID,
  CONFIRM_PATROL_ACTION_TYPE,
  textConfirmationIntentContent,
} from "./business-tools.js";
import {
  createReferenceBusinessGraph,
  initialGraphState,
  interruptedDraftContent,
} from "./graph.js";

type CorrelatedRequest = Pick<
  BusinessAgentRunRequest,
  "protocolVersion" | "requestId" | "runId" | "threadId"
>;

type CompletedBusinessAgentResult = Extract<
  BusinessAgentRunResult,
  { status: "completed" }
>;

type FailedBusinessAgentResult = Extract<
  BusinessAgentRunResult,
  { status: "failed" }
>;

const confirmationMessages = new Set([
  "confirm",
  "confirmed",
  "approve",
  "approved",
  "yes",
  "y",
  "ok",
  "\u786e\u8ba4",
  "\u786e\u8ba4\u6267\u884c",
  "\u540c\u610f",
  "\u6279\u51c6",
  "\u597d",
]);

function isExplicitConfirmation(message: string): boolean {
  return confirmationMessages.has(
    message
      .trim()
      .toLocaleLowerCase()
      .replace(/[.!\uff01\u3002]/g, ""),
  );
}

function failedResult<T extends CorrelatedRequest>(
  request: T,
  error: PlatformError,
): FailedBusinessAgentResult {
  return {
    protocolVersion: request.protocolVersion,
    requestId: request.requestId,
    threadId: request.threadId,
    runId: request.runId,
    status: "failed",
    error,
  };
}

function completedResult(
  request: CorrelatedRequest,
  content: CompletedBusinessAgentResult["content"],
): CompletedBusinessAgentResult {
  return {
    protocolVersion: request.protocolVersion,
    requestId: request.requestId,
    threadId: request.threadId,
    runId: request.runId,
    status: "completed",
    content,
  };
}

export interface BusinessAgentApplication {
  run(request: BusinessAgentRunRequest): Promise<BusinessAgentRunResult>;
  resume(
    request: BusinessAgentResumeActionRequest,
  ): Promise<BusinessAgentResumeActionResult>;
}

export class ReferenceBusinessAgent implements BusinessAgentApplication {
  readonly #graph = createReferenceBusinessGraph();
  readonly #threadOperations = new Map<string, Promise<void>>();

  async #serialized<T>(
    threadId: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const previous = this.#threadOperations.get(threadId) ?? Promise.resolve();
    const queued = previous.catch(() => undefined).then(operation);
    const settled = queued.then(
      () => undefined,
      () => undefined,
    );
    this.#threadOperations.set(threadId, settled);
    try {
      return await queued;
    } finally {
      if (this.#threadOperations.get(threadId) === settled) {
        this.#threadOperations.delete(threadId);
      }
    }
  }

  async run(request: BusinessAgentRunRequest): Promise<BusinessAgentRunResult> {
    return this.#serialized(request.threadId, async () => {
      const config = { configurable: { thread_id: request.threadId } };
      try {
        const checkpoint = await this.#graph.getState(config);
        if (checkpoint.next.length > 0) {
          if (isExplicitConfirmation(request.input.message)) {
            return completedResult(
              request,
              textConfirmationIntentContent(checkpoint.values.request.runId),
            );
          }
          return failedResult(request, {
            code: "ACTION_CONFLICT",
            message:
              "The business thread is waiting for an explicit confirmation message.",
            retryable: false,
            requestId: request.requestId,
            threadId: request.threadId,
            runId: request.runId,
          });
        }

        const state = await this.#graph.invoke(
          initialGraphState(request),
          config,
        );
        if (isInterrupted(state)) {
          return completedResult(request, interruptedDraftContent(state));
        }
        if (state.content === undefined)
          throw new Error("AGENT_CONTENT_MISSING");
        return completedResult(request, state.content);
      } catch {
        return failedResult(request, {
          code: "BUSINESS_AGENT_ERROR",
          message: "The business agent could not complete the run.",
          retryable: false,
          requestId: request.requestId,
          threadId: request.threadId,
          runId: request.runId,
        });
      }
    });
  }

  async resume(
    request: BusinessAgentResumeActionRequest,
  ): Promise<BusinessAgentResumeActionResult> {
    return this.#serialized(request.threadId, async () => {
      const config = { configurable: { thread_id: request.threadId } };
      try {
        const checkpoint = await this.#graph.getState(config);
        if (checkpoint.next.length === 0) {
          return failedResult(request, {
            code: "RUN_NOT_FOUND",
            message: "No paused business run exists for this thread.",
            retryable: false,
            requestId: request.requestId,
            threadId: request.threadId,
            runId: request.runId,
            actionId: request.action.actionId,
          });
        }

        const originalRequest = checkpoint.values.request;
        if (originalRequest.runId !== request.runId) {
          return failedResult(request, {
            code: "ACTION_CONFLICT",
            message: "The action does not belong to the paused run.",
            retryable: false,
            requestId: request.requestId,
            threadId: request.threadId,
            runId: request.runId,
            actionId: request.action.actionId,
          });
        }

        if (
          request.action.actionId !== CONFIRM_PATROL_ACTION_ID ||
          request.action.actionType !== CONFIRM_PATROL_ACTION_TYPE ||
          request.action.approved !== true
        ) {
          return failedResult(request, {
            code: "ACTION_INVALID",
            message:
              "The paused patrol plan requires an explicit confirmation.",
            retryable: false,
            requestId: request.requestId,
            threadId: request.threadId,
            runId: request.runId,
            actionId: request.action.actionId,
          });
        }

        const state = await this.#graph.invoke(
          new Command({ resume: true }),
          config,
        );
        if (isInterrupted(state) || state.content === undefined) {
          throw new Error("AGENT_RESUME_INCOMPLETE");
        }
        return completedResult(request, state.content);
      } catch {
        return failedResult(request, {
          code: "BUSINESS_AGENT_ERROR",
          message: "The business agent could not resume the run.",
          retryable: false,
          requestId: request.requestId,
          threadId: request.threadId,
          runId: request.runId,
          actionId: request.action.actionId,
        });
      }
    });
  }
}
