// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ConversationComposer from "../../src/shell/ConversationComposer.vue";

describe("ConversationComposer", () => {
  it("emits inputChange on typing", async () => {
    const wrapper = mount(ConversationComposer, {
      props: {
        canSend: false,
        inputValue: "",
        isInputDisabled: false,
        isRunning: false,
      },
    });

    await wrapper.find("input").setValue("hello");
    expect(wrapper.emitted("inputChange")).toEqual([["hello"]]);
  });

  it("emits submit on Enter", async () => {
    const wrapper = mount(ConversationComposer, {
      props: {
        canSend: true,
        inputValue: "展示状态",
        isInputDisabled: false,
        isRunning: false,
      },
    });

    await wrapper.find("input").trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("submit")).toEqual([["展示状态"]]);
  });

  it("does not submit while composing", async () => {
    const wrapper = mount(ConversationComposer, {
      props: {
        canSend: true,
        inputValue: "展示状态",
        isInputDisabled: false,
        isRunning: false,
      },
    });

    await wrapper
      .find("input")
      .trigger("keydown", { key: "Enter", isComposing: true });
    expect(wrapper.emitted("submit")).toBeUndefined();
  });

  it("disables send and input when canSend is false", () => {
    const wrapper = mount(ConversationComposer, {
      props: {
        canSend: false,
        inputValue: "",
        isInputDisabled: true,
        isRunning: false,
      },
    });

    expect(
      wrapper.find("[data-testid='composer-send']").attributes("disabled"),
    ).toBeDefined();
    expect(wrapper.find("input").attributes("disabled")).toBeDefined();
  });

  it("shows a stop button while running", () => {
    const wrapper = mount(ConversationComposer, {
      props: {
        canSend: false,
        inputValue: "",
        isInputDisabled: false,
        isRunning: true,
      },
    });

    expect(wrapper.find("[data-testid='composer-stop']").exists()).toBe(true);
  });
});
