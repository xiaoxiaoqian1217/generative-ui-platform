<script setup lang="ts">
import type { RuntimeActionEnvelope } from "@generative-ui/runtime-contract";
import { computed, h, type VNode } from "vue";
import {
  createRuntimeAction,
  registeredComponentTypes,
  resolveDynamicValue,
  type A2UISurface,
} from "./a2ui.js";

const props = defineProps<{ surface: A2UISurface }>();
const emit = defineEmits<{ action: [action: RuntimeActionEnvelope] }>();
const registered = new Set<string>(registeredComponentTypes);
const stringify = (value: unknown): string =>
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean"
    ? String(value)
    : "";

function componentProps(
  componentId: string,
): Record<string, unknown> | undefined {
  const component = props.surface.components.get(componentId);
  if (!component || !registered.has(component.component)) return undefined;
  return Object.fromEntries(
    Object.entries(component)
      .filter(
        ([key]) => !["id", "component", "action", "children"].includes(key),
      )
      .map(([key, value]) => [
        key,
        resolveDynamicValue(value, props.surface.dataModel),
      ]),
  );
}

function childrenOf(componentId: string): VNode[] {
  const children = props.surface.components.get(componentId)?.children;
  return Array.isArray(children) &&
    children.every((child) => typeof child === "string")
    ? children
        .map(renderComponent)
        .filter((child): child is VNode => child !== undefined)
    : [];
}

function renderComponent(componentId: string): VNode | undefined {
  const component = props.surface.components.get(componentId);
  const values = componentProps(componentId);
  if (!component || !values) return undefined;
  const children = childrenOf(componentId);
  const className = `a2ui-component a2ui-${component.component.toLowerCase()}`;
  if (component.component === "Badge")
    return h(
      "span",
      { class: className },
      stringify(values.label ?? values.text ?? values.status),
    );
  if (component.component === "Button")
    return h(
      "button",
      {
        class: className,
        type: "button",
        onClick: () => {
          const action = createRuntimeAction(
            props.surface.surfaceId,
            component,
            props.surface.dataModel,
          );
          if (action) emit("action", action);
        },
      },
      stringify(values.label ?? values.text ?? "继续"),
    );
  if (component.component === "Card")
    return h("section", { class: className }, [
      values.title === undefined ? undefined : h("h3", stringify(values.title)),
      values.content === undefined
        ? undefined
        : h("p", stringify(values.content)),
      ...children,
    ]);
  if (component.component === "Column" || component.component === "Row")
    return h("div", { class: className }, children);
  if (component.component === "Text")
    return h(
      "p",
      { class: className },
      stringify(values.text ?? values.content),
    );
  if (component.component === "List" || component.component === "Timeline") {
    const items = Array.isArray(values.items) ? values.items : [];
    const container = component.component === "Timeline" ? "ol" : "ul";
    return h("section", { class: className }, [
      values.title === undefined ? undefined : h("h3", stringify(values.title)),
      h(
        container,
        items.map((item) => h("li", stringify(item))),
      ),
      ...children,
    ]);
  }
  if (component.component === "Table") {
    const rows = Array.isArray(values.rows) ? values.rows : [];
    const first = rows[0];
    const headers =
      first && typeof first === "object" && !Array.isArray(first)
        ? Object.keys(first)
        : [];
    return h("table", { class: className }, [
      h("thead", [
        h(
          "tr",
          headers.map((header) => h("th", header)),
        ),
      ]),
      h(
        "tbody",
        rows.map((row) =>
          h(
            "tr",
            headers.map((header) =>
              h("td", stringify((row as Record<string, unknown>)[header])),
            ),
          ),
        ),
      ),
      ...children,
    ]);
  }
  return undefined;
}

const root = computed(() => renderComponent("root"));
</script>

<template>
  <component :is="root" v-if="root" />
  <div v-else class="a2ui-fallback" data-testid="a2ui-unknown-component" role="status">A2UI 组件未注册，已安全忽略。</div>
</template>
