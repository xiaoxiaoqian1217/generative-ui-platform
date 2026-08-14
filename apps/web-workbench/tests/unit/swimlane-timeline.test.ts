// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import SwimlaneTimeline from "../../src/inspect/SwimlaneTimeline.vue";
import type { TurnObservation } from "../../src/inspect/turn-inspection.js";

let sequence = 0;
function observation(
  input: Partial<TurnObservation> & Pick<TurnObservation, "source" | "type">,
): TurnObservation {
  sequence += 1;
  return {
    hasArtifact: false,
    id: `observation-${sequence}`,
    observedAt: "2026-08-13T10:00:00.000Z",
    observedIndex: sequence - 1,
    ...input,
  } as TurnObservation;
}

const frontendToolObservations: readonly TurnObservation[] = [
  observation({ source: "workbench", type: "RUN_INPUT" }),
  observation({ source: "agent", type: "RUN_STARTED" }),
  observation({
    source: "agent",
    toolCallId: "tool-call-1",
    type: "TOOL_CALL_END",
  }),
  observation({
    durationMs: 3,
    hasArtifact: true,
    source: "frontend-tool",
    status: "ok",
    toolCallId: "tool-call-1",
    type: "FRONTEND_TOOL_RESULT",
  }),
];

describe("SwimlaneTimeline", () => {
  it("derives lanes only from observed participants", () => {
    const wrapper = mount(SwimlaneTimeline, {
      props: { observations: frontendToolObservations },
    });

    expect(wrapper.get('[data-testid="timeline-lane-workbench"]').text()).toBe(
      "Workbench",
    );
    expect(wrapper.get('[data-testid="timeline-lane-agent"]').text()).toBe(
      "Agent",
    );
    expect(
      wrapper.get('[data-testid="timeline-lane-frontend-tool"]').text(),
    ).toBe("Frontend Tool");
    expect(
      wrapper.find('[data-testid="timeline-lane-copilotkit-runtime"]').exists(),
    ).toBe(false);
  });

  it("renders events in observed order with status and duration", () => {
    const wrapper = mount(SwimlaneTimeline, {
      props: { observations: frontendToolObservations },
    });

    const nodes = wrapper.findAll('[data-testid^="timeline-node-"]');
    expect(nodes.map((node) => node.attributes("data-type"))).toEqual([
      "RUN_INPUT",
      "RUN_STARTED",
      "TOOL_CALL_END",
      "FRONTEND_TOOL_RESULT",
    ]);
    expect(nodes[3]?.attributes("data-status")).toBe("ok");
    expect(nodes[3]?.text()).toContain("3ms");
  });

  it("places each node in its participant lane", () => {
    const wrapper = mount(SwimlaneTimeline, {
      props: { observations: frontendToolObservations },
    });

    const nodes = wrapper.findAll('[data-testid^="timeline-node-"]');
    expect(nodes[0]?.attributes("data-lane")).toBe("workbench");
    expect(nodes[1]?.attributes("data-lane")).toBe("agent");
    expect(nodes[3]?.attributes("data-lane")).toBe("frontend-tool");
  });

  it("emits select and highlights really correlated nodes", async () => {
    const wrapper = mount(SwimlaneTimeline, {
      props: {
        activeCorrelationKey: "tool:tool-call-1",
        observations: frontendToolObservations,
        selectedId: "observation-3",
      },
    });

    const correlated = wrapper.findAll('[data-correlated="true"]');
    expect(correlated).toHaveLength(2);

    await wrapper
      .get('[data-testid="timeline-node-observation-2"]')
      .trigger("click");
    expect(wrapper.emitted("select")).toEqual([["observation-2"]]);
  });

  it("shows an explicit empty state when nothing was observed", () => {
    const wrapper = mount(SwimlaneTimeline, { props: { observations: [] } });
    expect(wrapper.get('[data-testid="timeline-empty"]').text()).toContain(
      "没有可观察事实",
    );
  });
});
