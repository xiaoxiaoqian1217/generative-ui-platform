import { EventType, type RunAgentInput } from "@ag-ui/core";
import { afterEach, describe, expect, it } from "vitest";
import { type AgUiMockServer, createAguiMockServer } from "../src/index.js";

const activeServers: AgUiMockServer[] = [];

async function startServer(scenario: "echo" | "locate-device") {
  const server = createAguiMockServer({ scenario });
  activeServers.push(server);
  return server.listen({ host: "127.0.0.1", port: 0 });
}

function runInput(messages: RunAgentInput["messages"]): RunAgentInput {
  return {
    context: [],
    forwardedProps: {},
    messages,
    runId: "run-test",
    state: {},
    threadId: "thread-test",
    tools: [
      {
        name: "locateDevice",
        description: "Locate a device in the map workspace",
        parameters: {
          type: "object",
          properties: { deviceId: { type: "string" } },
          required: ["deviceId"],
        },
      },
    ],
  };
}

async function runScenario(
  url: string,
  input: RunAgentInput,
): Promise<unknown[]> {
  const response = await fetch(`${url}/api/copilotkit/agent/default/run`, {
    body: JSON.stringify(input),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("text/event-stream");
  const body = await response.text();
  return body
    .split("\n\n")
    .map((frame) => frame.trim())
    .filter(Boolean)
    .map((frame) => JSON.parse(frame.replace(/^data: /u, "")));
}

afterEach(async () => {
  await Promise.all(activeServers.splice(0).map((server) => server.close()));
});

describe("createAguiMockServer", () => {
  it("advertises a reusable SSE agent and echoes user text with standard AG-UI events", async () => {
    const { url } = await startServer("echo");
    const info = await fetch(`${url}/api/copilotkit/info`);
    expect(info.status).toBe(200);
    expect(await info.json()).toMatchObject({
      agents: { default: { description: expect.any(String) } },
      mode: "sse",
    });

    const events = await runScenario(
      url,
      runInput([{ id: "message-user", role: "user", content: "hello" }]),
    );
    expect(events.map((event) => (event as { type: string }).type)).toEqual([
      EventType.RUN_STARTED,
      EventType.TEXT_MESSAGE_START,
      EventType.TEXT_MESSAGE_CONTENT,
      EventType.TEXT_MESSAGE_END,
      EventType.RUN_FINISHED,
    ]);
    expect(events[2]).toMatchObject({ delta: "hello" });
  });

  it("emits a standard locateDevice tool call and completes after receiving its result", async () => {
    const { url } = await startServer("locate-device");
    const firstEvents = await runScenario(
      url,
      runInput([
        { id: "message-user", role: "user", content: "定位无人机 01" },
      ]),
    );
    expect(
      firstEvents.map((event) => (event as { type: string }).type),
    ).toEqual([
      EventType.RUN_STARTED,
      EventType.TOOL_CALL_START,
      EventType.TOOL_CALL_ARGS,
      EventType.TOOL_CALL_END,
      EventType.RUN_FINISHED,
    ]);
    expect(firstEvents[1]).toMatchObject({
      toolCallId: "locate-device-01",
      toolCallName: "locateDevice",
    });
    expect(firstEvents[2]).toMatchObject({
      delta: JSON.stringify({ deviceId: "01" }),
      toolCallId: "locate-device-01",
    });

    const secondEvents = await runScenario(
      url,
      runInput([
        { id: "message-user", role: "user", content: "定位无人机 01" },
        {
          id: "message-assistant",
          role: "assistant",
          toolCalls: [
            {
              id: "locate-device-01",
              type: "function",
              function: {
                arguments: JSON.stringify({ deviceId: "01" }),
                name: "locateDevice",
              },
            },
          ],
        },
        {
          id: "message-tool",
          role: "tool",
          toolCallId: "locate-device-01",
          content: "Drone 01 located",
        },
      ]),
    );
    expect(
      secondEvents.map((event) => (event as { type: string }).type),
    ).toEqual([
      EventType.RUN_STARTED,
      EventType.TEXT_MESSAGE_START,
      EventType.TEXT_MESSAGE_CONTENT,
      EventType.TEXT_MESSAGE_END,
      EventType.RUN_FINISHED,
    ]);
    expect(secondEvents[2]).toMatchObject({ delta: "已定位无人机 01" });
  });
});
