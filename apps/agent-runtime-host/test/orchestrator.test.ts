import { MockBusinessAgentAdapter } from "@generative-ui/business-agent-adapter";
import { createFixtureModelAdapter, createPresentationPipeline, FIXTURE_COMPONENT_CATALOG } from "@generative-ui/presentation-pipeline";
import { describe, expect, it } from "vitest";
import { createRunOrchestrator } from "../src/orchestrator.js";
import { createSurfaceContextStore } from "../src/surface-context-store.js";

function createOrchestrator() {
  return createRunOrchestrator({
    businessAgentAdapter: new MockBusinessAgentAdapter({
      run: async (request) => ({ protocolVersion: request.protocolVersion, requestId: request.requestId, threadId: request.threadId, runId: request.runId, status: "completed", content: { contentType: "markdown", markdown: "# Safe result" } }),
      resumeAction: async () => { throw new Error("not used"); },
    }),
    presentationPipeline: createPresentationPipeline({ catalogRepository: { load: () => FIXTURE_COMPONENT_CATALOG }, modelAdapter: createFixtureModelAdapter(), createSurfaceId: () => "surface-test" }),
    surfaceContextStore: createSurfaceContextStore(),
    configuration: { totalTimeoutMs: 1_000, maxConcurrentRuns: 1, catalog: { catalogId: "fixture", catalogVersion: "1.0.0" }, agentId: "business-agent" },
  });
}

describe("RunOrchestrator", () => {
  it("maps Business Agent content through the embedded pipeline", async () => {
    const result = await createOrchestrator().run({ protocolVersion: "1.0", requestId: "request-1", threadId: "thread-1", runId: "run-1", message: { role: "user", content: "status" } });
    expect(result).toMatchObject({ status: "completed", requestId: "request-1", threadId: "thread-1", runId: "run-1", presentation: { mode: "markdown", markdown: "# Safe result\n" } });
    expect(result.presentationRequestId).toEqual(expect.any(String));
  });

  it("rejects actions until TASK-008, without resuming the Business Agent", async () => {
    const result = await createOrchestrator().action({ protocolVersion: "1.0", requestId: "request-action", threadId: "thread-1", runId: "run-1", action: { actionId: "confirm", actionType: "confirm", surfaceId: "unknown" } });
    expect(result).toMatchObject({ status: "failed", error: { code: "SURFACE_NOT_FOUND" } });
  });
});
