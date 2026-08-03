import type {
  BusinessAgentResumeActionRequest,
  BusinessAgentResumeActionResult,
  BusinessAgentRunRequest,
  BusinessAgentRunResult,
} from "@generative-ui/runtime-contract";

export interface BusinessAgentInvocationOptions {
  readonly signal?: AbortSignal;
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
