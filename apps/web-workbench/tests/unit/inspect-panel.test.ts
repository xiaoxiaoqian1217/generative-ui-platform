// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import type { ConversationTurn } from "../../src/conversation/conversation-store.js";
import type { TurnObservation } from "../../src/inspect/turn-inspection.js";
import InspectPanel from "../../src/shell/InspectPanel.vue";

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
    source: "agent",
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
  it("renders the swimlane timeline with raw JSON detail on demand", async () => {
    const wrapper = mount(InspectPanel, { props: { turn } });

    expect(wrapper.find('[data-testid="swimlane-timeline"]').exists()).toBe(
      true,
    );
    expect(wrapper.find('[data-testid="inspect-detail"]').exists()).toBe(false);

    await wrapper
      .get('[data-testid="timeline-node-observation-3"]')
      .trigger("click");

    const detail = wrapper.get('[data-testid="inspect-detail"]');
    expect(detail.text()).toContain("STATE_SNAPSHOT");
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
