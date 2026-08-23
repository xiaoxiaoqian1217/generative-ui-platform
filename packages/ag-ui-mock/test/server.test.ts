import { PLATFORM_A2UI_CATALOG_ID } from "@generative-ui/shared-types";
import { afterEach, describe, expect, it } from "vitest";
import {
  PATROL_ROUTE_CONSULT_MESSAGE,
  PATROL_ROUTE_CONSULT_REQUEST,
  PATROL_ROUTE_CONSULT_RESPONSES,
  PATROL_ROUTE_CONSULT_TOOL,
} from "../src/scenarios/consult-patrol-route-selection.js";
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
import {
  MAP_PATROL_ROUTE_REVIEW_PLAN_MESSAGE_ID,
  MAP_PATROL_ROUTE_REVIEW_MESSAGE,
  MAP_PATROL_ROUTE_REVIEW_RESULT,
  MAP_PATROL_ROUTE_REVIEW_STEPS,
  mapPatrolRouteReviewPlan,
} from "../src/scenarios/map-patrol-route-review.js";
import { MAP_PLAN_ACTIVITY_TYPE } from "@generative-ui/shared-types";

interface AguiEvent {
  readonly type: string;
  readonly [key: string]: unknown;
}

const runningServers: ReusableAguiMockServer[] = [];

afterEach(async () => {
  await Promise.all(runningServers.splice(0).map((server) => server.stop()));
});

async function postMessages(
  url: string,
  messages: readonly Record<string, unknown>[],
): Promise<AguiEvent[]> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      threadId: "thread-test",
      runId: "run-test",
      messages,
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

async function postMessage(url: string, message: string): Promise<AguiEvent[]> {
  return postMessages(url, [
    { id: "message-test", role: "user", content: message },
  ]);
}

