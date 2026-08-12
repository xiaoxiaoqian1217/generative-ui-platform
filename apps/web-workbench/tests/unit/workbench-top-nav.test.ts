// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import WorkbenchTopNav from "../../src/shell/WorkbenchTopNav.vue";

describe("WorkbenchTopNav", () => {
  it("renders nav links, environment, version and agent status", () => {
    const wrapper = mount(WorkbenchTopNav, {
      props: {
        connectionLabel: "Runtime Host 可用",
        connectionState: "connected",
        environment: "dev",
        route: "/conversation",
        version: "0.1.0",
      },
    });

    expect(wrapper.find("[data-testid='environment-banner']").text()).toContain(
      "dev",
    );
    expect(wrapper.find("[data-testid='environment-banner']").text()).toContain(
      "v0.1.0",
    );
    expect(
      wrapper.find("[data-testid='agent-connection-status']").text(),
    ).toContain("Runtime Host 可用");
    expect(wrapper.find(".topnav-nav a.active").attributes("href")).toBe(
      "/conversation",
    );
  });

  it("emits navigate on nav click", async () => {
    const wrapper = mount(WorkbenchTopNav, {
      props: {
        connectionLabel: "Runtime Host 可用",
        connectionState: "connected",
        environment: "dev",
        route: "/conversation",
        version: "0.1.0",
      },
    });

    await wrapper.find(".topnav-nav a[href='/catalog']").trigger("click");
    expect(wrapper.emitted("navigate")).toEqual([["/catalog"]]);
  });
});
