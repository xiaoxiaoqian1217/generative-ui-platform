import { MockBusinessAgentAdapter } from "@generative-ui/business-agent-adapter";
import {
  createFixtureModelAdapter,
  createPresentationPipeline,
  FIXTURE_COMPONENT_CATALOG,
} from "@generative-ui/presentation-pipeline";
import { describe, expect, it } from "vitest";
import { createRunOrchestrator } from "../src/orchestrator.js";
import { createSurfaceContextStore } from "../src/surface-context-store.js";

function deferred() {
  let resolve: (() => void) | undefined;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return {
    promise,
    resolve: () => {
      resolve?.();
    },
  };
}

describe("RunOrchestrator capacity", () => {
  it("counts Action resumption against the shared capacity without consuming a rejected Action", async () => {
    const blocker = deferred();
    const blockingRunEntered = deferred();
    let resumes = 0;
    const orchestrator = createRunOrchestrator({
      businessAgentAdapter: new MockBusinessAgentAdapter({
        run: async (request) => {
          if (request.requestId === "request-blocking") {
            blockingRunEntered.resolve();
            await blocker.promise;
          }
          return {
            protocolVersion: request.protocolVersion,
            requestId: request.requestId,
            threadId: request.threadId,
            runId: request.runId,
            status: "completed",
            content: {
              contentType: "structured-data",
              data: { kind: "patrol-plan-draft", summary: {} },
              fallbackMarkdown: "Draft",
            },
          };
        },
        resumeAction: async (request) => {
          resumes += 1;
          return {
            protocolVersion: request.protocolVersion,
            requestId: request.requestId,
            threadId: request.threadId,
            runId: request.runId,
            status: "completed",
            content: {
              contentType: "structured-data",
              data: { kind: "patrol-task", status: "confirmed", summary: {} },
              fallbackMarkdown: "Confirmed",
            },
          };
        },
      }),
      presentationPipeline: createPresentationPipeline({
        catalogRepository: { load: () => FIXTURE_COMPONENT_CATALOG },
        modelAdapter: createFixtureModelAdapter({ mode: "generative-ui" }),
        createSurfaceId: (request) => `surface-${request.requestId}`,
      }),
      surfaceContextStore: createSurfaceContextStore(),
      configuration: {
        totalTimeoutMs: 1_000,
        maxConcurrentRuns: 1,
        catalog: { catalogId: "fixture", catalogVersion: "1.0.0" },
        catalogDefinition: FIXTURE_COMPONENT_CATALOG,
        agentId: "business-agent",
      },
    });

    const draft = await orchestrator.run({
      protocolVersion: "1.0",
      requestId: "request-draft-capacity",
      threadId: "thread-capacity",
      runId: "run-capacity",
      message: { role: "user", content: "patrol" },
    });
    if (
      draft.status === "failed" ||
      draft.presentation.status !== "completed" ||
      draft.presentation.mode !== "generative-ui"
    )
      throw new Error("Expected Action surface");

    const blocking = orchestrator.run({
      protocolVersion: "1.0",
      requestId: "request-blocking",
      threadId: "thread-blocking",
      runId: "run-blocking",
      message: { role: "user", content: "block" },
    });
    await blockingRunEntered.promise;

    const action = {
      protocolVersion: "1.0" as const,
      requestId: "request-action-capacity",
      threadId: "thread-capacity",
      runId: "run-capacity",
      action: {
        actionId: "confirm-patrol-plan",
        actionType: "patrol.confirm",
        surfaceId: draft.presentation.surfaceId,
        approved: true,
      },
    };

    await expect(orchestrator.action(action)).resolves.toMatchObject({
      status: "failed",
      error: { code: "BUSINESS_AGENT_UNAVAILABLE", retryable: true },
    });
    expect(resumes).toBe(0);

    blocker.resolve();
    await blocking;

    await expect(
      orchestrator.action({ ...action, requestId: "request-action-retry" }),
    ).resolves.toMatchObject({ status: "completed" });
    expect(resumes).toBe(1);
  });
});
