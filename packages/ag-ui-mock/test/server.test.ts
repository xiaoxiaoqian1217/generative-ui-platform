import { PLATFORM_A2UI_CATALOG_ID } from "@generative-ui/shared-types";
import { afterEach, describe, expect, it } from "vitest";
import {
  createAguiMockServer,
  type ReusableAguiMockServer,
} from "../src/index.js";
import {
  INSPECTION_SUMMARY_A2UI_MESSAGE_ID,
  inspectionSummaryOperations,
} from "../src/scenarios/inspection-summary-a2ui.js";
import {
  INSPECTION_SUMMARY_PLATFORM_A2UI_MESSAGE_ID,
  inspectionSummaryPlatformOperations,
} from "../src/scenarios/inspection-summary-platform-a2ui.js";
import { inspectionSummaryStructuredResult } from "../src/scenarios/inspection-summary-structured.js";

interface AguiEvent {
  readonly type: string;
  readonly [key: string]: unknown;
}

const runningServers: ReusableAguiMockServer[] = [];

afterEach(async () => {
  await Promise.all(runningServers.splice(0).map((server) => server.stop()));
});

async function postMessage(url: string, message: string): Promise<AguiEvent[]> {
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

async function runMessage(message: string): Promise<AguiEvent[]> {
  const server = createAguiMockServer({ port: 0 });
  runningServers.push(server);
  const url = await server.start();
  return postMessage(url, message);
}

describe("createAguiMockServer", () => {
  it("advertises a CopilotKit-compatible AG-UI runtime for Workbench", async () => {
    const server = createAguiMockServer({ port: 0 });
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
    const events = await runMessage("hello");

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

  it("replays the inspection summary as a deterministic A2UI activity", async () => {
    const first = await runMessage("展示巡检摘要 A2UI");
    const second = await runMessage("展示巡检摘要 A2UI");

    for (const events of [first, second]) {
      expect(events.map((event) => event.type)).toEqual([
        "RUN_STARTED",
        "ACTIVITY_SNAPSHOT",
        "RUN_FINISHED",
      ]);
      const activity = events.find(
        (event) => event.type === "ACTIVITY_SNAPSHOT",
      );
      expect(activity).toMatchObject({
        activityType: "a2ui-surface",
        messageId: INSPECTION_SUMMARY_A2UI_MESSAGE_ID,
        replace: true,
      });
      expect(activity?.content).toEqual({
        a2ui_operations: inspectionSummaryOperations,
      });
    }

    const firstActivity = first.find(
      (event) => event.type === "ACTIVITY_SNAPSHOT",
    );
    const secondActivity = second.find(
      (event) => event.type === "ACTIVITY_SNAPSHOT",
    );
    expect(secondActivity?.content).toEqual(firstActivity?.content);
    expect(secondActivity?.messageId).toBe(firstActivity?.messageId);
  });

  it("references the shared platform catalog id from every A2UI fixture", () => {
    for (const operations of [
      inspectionSummaryOperations,
      inspectionSummaryPlatformOperations,
    ]) {
      const createSurface = operations.find(
        (operation) => "createSurface" in operation,
      );
      expect(createSurface).toMatchObject({
        createSurface: { catalogId: PLATFORM_A2UI_CATALOG_ID },
      });
    }
  });

  it("replays the platform catalog scenario as a deterministic A2UI activity", async () => {
    const events = await runMessage("展示平台 Catalog 巡检摘要 A2UI");

    expect(events.map((event) => event.type)).toEqual([
      "RUN_STARTED",
      "ACTIVITY_SNAPSHOT",
      "RUN_FINISHED",
    ]);
    const activity = events.find((event) => event.type === "ACTIVITY_SNAPSHOT");
    expect(activity).toMatchObject({
      activityType: "a2ui-surface",
      messageId: INSPECTION_SUMMARY_PLATFORM_A2UI_MESSAGE_ID,
      replace: true,
    });
    expect(activity?.content).toEqual({
      a2ui_operations: inspectionSummaryPlatformOperations,
    });

    const componentTypes = inspectionSummaryPlatformOperations.flatMap(
      (operation) =>
        "updateComponents" in operation
          ? operation.updateComponents.components.map(
              (component) => component.component,
            )
          : [],
    );
    expect(componentTypes).toContain("Metric");
    expect(componentTypes).toContain("StatusBadge");
    expect(componentTypes).toContain("InfoRow");
  });

  it("replays the structured inspection summary as an activity", async () => {
    const events = await runMessage("展示巡检摘要结构化结果");

    expect(events.map((event) => event.type)).toEqual([
      "RUN_STARTED",
      "ACTIVITY_SNAPSHOT",
      "RUN_FINISHED",
    ]);
    expect(events.at(1)).toMatchObject({
      activityType: "inspection-summary",
      content: inspectionSummaryStructuredResult,
      replace: true,
    });
    expect(events.at(-1)).not.toHaveProperty("result");
  });

  it("serves the connection probe and business scenarios from one server", async () => {
    const server = createAguiMockServer({ port: 0 });
    runningServers.push(server);
    const url = await server.start();

    const connectionEvents = await postMessage(url, "连接测试");
    const locateEvents = await postMessage(url, "定位无人机 01");

    expect(
      connectionEvents.find((event) => event.type === "TEXT_MESSAGE_CONTENT"),
    ).toMatchObject({
      delta: "AG-UI mock is connected.",
    });
    expect(
      locateEvents.find((event) => event.type === "TOOL_CALL_START"),
    ).toMatchObject({
      toolCallName: "locateDevice",
    });
  });

  it("replays locate-device with the official AG-UI tool-call sequence", async () => {
    const events = await runMessage("定位无人机 01");

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
    const server = createAguiMockServer({ port: 0 });
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
    expect(events.some((event) => event.type === "CUSTOM")).toBe(false);
    expect(events.some((event) => event.type === "TOOL_CALL_START")).toBe(
      false,
    );
  });
});
