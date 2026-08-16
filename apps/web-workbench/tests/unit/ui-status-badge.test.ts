// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import UiStatusBadge from "../../src/components/ui/UiStatusBadge.vue";
import { STATUS_BADGE_VARIANTS } from "../../src/features/a2ui/catalog/definitions/status-badge.js";

describe("UiStatusBadge", () => {
  it("renders every semantic variant", () => {
    expect(STATUS_BADGE_VARIANTS).toEqual([
      "neutral",
      "info",
      "success",
      "warning",
      "danger",
    ]);
    for (const variant of STATUS_BADGE_VARIANTS) {
      const wrapper = mount(UiStatusBadge, {
        props: { label: "已完成", variant },
      });
      const badge = wrapper.get("[data-testid='ui-status-badge']");
      expect(badge.text()).toBe("已完成");
      expect(badge.attributes("data-variant")).toBe(variant);
    }
  });

  it("falls back to the neutral variant when none is given", () => {
    const wrapper = mount(UiStatusBadge, { props: { label: "未知" } });
    expect(
      wrapper.get("[data-testid='ui-status-badge']").attributes("data-variant"),
    ).toBe("neutral");
  });
});
