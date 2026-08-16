// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import UiInfoRow from "../../src/components/ui/UiInfoRow.vue";

describe("UiInfoRow", () => {
  it("renders a label-value pair", () => {
    const wrapper = mount(UiInfoRow, {
      props: { label: "开始时间", value: "14:20" },
    });
    const row = wrapper.get("[data-testid='ui-info-row']");
    expect(row.get(".ui-info-row-label").text()).toBe("开始时间");
    expect(row.get(".ui-info-row-value").text()).toBe("14:20");
  });
});
