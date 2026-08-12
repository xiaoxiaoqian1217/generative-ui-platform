// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import DeviceCard from "../../src/components/domain/DeviceCard.vue";

describe("DeviceCard", () => {
  it("shows the selected device business state", () => {
    const wrapper = mount(DeviceCard, {
      props: {
        device: {
          batteryPercent: 82,
          coordinates: [116.3974, 39.9093],
          deviceId: "01",
          location: "北京市东城区",
          name: "无人机 01",
          status: "online",
        },
      },
    });

    expect(wrapper.get("[data-testid='device-card']").text()).toContain(
      "无人机 01",
    );
    expect(wrapper.text()).toContain("ID 01");
    expect(wrapper.text()).toContain("在线");
    expect(wrapper.text()).toContain("82%");
    expect(wrapper.text()).toContain("116.3974, 39.9093");
    expect(wrapper.text()).toContain("北京市东城区");
  });
});
