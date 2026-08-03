import type {
  BusinessAgentResumeActionRequest,
  BusinessAgentResumeActionResult,
  BusinessAgentRunRequest,
  BusinessAgentRunResult,
  PlatformError,
} from "@generative-ui/runtime-contract";

export interface BusinessAgentInvocationOptions {
  readonly signal?: AbortSignal;
}

export class BusinessAgentAdapterRequestError extends Error {
  override readonly name = "BusinessAgentAdapterRequestError";

  constructor(readonly error: PlatformError) {
    super(error.message);
  }
}

export interface BusinessAgentAdapter {
  run(
    request: BusinessAgentRunRequest,
    options?: BusinessAgentInvocationOptions,
  ): Promise<BusinessAgentRunResult>;

  resumeAction(
    request: BusinessAgentResumeActionRequest,
    options?: BusinessAgentInvocationOptions,
  ): Promise<BusinessAgentResumeActionResult>;
}
