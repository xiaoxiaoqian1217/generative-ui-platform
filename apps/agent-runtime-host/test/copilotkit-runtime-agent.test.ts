import { type BaseEvent, EventType, type RunAgentInput } from "@ag-ui/core";
import type { RuntimeRunRequest } from "@generative-ui/runtime-contract";
import { describe, expect, it } from "vitest";
import { CopilotKitRuntimeAgent } from "../src/copilotkit-runtime-agent.js";
import type { RunOrchestrator } from "../src/orchestrator.js";

function collectEvents(agent: CopilotKitRuntimeAgent, input: RunAgentInput) {
  return new Promise<BaseEvent[]>((resolve, reject) => {
    const events: BaseEvent[] = [];
    agent.run(input).subscribe({
      next: (event) => events.push(event),
      error: reject,
      complete: () => resolve(events),
    });
  });
}

function input(message = "Show status"): RunAgentInput {
  return {
    threadId: "thread-1",
    runId: "run-1",
    state: {},
    messages: [{ id: "message-1", role: "user", content: message }],
    tools: [],
    context: [],
  };
}

describe("CopilotKitRuntimeAgent", () => {
  it("maps a Headless AG-UI run through the Runtime orchestrator", async () => {
    let received: unknown;
    const orchestrator: RunOrchestrator = {
      run: async (request) => {
        received = request;
        return {
          protocolVersion: "1.0",
          requestId: "request-1",
          threadId: "thread-1",
          runId: "run-1",
          presentationRequestId: "presentation-1",
          status: "completed",
          presentation: {
            requestId: "presentation-1",
            status: "completed",
            mode: "markdown",
            markdown: "# Status\n",
          },
        };
      },
      action: async () => {
        throw new Error("not used");
      },
      capacity: { maxConcurrentRuns: 1, activeRuns: () => 0 },
    };
    const agent = new CopilotKitRuntimeAgent(orchestrator, "business-agent");

    const events = await collectEvents(agent, input());

    expect(received).toMatchObject<Partial<RuntimeRunRequest>>({
      protocolVersion: "1.0",
      threadId: "thread-1",
      runId: "run-1",
      agentId: "business-agent",
      message: { role: "user", content: "Show status" },
    });
    expect(events).toEqual([
      { type: EventType.RUN_STARTED, threadId: "thread-1", runId: "run-1" },
      {
        type: EventType.CUSTOM,
        name: "generative-ui.presentation-result",
        value: {
          mappingVersion: "1.0",
          result: {
            requestId: "presentation-1",
            status: "completed",
            mode: "markdown",
            markdown: "# Status\n",
          },
        },
      },
      {
        type: EventType.CUSTOM,
        name: "generative-ui.runtime-run-result",
        value: {
          mappingVersion: "1.0",
          result: {
            protocolVersion: "1.0",
            requestId: "request-1",
            threadId: "thread-1",
            runId: "run-1",
            presentationRequestId: "presentation-1",
            status: "completed",
            presentation: {
              requestId: "presentation-1",
              status: "completed",
              mode: "markdown",
              markdown: "# Status\n",
            },
          },
        },
      },
      { type: EventType.RUN_FINISHED, threadId: "thread-1", runId: "run-1" },
    ]);
  });

  it("returns an AG-UI run error when there is no user text message", async () => {
    const orchestrator: RunOrchestrator = {
      run: async () => {
        throw new Error("not used");
      },
      action: async () => {
        throw new Error("not used");
      },
      capacity: { maxConcurrentRuns: 1, activeRuns: () => 0 },
    };
    const agent = new CopilotKitRuntimeAgent(orchestrator, "business-agent");

    const events = await collectEvents(agent, input(""));

    expect(events).toEqual([
      { type: EventType.RUN_STARTED, threadId: "thread-1", runId: "run-1" },
      {
        type: EventType.RUN_ERROR,
        message: "CopilotKit run does not contain a user text message.",
        code: "REQUEST_INVALID",
      },
    ]);
  });
});
