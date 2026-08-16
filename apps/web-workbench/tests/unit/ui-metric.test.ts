// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import UiMetric from "../../src/components/ui/UiMetric.vue";

describe("UiMetric", () => {
  it("renders the label and value", () => {
    const wrapper = mount(UiMetric, {
      props: { label: "设备数量", value: 5 },
    });
    const metric = wrapper.get("[data-testid='ui-metric']");
    expect(metric.text()).toContain("设备数量");
    expect(metric.text()).toContain("5");
    expect(metric.attributes("data-emphasis")).toBe("default");
  });

  it("renders the trend marker when a trend is given", () => {
    const wrapper = mount(UiMetric, {
      props: { label: "完成率", value: "98%", trend: "up" },
    });
    const trend = wrapper.get(".ui-metric-trend");
    expect(trend.attributes("data-trend")).toBe("up");
  });

  it("applies the layout weight as flex-grow", () => {
    const wrapper = mount(UiMetric, {
      props: { label: "x", value: 1, weight: 1 },
    });
    expect(
      wrapper.get("[data-testid='ui-metric']").attributes("style"),
    ).toContain("flex-grow: 1");
  });
});
