import {
  type BusinessAgentResumeActionRequest,
  type BusinessAgentRunRequest,
  validateBusinessAgentResumeActionResult,
  validateBusinessAgentRunResult,
} from "@generative-ui/runtime-contract";
import { describe, expect, it } from "vitest";
import { ReferenceBusinessAgent } from "../src/agent.js";

function runRequest(message: string, suffix: string): BusinessAgentRunRequest {
  return {
    protocolVersion: "1.0",
    requestId: `request-${suffix}`,
    threadId: `thread-${suffix}`,
    runId: `run-${suffix}`,
    input: { message },
  };
}

function resumeRequest(
  run: BusinessAgentRunRequest,
): BusinessAgentResumeActionRequest {
  return {
    protocolVersion: "1.0",
    requestId: `${run.requestId}-confirm`,
    threadId: run.threadId,
    runId: run.runId,
    action: {
      actionId: "confirm-patrol-plan",
      actionType: "patrol.confirm",
      surfaceId: "surface-contract-test",
      approved: true,
    },
  };
}

function allKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(allKeys);
  if (typeof value !== "object" || value === null) return [];
  return Object.entries(value).flatMap(([key, nested]) => [
    key,
    ...allKeys(nested),
  ]);
}

describe("Business Agent Contract", () => {
  it("returns contract-valid AgentContent for all reference scenarios", async () => {
    const agent = new ReferenceBusinessAgent();
    const device = await agent.run(runRequest("查询设备状态", "device"));
    const draftRequest = runRequest("生成巡逻计划", "patrol");
    const draft = await agent.run(draftRequest);
    const confirmed = await agent.resume(resumeRequest(draftRequest));

    expect(validateBusinessAgentRunResult(device)).toMatchObject({
      success: true,
    });
    expect(validateBusinessAgentRunResult(draft)).toMatchObject({
      success: true,
    });
    expect(validateBusinessAgentResumeActionResult(confirmed)).toMatchObject({
      success: true,
    });
    expect(device).toMatchObject({
      status: "completed",
      content: {
        contentType: "structured-data",
        data: { kind: "device-status" },
      },
    });
    expect(draft).toMatchObject({
      status: "completed",
      content: {
        contentType: "structured-data",
        data: {
          kind: "patrol-plan-draft",
          plan: { status: "awaiting-confirmation" },
        },
      },
    });
    expect(confirmed).toMatchObject({
      status: "completed",
      content: {
        contentType: "structured-data",
        data: { kind: "patrol-task", status: "confirmed" },
      },
    });
  });

  it("never returns presentation or frontend artifacts", async () => {
    const agent = new ReferenceBusinessAgent();
    const result = await agent.run(runRequest("生成巡逻计划", "boundaries"));
    const forbiddenKeys = new Set([
      "a2ui",
      "componentPreferences",
      "html",
      "planCandidate",
      "presentationDecision",
      "uiPlan",
      "vue",
    ]);
    expect(allKeys(result).filter((key) => forbiddenKeys.has(key))).toEqual([]);
  });

  it("rejects resume attempts from a different run", async () => {
    const agent = new ReferenceBusinessAgent();
    const run = runRequest("生成巡逻计划", "correlation");
    await agent.run(run);
    const result = await agent.resume({
      ...resumeRequest(run),
      runId: "run-other",
    });
    expect(result).toMatchObject({
      status: "failed",
      error: { code: "ACTION_CONFLICT" },
    });
    expect(validateBusinessAgentResumeActionResult(result)).toMatchObject({
      success: true,
    });
  });

  it("lets the Business Agent interpret an explicit text confirmation", async () => {
    const agent = new ReferenceBusinessAgent();
    const draftRequest = runRequest(
      "\u751f\u6210\u5de1\u903b\u8ba1\u5212",
      "text-confirmation",
    );
    await agent.run(draftRequest);

    const result = await agent.run({
      ...draftRequest,
      requestId: "request-text-confirmation-confirm",
      runId: "run-text-confirmation-confirm",
      input: { message: "\u786e\u8ba4\u6267\u884c" },
    });

    expect(result).toMatchObject({
      status: "completed",
      content: {
        contentType: "structured-data",
        data: {
          kind: "confirmation-intent",
          pausedRunId: draftRequest.runId,
          actionId: "confirm-patrol-plan",
          actionType: "patrol.confirm",
        },
      },
    });
    expect(validateBusinessAgentRunResult(result)).toMatchObject({
      success: true,
    });
  });

  it("keeps a paused run pending when text is not an explicit confirmation", async () => {
    const agent = new ReferenceBusinessAgent();
    const draftRequest = runRequest(
      "\u751f\u6210\u5de1\u903b\u8ba1\u5212",
      "text-rejection",
    );
    await agent.run(draftRequest);

    const result = await agent.run({
      ...draftRequest,
      requestId: "request-text-rejection",
      runId: "run-text-rejection",
      input: { message: "please explain the plan" },
    });

    expect(result).toMatchObject({
      status: "failed",
      error: { code: "ACTION_CONFLICT" },
    });
  });

  it("serializes concurrent access to the same paused thread", async () => {
    const agent = new ReferenceBusinessAgent();
    const run = runRequest("生成巡逻计划", "concurrent");
    await agent.run(run);
    const action = resumeRequest(run);
    const results = await Promise.all([
      agent.resume(action),
      agent.resume(action),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([
      "completed",
      "failed",
    ]);
    expect(results.find((result) => result.status === "failed")).toMatchObject({
      error: { code: "RUN_NOT_FOUND" },
    });
  });
});
