// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import WorkbenchTopNav from "../../src/shell/WorkbenchTopNav.vue";

describe("WorkbenchTopNav", () => {
  it("renders nav links, environment and agent status", () => {
    const wrapper = mount(WorkbenchTopNav, {
      props: {
        connectionLabel: "已连接",
        connectionState: "connected",
        environment: "dev",
        route: "/conversation",
        version: "0.1.0",
      },
    });

    expect(
      wrapper.find("[data-testid='agent-connection-status']").text(),
    ).toContain("已连接");
    expect(wrapper.find(".shell-topbar-nav a.active").attributes("href")).toBe(
      "/conversation",
    );
  });

  it("emits navigate on nav click", async () => {
    const wrapper = mount(WorkbenchTopNav, {
      props: {
        connectionLabel: "已连接",
        connectionState: "connected",
        environment: "dev",
        route: "/conversation",
        version: "0.1.0",
      },
    });

    await wrapper.find(".shell-topbar-nav a[href='/catalog']").trigger("click");
    expect(wrapper.emitted("navigate")).toEqual([["/catalog"]]);
  });
});
