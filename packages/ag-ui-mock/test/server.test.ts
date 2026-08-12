import { afterEach, describe, expect, it } from "vitest";
import {
  createAguiMockServer,
  type ReusableAguiMockServer,
} from "../src/index.js";

interface AguiEvent {
  readonly type: string;
  readonly [key: string]: unknown;
}

const runningServers: ReusableAguiMockServer[] = [];

afterEach(async () => {
  await Promise.all(runningServers.splice(0).map((server) => server.stop()));
});

async function runScenario(
  scenario: "echo" | "locate-device",
  message: string,
): Promise<AguiEvent[]> {
  const server = createAguiMockServer({ port: 0, scenario });
  runningServers.push(server);
  const url = await server.start();
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      threadId: "thread-test",
      runId: "run-test",
      messages: [{ id: "message-test", role: "user", content: message }],
      state: {},
      tools: [],
      context: [],
      forwardedProps: {},
    }),
  });

  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("text/event-stream");

  const body = await response.text();
  return body
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => JSON.parse(line.slice("data: ".length)) as AguiEvent);
}

describe("createAguiMockServer", () => {
  it("advertises a CopilotKit-compatible AG-UI runtime for Workbench", async () => {
    const server = createAguiMockServer({ port: 0, scenario: "locate-device" });
    runningServers.push(server);
    const url = await server.start();

    const response = await fetch(`${url}/api/copilotkit/info`);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      agents: { default: { description: "Reusable AG-UI mock" } },
      mode: "sse",
    });
  });

  it("replays the echo scenario as a standard AG-UI text event stream", async () => {
    const events = await runScenario("echo", "hello");

    expect(events.map((event) => event.type)).toEqual([
      "RUN_STARTED",
      "TEXT_MESSAGE_START",
      "TEXT_MESSAGE_CONTENT",
      "TEXT_MESSAGE_END",
      "RUN_FINISHED",
    ]);
    expect(
      events.find((event) => event.type === "TEXT_MESSAGE_CONTENT"),
    ).toMatchObject({
      delta: "AG-UI mock is connected.",
    });
  });

  it("replays locate-device with the official AG-UI tool-call sequence", async () => {
    const events = await runScenario("locate-device", "定位无人机 01");

    expect(events.map((event) => event.type)).toEqual([
      "RUN_STARTED",
      "TOOL_CALL_START",
      "TOOL_CALL_ARGS",
      "TOOL_CALL_END",
      "RUN_FINISHED",
    ]);
    expect(
      events.find((event) => event.type === "TOOL_CALL_START"),
    ).toMatchObject({
      toolCallName: "locateDevice",
    });
    expect(
      events.find((event) => event.type === "TOOL_CALL_ARGS"),
    ).toMatchObject({
      delta: '{"deviceId":"01"}',
    });
  });

  it("finishes locate-device after the browser returns the frontend tool result", async () => {
    const server = createAguiMockServer({ port: 0, scenario: "locate-device" });
    runningServers.push(server);
    const url = await server.start();
    const firstResponse = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        threadId: "thread-test",
        runId: "run-first",
        messages: [{ id: "user-1", role: "user", content: "定位无人机 01" }],
      }),
    });
    const firstEvents = (await firstResponse.text())
      .split("\n")
      .filter((line) => line.startsWith("data: "))
      .map((line) => JSON.parse(line.slice("data: ".length)) as AguiEvent);
    const toolCallId = firstEvents.find(
      (event) => event.type === "TOOL_CALL_START",
    )?.toolCallId;
    expect(typeof toolCallId).toBe("string");

    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        threadId: "thread-test",
        runId: "run-follow-up",
        messages: [
          { id: "user-1", role: "user", content: "定位无人机 01" },
          {
            id: "tool-1",
            role: "tool",
            toolCallId,
            content: '{"status":"located","device":{"deviceId":"01"}}',
          },
        ],
      }),
    });
    const events = (await response.text())
      .split("\n")
      .filter((line) => line.startsWith("data: "))
      .map((line) => JSON.parse(line.slice("data: ".length)) as AguiEvent);

    expect(events.map((event) => event.type)).toContain("TEXT_MESSAGE_CONTENT");
    expect(events.find((event) => event.type === "CUSTOM")).toMatchObject({
      name: "generative-ui.presentation-result",
      value: {
        mappingVersion: "1.0",
        result: { mode: "markdown", status: "completed" },
      },
    });
    expect(events.some((event) => event.type === "TOOL_CALL_START")).toBe(
      false,
    );
  });
});