function appendCompletedToolCall(
  messages: Record<string, unknown>[],
  events: readonly AguiEvent[],
  result: Record<string, unknown>,
): string {
  const start = events.find((event) => event.type === "TOOL_CALL_START");
  const args = events.find((event) => event.type === "TOOL_CALL_ARGS");
  expect(start?.toolCallId).toEqual(expect.any(String));
  expect(start?.toolCallName).toEqual(expect.any(String));
  expect(args?.delta).toEqual(expect.any(String));
  if (typeof start?.toolCallId !== "string")
    throw new Error("TOOL_CALL_START did not include a toolCallId");
  messages.push(
    {
      id: `assistant-${messages.length}`,
      role: "assistant",
      toolCalls: [
        {
          function: {
            arguments: args?.delta,
            name: start?.toolCallName,
          },
          id: start?.toolCallId,
          type: "function",
        },
      ],
    },
    {
      content: JSON.stringify(result),
      id: `tool-${messages.length}`,
      role: "tool",
      toolCallId: start?.toolCallId,
    },
  );
  return start.toolCallId;
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
      toolCallName: "focusOn",
    });
  });

  it("migrates the locate intent to the official map tool-call sequence", async () => {
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
      toolCallName: "focusOn",
    });
    expect(
      events.find((event) => event.type === "TOOL_CALL_ARGS"),
    ).toMatchObject({
      delta: '{"target":{"featureId":"01","layerId":"devices"}}',
    });
  });

  it("preserves locate behavior through focusOn and highlight results", async () => {
    const server = createAguiMockServer({ port: 0 });
    runningServers.push(server);
    const url = await server.start();
    const messages: Record<string, unknown>[] = [
      { id: "user-1", role: "user", content: "定位无人机 01" },
    ];

    const focusEvents = await postMessages(url, messages);
    appendCompletedToolCall(messages, focusEvents, {
      affectedFeatureIds: ["01"],
      status: "completed",
    });
    const highlightEvents = await postMessages(url, messages);
    expect(highlightEvents.map((event) => event.type)).toEqual([
      "RUN_STARTED",
      "TOOL_CALL_RESULT",
      "TOOL_CALL_START",
      "TOOL_CALL_ARGS",
      "TOOL_CALL_END",
      "RUN_FINISHED",
    ]);
    expect(
      highlightEvents.find((event) => event.type === "TOOL_CALL_START"),
    ).toMatchObject({ toolCallName: "highlight" });

    appendCompletedToolCall(messages, highlightEvents, {
      affectedFeatureIds: ["01"],
      status: "completed",
    });
    const finalEvents = await postMessages(url, messages);
    expect(finalEvents.map((event) => event.type)).toContain(
      "TEXT_MESSAGE_CONTENT",
    );
    expect(finalEvents.some((event) => event.type === "CUSTOM")).toBe(false);
    expect(finalEvents.some((event) => event.type === "TOOL_CALL_START")).toBe(
      false,
    );
  });

  it("runs patrol scenario A through four map intents, then assistant text", async () => {
    const server = createAguiMockServer({ port: 0 });
    runningServers.push(server);
    const url = await server.start();
    const messages: Record<string, unknown>[] = [
      {
        id: "user-map-analysis",
        role: "user",
        content: MAP_PATROL_ROUTE_REVIEW_MESSAGE,
      },
    ];
    let previousResult:
      | { readonly content: string; readonly toolCallId: string }
      | undefined;

    for (const [index, step] of MAP_PATROL_ROUTE_REVIEW_STEPS.entries()) {
      const events = await postMessages(url, messages);
      expect(events.map((event) => event.type)).toEqual(
        index === 0
          ? [
              "RUN_STARTED",
              "ACTIVITY_SNAPSHOT",
              "TOOL_CALL_START",
              "TOOL_CALL_ARGS",
              "TOOL_CALL_END",
              "RUN_FINISHED",
            ]
          : [
              "RUN_STARTED",
              "TOOL_CALL_RESULT",
              "ACTIVITY_SNAPSHOT",
              "TOOL_CALL_START",
              "TOOL_CALL_ARGS",
              "TOOL_CALL_END",
              "RUN_FINISHED",
            ],
      );
      expect(
        events.find((event) => event.type === "ACTIVITY_SNAPSHOT"),
      ).toMatchObject({
        activityType: MAP_PLAN_ACTIVITY_TYPE,
        content: mapPatrolRouteReviewPlan(index),
        messageId: MAP_PATROL_ROUTE_REVIEW_PLAN_MESSAGE_ID,
        replace: true,
      });
      if (previousResult !== undefined) {
        expect(
          events.find((event) => event.type === "TOOL_CALL_RESULT"),
        ).toMatchObject({
          content: previousResult.content,
          role: "tool",
          toolCallId: previousResult.toolCallId,
        });
      }
      expect(
        events.find((event) => event.type === "TOOL_CALL_START"),
      ).toMatchObject({ toolCallName: step.toolName });
      expect(
        events.find((event) => event.type === "TOOL_CALL_ARGS"),
      ).toMatchObject({ delta: JSON.stringify(step.args) });
      const completedResult = {
        ...step.expected,
        status: "completed",
      };
      previousResult = {
        content: JSON.stringify(completedResult),
        toolCallId: appendCompletedToolCall(messages, events, completedResult),
      };
    }

    const finalEvents = await postMessages(url, messages);
    expect(finalEvents.map((event) => event.type)).toEqual([
      "RUN_STARTED",
      "TOOL_CALL_RESULT",
      "ACTIVITY_SNAPSHOT",
      "TEXT_MESSAGE_START",
      "TEXT_MESSAGE_CONTENT",
      "TEXT_MESSAGE_END",
      "RUN_FINISHED",
    ]);
    expect(
      finalEvents.find((event) => event.type === "ACTIVITY_SNAPSHOT"),
    ).toMatchObject({
      activityType: MAP_PLAN_ACTIVITY_TYPE,
      content: mapPatrolRouteReviewPlan(MAP_PATROL_ROUTE_REVIEW_STEPS.length),
      messageId: MAP_PATROL_ROUTE_REVIEW_PLAN_MESSAGE_ID,
      replace: true,
    });
    expect(
      finalEvents.find((event) => event.type === "TOOL_CALL_RESULT"),
    ).toMatchObject({
      content: previousResult?.content,
      role: "tool",
      toolCallId: previousResult?.toolCallId,
    });
    expect(
      finalEvents.find((event) => event.type === "TEXT_MESSAGE_CONTENT"),
    ).toMatchObject({ delta: MAP_PATROL_ROUTE_REVIEW_RESULT });
  });

  it.each([
    ["route A", PATROL_ROUTE_CONSULT_RESPONSES.selectA, "patrol-path-a"],
    ["route B", PATROL_ROUTE_CONSULT_RESPONSES.selectB, "patrol-path-b"],
  ] as const)(
    "continues patrol consultation selection for %s",
    async (_label, selection, pathFeatureId) => {
      const server = createAguiMockServer({ port: 0 });
      runningServers.push(server);
      const url = await server.start();
      const messages: Record<string, unknown>[] = [
        {
          id: "user-consult",
          role: "user",
          content: PATROL_ROUTE_CONSULT_MESSAGE,
        },
      ];

      const consultEvents = await postMessages(url, messages);
      expect(consultEvents.some((event) => event.type === "CUSTOM")).toBe(
        false,
      );
      expect(
        consultEvents.some((event) => event.type.includes("INTERRUPT")),
      ).toBe(false);
      expect(
        consultEvents.find((event) => event.type === "TOOL_CALL_START"),
      ).toMatchObject({ toolCallName: PATROL_ROUTE_CONSULT_TOOL });
      expect(
        consultEvents.find((event) => event.type === "TOOL_CALL_ARGS"),
      ).toMatchObject({ delta: JSON.stringify(PATROL_ROUTE_CONSULT_REQUEST) });

      const consultToolCallId = appendCompletedToolCall(
        messages,
        consultEvents,
        selection,
      );
      const previewEvents = await postMessages(url, messages);
      expect(
        previewEvents.find((event) => event.type === "TOOL_CALL_RESULT"),
      ).toMatchObject({
        content: JSON.stringify(selection),
        role: "tool",
        toolCallId: consultToolCallId,
      });
      expect(
        previewEvents.find((event) => event.type === "TOOL_CALL_START"),
      ).toMatchObject({ toolCallName: "previewPath" });
      expect(
        previewEvents.find((event) => event.type === "TOOL_CALL_ARGS"),
      ).toMatchObject({
        delta: JSON.stringify({
          target: { featureId: pathFeatureId, layerId: "patrol-routes" },
        }),
      });

      appendCompletedToolCall(messages, previewEvents, {
        affectedFeatureIds: [pathFeatureId],
        status: "completed",
      });
      const finalEvents = await postMessages(url, messages);
      expect(
        finalEvents.find((event) => event.type === "TEXT_MESSAGE_CONTENT"),
      ).toMatchObject({
        delta: expect.stringContaining("尚未提交或执行巡逻任务"),
      });
    },
  );

  it("cancels patrol consultation without map continuation", async () => {
    const server = createAguiMockServer({ port: 0 });
    runningServers.push(server);
    const url = await server.start();
    const messages: Record<string, unknown>[] = [
      {
        id: "user-consult",
        role: "user",
        content: PATROL_ROUTE_CONSULT_MESSAGE,
      },
    ];
    const consultEvents = await postMessages(url, messages);
    appendCompletedToolCall(
      messages,
      consultEvents,
      PATROL_ROUTE_CONSULT_RESPONSES.cancel,
    );

    const finalEvents = await postMessages(url, messages);
    expect(finalEvents.some((event) => event.type === "TOOL_CALL_START")).toBe(
      false,
    );
    expect(
      finalEvents.find((event) => event.type === "TEXT_MESSAGE_CONTENT"),
    ).toMatchObject({ delta: expect.stringContaining("没有选择巡逻路线") });
  });

  it("starts a fresh patrol consultation after a completed consultation", async () => {
    const server = createAguiMockServer({ port: 0 });
    runningServers.push(server);
    const url = await server.start();
    const messages: Record<string, unknown>[] = [
      {
        id: "user-consult-first",
        role: "user",
        content: PATROL_ROUTE_CONSULT_MESSAGE,
      },
    ];

    const firstConsultEvents = await postMessages(url, messages);
    const firstConsultToolCallId = firstConsultEvents.find(
      (event) => event.type === "TOOL_CALL_START",
    )?.toolCallId;
    appendCompletedToolCall(
      messages,
      firstConsultEvents,
      PATROL_ROUTE_CONSULT_RESPONSES.selectB,
    );
    const firstPreviewEvents = await postMessages(url, messages);
    appendCompletedToolCall(messages, firstPreviewEvents, {
      affectedFeatureIds: ["patrol-path-b"],
      status: "completed",
    });
    const firstFinalEvents = await postMessages(url, messages);
    const firstFinalText = firstFinalEvents.find(
      (event) => event.type === "TEXT_MESSAGE_CONTENT",
    );
    messages.push(
      {
        content: firstFinalText?.delta,
        id: "assistant-consult-first-final",
        role: "assistant",
      },
      {
        content: PATROL_ROUTE_CONSULT_MESSAGE,
        id: "user-consult-second",
        role: "user",
      },
    );

    const secondConsultEvents = await postMessages(url, messages);

    expect(
      secondConsultEvents.find((event) => event.type === "TOOL_CALL_START"),
    ).toMatchObject({ toolCallName: PATROL_ROUTE_CONSULT_TOOL });
    expect(
      secondConsultEvents.find((event) => event.type === "TOOL_CALL_ARGS"),
    ).toMatchObject({ delta: JSON.stringify(PATROL_ROUTE_CONSULT_REQUEST) });
    expect(
      secondConsultEvents.find((event) => event.type === "TOOL_CALL_START")
        ?.toolCallId,
    ).not.toBe(firstConsultToolCallId);
  });

  it.each([
    {
      featureId: "patrol-path-a" as const,
      label: "A",
      response: PATROL_ROUTE_CONSULT_RESPONSES.reviseA,
    },
    {
      featureId: "patrol-path-b" as const,
      label: "B",
      response: PATROL_ROUTE_CONSULT_RESPONSES.reviseB,
    },
  ])("continues the fixed revision through highlight and existing route $label", async ({
    featureId,
    response,
  }) => {
    const server = createAguiMockServer({ port: 0 });
    runningServers.push(server);
    const url = await server.start();
    const messages: Record<string, unknown>[] = [
      {
        id: "user-consult",
        role: "user",
        content: PATROL_ROUTE_CONSULT_MESSAGE,
      },
    ];
    const consultEvents = await postMessages(url, messages);
    appendCompletedToolCall(
      messages,
      consultEvents,
      response,
    );

    const highlightEvents = await postMessages(url, messages);
    expect(
      highlightEvents.find((event) => event.type === "TOOL_CALL_START"),
    ).toMatchObject({ toolCallName: "highlight" });
    appendCompletedToolCall(messages, highlightEvents, {
      affectedFeatureIds: ["under-bridge"],
      status: "completed",
    });

    const previewEvents = await postMessages(url, messages);
    expect(
      previewEvents.find((event) => event.type === "TOOL_CALL_START"),
    ).toMatchObject({ toolCallName: "previewPath" });
    expect(
      previewEvents.find((event) => event.type === "TOOL_CALL_ARGS"),
    ).toMatchObject({
      delta: JSON.stringify({
        target: { featureId, layerId: "patrol-routes" },
      }),
    });
    appendCompletedToolCall(messages, previewEvents, {
      affectedFeatureIds: [featureId],
      status: "completed",
    });

    const finalEvents = await postMessages(url, messages);
    expect(
      finalEvents.find((event) => event.type === "TEXT_MESSAGE_CONTENT"),
    ).toMatchObject({ delta: expect.stringContaining("没有生成新路线") });
  });
});
