import type {
  BusinessAgentEvent,
  BusinessAgentResumeActionRequest,
  BusinessAgentResumeActionResult,
  BusinessAgentRunRequest,
  BusinessAgentRunResult,
  PlatformError,
} from "@generative-ui/runtime-contract";

export interface BusinessAgentInvocationOptions {
  readonly signal?: AbortSignal;
  readonly onEvent?: (event: BusinessAgentEvent) => void;
}

export class BusinessAgentAdapterRequestError extends Error {
  override readonly name = "BusinessAgentAdapterRequestError";

  constructor(readonly error: PlatformError) {
    super(error.message);
  }
}

export interface BusinessAgentAdapter {
  /** Private lifecycle operation; never exposed to Web clients. */
  deleteThread?(
    threadId: string,
    options?: BusinessAgentInvocationOptions,
  ): Promise<void>;
  run(
    request: BusinessAgentRunRequest,
    options?: BusinessAgentInvocationOptions,
  ): Promise<BusinessAgentRunResult>;

  resumeAction(
    request: BusinessAgentResumeActionRequest,
    options?: BusinessAgentInvocationOptions,
  ): Promise<BusinessAgentResumeActionResult>;
}
