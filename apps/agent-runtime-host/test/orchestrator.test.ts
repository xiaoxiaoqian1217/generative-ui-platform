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
    configuration: { totalTimeoutMs: 1_000, maxConcurrentRuns: 1, catalog: { catalogId: "fixture", catalogVersion: "1.0.0" }, catalogDefinition: FIXTURE_COMPONENT_CATALOG, agentId: "business-agent" },
  });
}

describe("RunOrchestrator", () => {
  it("maps Business Agent content through the embedded pipeline", async () => {
    const result = await createOrchestrator().run({ protocolVersion: "1.0", requestId: "request-1", threadId: "thread-1", runId: "run-1", message: { role: "user", content: "status" } });
    expect(result).toMatchObject({ status: "completed", requestId: "request-1", threadId: "thread-1", runId: "run-1", presentation: { mode: "markdown", markdown: "# Safe result\n" } });
    expect(result.presentationRequestId).toEqual(expect.any(String));
  });

  it("returns a correlated, payload-free diagnostic projection for the embedded pipeline", async () => {
    const secret = "Authorization: Bearer diagnostic-secret";
    const businessContent = `Customer incident detail: ${secret}`;
    const orchestrator = createRunOrchestrator({
      businessAgentAdapter: new MockBusinessAgentAdapter({
        run: async (request) => ({ protocolVersion: request.protocolVersion, requestId: request.requestId, threadId: request.threadId, runId: request.runId, status: "completed", content: { contentType: "markdown", markdown: businessContent } }),
        resumeAction: async () => { throw new Error("not used"); },
      }),
      presentationPipeline: createPresentationPipeline({ catalogRepository: { load: () => FIXTURE_COMPONENT_CATALOG }, modelAdapter: createFixtureModelAdapter(), createSurfaceId: () => "surface-test" }),
      surfaceContextStore: createSurfaceContextStore(),
      configuration: { totalTimeoutMs: 1_000, maxConcurrentRuns: 1, catalog: { catalogId: "fixture", catalogVersion: "1.0.0" }, catalogDefinition: FIXTURE_COMPONENT_CATALOG, agentId: "business-agent" },
    });

    const result = await orchestrator.run({ protocolVersion: "1.0", requestId: "request-diagnostics", threadId: "thread-diagnostics", runId: "run-diagnostics", message: { role: "user", content: secret } });

    expect(result.status).toBe("completed");
    expect(result.diagnostics).toMatchObject({
      correlation: { agentId: "business-agent", presentationRequestId: result.presentationRequestId },
      presentationDecisionMode: "markdown",
      uiPlanValidationStatus: "not-applicable",
    });
    expect(result.diagnostics?.stages).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "business-agent", status: "completed" }),
      expect.objectContaining({ name: "input-validation", status: "completed" }),
      expect.objectContaining({ name: "presentation-routing", status: "completed" }),
      expect.objectContaining({ name: "ui-compilation", status: "not-started" }),
    ]));
    expect(JSON.stringify(result.diagnostics)).not.toContain(secret);
    expect(JSON.stringify(result.diagnostics)).not.toContain(businessContent);
  });

  it("rejects actions for an unknown Surface without resuming the Business Agent", async () => {
    const result = await createOrchestrator().action({ protocolVersion: "1.0", requestId: "request-action", threadId: "thread-1", runId: "run-1", action: { actionId: "confirm", actionType: "confirm", surfaceId: "unknown" } });
    expect(result).toMatchObject({ status: "failed", error: { code: "SURFACE_NOT_FOUND" } });
    expect(result.diagnostics).toMatchObject({
      correlation: { agentId: "business-agent", actionId: "confirm" },
      normalizedErrorCode: "SURFACE_NOT_FOUND",
      stages: expect.arrayContaining([
        expect.objectContaining({ name: "action-validation", status: "failed" }),
      ]),
    });
  });

  it("validates, atomically consumes, resumes, and re-presents an approved Catalog Action", async () => {
    let resumes = 0;
    const orchestrator = createRunOrchestrator({
      businessAgentAdapter: new MockBusinessAgentAdapter({
        run: async (request) => ({ protocolVersion: request.protocolVersion, requestId: request.requestId, threadId: request.threadId, runId: request.runId, status: "completed", content: { contentType: "structured-data", data: { kind: "patrol-plan-draft", summary: {} }, fallbackMarkdown: "Draft" } }),
        resumeAction: async (request) => { resumes += 1; return { protocolVersion: request.protocolVersion, requestId: request.requestId, threadId: request.threadId, runId: request.runId, status: "completed", content: { contentType: "structured-data", data: { kind: "patrol-task", status: "confirmed", summary: {} }, fallbackMarkdown: "Confirmed" } }; },
      }),
      presentationPipeline: createPresentationPipeline({ catalogRepository: { load: () => FIXTURE_COMPONENT_CATALOG }, modelAdapter: createFixtureModelAdapter({ mode: "generative-ui" }), createSurfaceId: (request) => `surface-${request.requestId}` }),
      surfaceContextStore: createSurfaceContextStore(),
      configuration: { totalTimeoutMs: 1_000, maxConcurrentRuns: 1, catalog: { catalogId: "fixture", catalogVersion: "1.0.0" }, catalogDefinition: FIXTURE_COMPONENT_CATALOG, agentId: "business-agent" },
    });
    const run = await orchestrator.run({ protocolVersion: "1.0", requestId: "request-draft", threadId: "thread-1", runId: "run-1", message: { role: "user", content: "patrol" } });
    expect(run).toMatchObject({ status: "completed", presentation: { mode: "generative-ui" } });
    if (run.status === "failed" || run.presentation.status !== "completed" || run.presentation.mode !== "generative-ui") throw new Error("Expected Action surface");
    const base = { protocolVersion: "1.0" as const, threadId: "thread-1", runId: "run-1", action: { actionId: "confirm-patrol-plan", actionType: "patrol.confirm", surfaceId: run.presentation.surfaceId } };
    await expect(orchestrator.action({ ...base, requestId: "request-no-approval" })).resolves.toMatchObject({ status: "failed", error: { code: "ACTION_FORBIDDEN" } });
    await expect(orchestrator.action({ ...base, requestId: "request-invalid-payload", action: { ...base.action, approved: true, payload: { forged: true } } })).resolves.toMatchObject({ status: "failed", error: { code: "ACTION_INVALID" } });
    await expect(orchestrator.action({ ...base, requestId: "request-approved", action: { ...base.action, approved: true } })).resolves.toMatchObject({ status: "completed", sourcePresentationRequestId: run.presentationRequestId, presentation: { mode: "generative-ui" } });
    expect(resumes).toBe(1);
    await expect(orchestrator.action({ ...base, requestId: "request-duplicate", action: { ...base.action, approved: true } })).resolves.toMatchObject({ status: "failed", error: { code: "SURFACE_NOT_FOUND" } });
  });
});
