// @vitest-environment jsdom

import { ToolCallStatus } from "@copilotkit/core";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import PatrolRouteConsultCard from "../../src/conversation/PatrolRouteConsultCard.vue";
import {
  parsePatrolRouteConsultResponse,
  PATROL_ROUTE_REVISE_INSTRUCTION,
  patrolRouteConsultRequestSchema,
  type PatrolRouteConsultRequest,
} from "../../src/conversation/patrol-route-consult.js";

const request: PatrolRouteConsultRequest = {
  question: "请选择路线。",
  options: [
    {
      id: "route-a",
      label: "路线 A",
      summary: "覆盖范围较大、距离较长。",
      target: { featureId: "patrol-path-a", layerId: "patrol-routes" },
    },
    {
      id: "route-b",
      label: "路线 B",
      summary: "距离较短、东侧覆盖较少。",
      target: { featureId: "patrol-path-b", layerId: "patrol-routes" },
    },
  ],
};

describe("patrol route consultation", () => {
  it("accepts exactly the two existing route targets", () => {
    expect(patrolRouteConsultRequestSchema.parse(request)).toEqual(request);
    expect(() =>
      patrolRouteConsultRequestSchema.parse({
        ...request,
        options: [request.options[0], request.options[0]],
      }),
    ).toThrow();
  });

  it("rejects a selection outside the request options", () => {
    expect(() =>
      parsePatrolRouteConsultResponse(
        patrolRouteConsultRequestSchema.parse(request),
        { action: "select", selectedOptionId: "route-c" },
      ),
    ).toThrow("not part of this consultation");
  });

  it("admits only the deterministic fixture revision", () => {
    expect(
      parsePatrolRouteConsultResponse(request, {
        action: "revise",
        instruction: PATROL_ROUTE_REVISE_INSTRUCTION,
        selectedOptionId: "route-a",
      }),
    ).toEqual({
      action: "revise",
      instruction: PATROL_ROUTE_REVISE_INSTRUCTION,
      selectedOptionId: "route-a",
    });
    expect(() =>
      parsePatrolRouteConsultResponse(request, {
        action: "revise",
        instruction: "生成一条新路线",
        selectedOptionId: "route-a",
      }),
    ).toThrow();
    expect(() =>
      parsePatrolRouteConsultResponse(request, {
        action: "revise",
        instruction: PATROL_ROUTE_REVISE_INSTRUCTION,
        selectedOptionId: "route-c",
      }),
    ).toThrow("not part of this consultation");
  });

  it("previews with mouse or keyboard and submits only once", async () => {
    const active = new Set(["consult-1"]);
    const previewOption = vi.fn(async () => undefined);
    const respond = vi.fn(async () => undefined);
    const wrapper = mount(PatrolRouteConsultCard, {
      props: {
        args: request,
        cancelConsultPreview: vi.fn(async () => undefined),
        completeConsult: vi.fn(),
        invalidateConsult: vi.fn(),
        isConsultActive: (toolCallId) => active.has(toolCallId),
        markConsultActive: (toolCallId) => active.add(toolCallId),
        previewOption,
        respond,
        status: ToolCallStatus.Executing,
        toolCallId: "consult-1",
      },
    });

    await wrapper.get('[data-testid="preview-route-a"]').trigger("focus");
    await wrapper.get('[data-testid="preview-route-b"]').trigger("mouseenter");
    expect(previewOption).toHaveBeenNthCalledWith(
      1,
      "consult-1",
      request.options[0],
    );
    expect(previewOption).toHaveBeenNthCalledWith(
      2,
      "consult-1",
      request.options[1],
    );
    expect(
      wrapper
        .get('[data-testid="patrol-route-option-route-b"]')
        .attributes("data-previewing"),
    ).toBe("true");

    await wrapper.get('[data-testid="select-route-b"]').trigger("click");
    await wrapper.get('[data-testid="select-route-b"]').trigger("click");
    expect(respond).toHaveBeenCalledTimes(1);
    expect(respond).toHaveBeenCalledWith({
      action: "select",
      selectedOptionId: "route-b",
    });
  });

  it("clears a consult preview before returning cancel", async () => {
    const cancelConsultPreview = vi.fn(async () => undefined);
    const respond = vi.fn(async () => undefined);
    const wrapper = mount(PatrolRouteConsultCard, {
      props: {
        args: request,
        cancelConsultPreview,
        completeConsult: vi.fn(),
        invalidateConsult: vi.fn(),
        isConsultActive: () => true,
        markConsultActive: vi.fn(),
        previewOption: vi.fn(async () => undefined),
        respond,
        status: ToolCallStatus.Executing,
        toolCallId: "consult-1",
      },
    });

    await wrapper.get('[data-testid="consult-cancel"]').trigger("click");

    expect(cancelConsultPreview).toHaveBeenCalledWith("consult-1");
    expect(cancelConsultPreview.mock.invocationCallOrder[0]).toBeLessThan(
      respond.mock.invocationCallOrder[0] ?? 0,
    );
    expect(respond).toHaveBeenCalledWith({ action: "cancel" });
  });
});
