<script setup lang="ts">
import { computed, ref } from "vue";

/**
 * Issue #205：结构化 JSON viewer。
 * - 根节点默认展开一层，嵌套对象默认折叠，不在首屏倾倒完整 payload；
 * - 大数组 / 大对象分页渲染（size guard），避免大 payload 导致页面不可用；
 * - 只展示真实 payload，不生成摘要替代权威内容。
 */

const PAGE_SIZE = 50;

defineOptions({ name: "JsonTree" });

const props = withDefaults(
  defineProps<{
    data: unknown;
    name?: string | undefined;
    depth?: number;
  }>(),
  { depth: 0 },
);

const expanded = ref(props.depth === 0);
const shownCount = ref(PAGE_SIZE);

const isComposite = computed(
  () => typeof props.data === "object" && props.data !== null,
);

const entries = computed<readonly [string, unknown][]>(() => {
  if (!isComposite.value) return [];
  if (Array.isArray(props.data))
    return props.data.map((value, index) => [String(index), value] as const);
  return Object.entries(props.data as Record<string, unknown>);
});

const visibleEntries = computed(() => entries.value.slice(0, shownCount.value));
const hiddenCount = computed(() => entries.value.length - shownCount.value);

const summary = computed(() =>
  Array.isArray(props.data)
    ? `Array(${props.data.length})`
    : isComposite.value
      ? `{${entries.value.length}}`
      : "",
);

const primitiveClass = computed(() => {
  if (props.data === null) return "json-null";
  switch (typeof props.data) {
    case "string":
      return "json-string";
    case "number":
      return "json-number";
    case "boolean":
      return "json-boolean";
    default:
      return "json-unknown";
  }
});

const primitiveText = computed(() => {
  if (props.data === null) return "null";
  if (typeof props.data === "string") return JSON.stringify(props.data);
  return String(props.data);
});

function toggle(): void {
  expanded.value = !expanded.value;
}

function showMore(): void {
  shownCount.value += PAGE_SIZE;
}
</script>

<template>
  <div class="json-tree" data-testid="json-tree">
    <div v-if="isComposite" class="json-composite">
      <button
        class="json-toggle"
        :data-testid="name === undefined ? 'json-toggle-root' : `json-node-${name}`"
        type="button"
        @click="toggle"
      >
        <span class="json-caret" :data-expanded="expanded">▸</span>
        <span v-if="name !== undefined" class="json-key">{{ name }}:</span>
        <span class="json-summary">{{ summary }}</span>
      </button>
      <div v-if="expanded" class="json-children">
        <JsonTree
          v-for="[key, value] in visibleEntries"
          :key="key"
          :data="value"
          :depth="depth + 1"
          :name="key"
        />
        <button
          v-if="hiddenCount > 0"
          class="json-show-more"
          data-testid="json-show-more"
          type="button"
          @click="showMore"
        >
          显示更多（剩余 {{ hiddenCount }} 项）
        </button>
      </div>
    </div>
    <div v-else class="json-primitive">
      <span v-if="name !== undefined" class="json-key">{{ name }}:</span>
      <span :class="primitiveClass">{{ primitiveText }}</span>
    </div>
  </div>
</template>
