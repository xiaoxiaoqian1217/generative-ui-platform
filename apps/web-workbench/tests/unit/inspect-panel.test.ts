// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import type { ConversationTurn } from "../../src/conversation/conversation-store.js";
import type { TurnObservation } from "../../src/inspect/turn-inspection.js";
import InspectPanel from "../../src/shell/InspectPanel.vue";
import {
  MAP_PLAN_ACTIVITY_SCHEMA_VERSION,
  MAP_PLAN_ACTIVITY_TYPE,
} from "@generative-ui/shared-types";

const observations: readonly TurnObservation[] = [
  {
    hasArtifact: true,
    id: "observation-1",
    observedAt: "2026-08-13T10:00:00.000Z",
    observedIndex: 0,
    payload: { message: { content: "run SACS business task" } },
    source: "workbench",
    type: "RUN_INPUT",
  },
  {
    hasArtifact: false,
    id: "observation-2",
    observedAt: "2026-08-13T10:00:00.020Z",
    observedIndex: 1,
    payload: { type: "TEXT_MESSAGE_CONTENT", delta: "artifact report-42" },
    source: "agent",
    type: "TEXT_MESSAGE_CONTENT",
  },
  {
    hasArtifact: true,
    id: "observation-3",
    observedAt: "2026-08-13T10:00:00.040Z",
    observedIndex: 2,
    payload: { snapshot: { progress: 25 } },
    runId: "run-1",
    source: "agent",
    threadId: "thread-1",
    type: "STATE_SNAPSHOT",
  },
];

const turn: ConversationTurn = {
  observations,
  requestId: "request-1",
  responseMessages: [],
  runId: "run-1",
  status: "completed",
  threadId: "thread-1",
  turnId: "turn-1",
  userMessage: { content: "run", id: "message-1", role: "user" },
};

describe("InspectPanel", () => {
  it("links the user-visible map projection to its observed tool exchange", async () => {
    const mapTurn: ConversationTurn = {
      ...turn,
      observations: [
        {
          hasArtifact: true,
          id: "map-plan",
          messageId: "map-plan-1",
          observedAt: "2026-08-13T10:00:00.000Z",
          observedIndex: 0,
          payload: {
            activityType: MAP_PLAN_ACTIVITY_TYPE,
            content: {
              goal: "检查北侧通道",
              schemaVersion: MAP_PLAN_ACTIVITY_SCHEMA_VERSION,
              status: "completed",
              steps: [
                {
                  detail: "展示已有候选路线。",
                  id: "route",
                  label: "预览候选路线",
                  operationNames: ["previewPath"],
                  status: "completed",
                },
              ],
            },
            messageId: "map-plan-1",
            replace: true,
            type: "ACTIVITY_SNAPSHOT",
          },
          source: "agent",
          type: "ACTIVITY_SNAPSHOT",
        },
        {
          hasArtifact: true,
          id: "map-invocation",
          observedAt: "2026-08-13T10:00:00.000Z",
          observedIndex: 1,
          payload: {
            args: { target: { featureId: "patrol-path-a" } },
            name: "previewPath",
          },
          runId: "run-1",
          source: "frontend-tool",
          threadId: "thread-1",
          toolCallId: "tool-preview",
          type: "FRONTEND_TOOL_INVOCATION",
        },
        {
          hasArtifact: true,
          id: "map-result",
          observedAt: "2026-08-13T10:00:00.020Z",
          observedIndex: 2,
          payload: {
            name: "previewPath",
            result: JSON.stringify({ status: "completed" }),
          },
          runId: "run-1",
          source: "frontend-tool",
          status: "ok",
          threadId: "thread-1",
          toolCallId: "tool-preview",
          type: "FRONTEND_TOOL_RESULT",
        },
      ],
    };
    const wrapper = mount(InspectPanel, { props: { turn: mapTurn } });

    const projection = wrapper.get('[data-testid="inspect-map-operations"]');
    expect(projection.text()).toContain("预览候选路线 A");
    expect(projection.text()).toContain("公开计划来自真实 map-plan Activity");
    expect(projection.text()).toContain("检查北侧通道");

    await wrapper.get('[data-testid="inspect-map-plan"]').trigger("click");
    expect(wrapper.get('[data-testid="inspect-detail"]').text()).toContain(
      "ACTIVITY_SNAPSHOT",
    );

    await wrapper
      .get('[data-testid="inspect-map-operation-tool-preview"]')
      .trigger("click");

    expect(wrapper.get('[data-testid="inspect-detail"]').text()).toContain(
      "FRONTEND_TOOL_INVOCATION",
    );
    expect(
      wrapper.get('[data-testid="inspect-exchange-response"]').text(),
    ).toContain("completed");
  });

  it("renders the swimlane timeline with raw JSON detail on demand", async () => {
    const wrapper = mount(InspectPanel, { props: { turn } });

    expect(wrapper.find('[data-testid="swimlane-timeline"]').exists()).toBe(
      true,
    );
    expect(wrapper.find('[data-testid="inspect-detail"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="inspect-turn-run-id"]').text()).toBe(
      "run-1",
    );
    expect(wrapper.get('[data-testid="inspect-turn-thread-id"]').text()).toBe(
      "thread-1",
    );

    await wrapper
      .get('[data-testid="timeline-node-observation-3"]')
      .trigger("click");

    const detail = wrapper.get('[data-testid="inspect-detail"]');
    expect(detail.text()).toContain("STATE_SNAPSHOT");
    expect(wrapper.get('[data-testid="inspect-run-id"]').text()).toBe("run-1");
    expect(wrapper.get('[data-testid="inspect-thread-id"]').text()).toBe(
      "thread-1",
    );
    // 嵌套对象默认折叠，按需展开
    expect(detail.text()).not.toContain("progress");
    await wrapper.get('[data-testid="json-node-snapshot"]').trigger("click");
    expect(detail.text()).toContain("progress");
    expect(wrapper.find('[data-testid="inspect-no-artifact"]').exists()).toBe(
      false,
    );
  });

  it("marks process events as having no contract artifact without fabricating JSON", async () => {
    const wrapper = mount(InspectPanel, { props: { turn } });

    await wrapper
      .get('[data-testid="timeline-node-observation-2"]')
      .trigger("click");

    expect(wrapper.get('[data-testid="inspect-no-artifact"]').text()).toContain(
      "不产生契约边界 Artifact",
    );
    // 原始事件 payload 仍然可以 Raw JSON 直通查看
    expect(wrapper.get('[data-testid="inspect-detail"]').text()).toContain(
      "artifact report-42",
    );
  });

  it("copies the authoritative payload JSON", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const wrapper = mount(InspectPanel, { props: { turn } });

    await wrapper
      .get('[data-testid="timeline-node-observation-3"]')
      .trigger("click");
    await wrapper.get('[data-testid="inspect-copy"]').trigger("click");

    expect(writeText).toHaveBeenCalledWith(
      JSON.stringify({ snapshot: { progress: 25 } }, null, 2),
    );
  });

  it("keeps turns without observations inspectable", () => {
    const { observations: _observations, ...turnWithoutObservations } = turn;
    const wrapper = mount(InspectPanel, {
      props: { turn: turnWithoutObservations },
    });

    expect(wrapper.find('[data-testid="timeline-empty"]').exists()).toBe(true);
  });
});
