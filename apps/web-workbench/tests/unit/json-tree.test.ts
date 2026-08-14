// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import JsonTree from "../../src/inspect/JsonTree.vue";

describe("JsonTree", () => {
  it("renders primitive values inline", () => {
    const wrapper = mount(JsonTree, { props: { data: "hello" } });
    expect(wrapper.get('[data-testid="json-tree"]').text()).toContain(
      '"hello"',
    );
  });

  it("expands the root object but keeps nested objects collapsed by default", async () => {
    const wrapper = mount(JsonTree, {
      props: { data: { outer: { inner: 42 } } },
    });

    expect(wrapper.text()).toContain("outer");
    expect(wrapper.text()).not.toContain("42");

    await wrapper.get('[data-testid="json-node-outer"]').trigger("click");
    expect(wrapper.text()).toContain("inner");
    expect(wrapper.text()).toContain("42");
  });

  it("paginates large arrays instead of dumping every entry", async () => {
    const data = Array.from({ length: 120 }, (_, index) => ({
      index,
    }));
    const wrapper = mount(JsonTree, { props: { data } });

    expect(wrapper.findAll('[data-testid^="json-node-"]').length).toBe(50);
    const more = wrapper.get('[data-testid="json-show-more"]');
    expect(more.text()).toContain("70");

    await more.trigger("click");
    expect(wrapper.findAll('[data-testid^="json-node-"]').length).toBe(100);
  });

  it("does not offer pagination for small objects", () => {
    const wrapper = mount(JsonTree, { props: { data: { a: 1, b: 2 } } });
    expect(wrapper.find('[data-testid="json-show-more"]').exists()).toBe(false);
  });
});
