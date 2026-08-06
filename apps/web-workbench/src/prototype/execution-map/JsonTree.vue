<script setup lang="ts">
// PROTOTYPE(issue-179)：零映射 JSON 树查看器。
// 上游给什么就渲染什么；节点按需展开，数组显示条目数，不解释业务语义。
import { computed, ref } from "vue";

const props = withDefaults(
  defineProps<{
    value: unknown;
    label?: string | undefined;
    depth?: number;
    defaultExpandDepth?: number;
  }>(),
  { label: undefined, depth: 0, defaultExpandDepth: 1 },
);

const expanded = ref(props.depth < props.defaultExpandDepth);

type Entry = { key: string; value: unknown };

const kind = computed(() => {
  if (props.value === null) return "null";
  if (Array.isArray(props.value)) return "array";
  return typeof props.value;
});

const entries = computed<Entry[]>(() => {
  if (kind.value === "array") {
    return (props.value as unknown[]).map((item, index) => ({
      key: String(index),
      value: item,
    }));
  }
  if (kind.value === "object") {
    return Object.entries(props.value as Record<string, unknown>).map(
      ([key, value]) => ({ key, value }),
    );
  }
  return [];
});

const expandable = computed(() => kind.value === "array" || kind.value === "object");

const preview = computed(() => {
  if (kind.value === "array") return `Array(${(props.value as unknown[]).length})`;
  if (kind.value === "object") return `{${entries.value.length}}`;
  return "";
});

const primitive = computed(() => {
  if (kind.value === "string") return `"${props.value as string}"`;
  return String(props.value);
});
</script>

<template>
  <div class="json-node" :style="{ paddingLeft: depth === 0 ? '0' : '14px' }">
    <div class="json-line">
      <button
        v-if="expandable"
        type="button"
        class="json-toggle"
        @click="expanded = !expanded"
      >
        {{ expanded ? "▾" : "▸" }}
      </button>
      <span v-else class="json-toggle-placeholder"></span>
      <span v-if="label !== undefined" class="json-key">{{ label }}</span>
      <span v-if="!expandable" class="json-value" :data-kind="kind">{{ primitive }}</span>
      <span v-else-if="!expanded" class="json-preview">{{ preview }}</span>
    </div>
    <template v-if="expandable && expanded">
      <JsonTree
        v-for="entry in entries"
        :key="entry.key"
        :value="entry.value"
        :label="entry.key"
        :depth="depth + 1"
        :default-expand-depth="defaultExpandDepth"
      />
    </template>
  </div>
</template>

<style scoped>
.json-node {
  font-family: "Cascadia Code", "SFMono-Regular", Consolas, monospace;
  font-size: 0.74rem;
  line-height: 1.7;
}

.json-line {
  display: flex;
  align-items: baseline;
  gap: 5px;
  min-width: 0;
}

.json-toggle {
  padding: 0 2px;
  border: none;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  font-size: 0.68rem;
}

.json-toggle-placeholder {
  display: inline-block;
  width: 10px;
}

.json-key {
  color: var(--accent-dark);
}

.json-key::after {
  content: ":";
  color: var(--muted);
}

.json-value[data-kind="string"] {
  color: var(--green);
  word-break: break-all;
}

.json-value[data-kind="number"] {
  color: var(--amber);
}

.json-value[data-kind="boolean"],
.json-value[data-kind="null"] {
  color: var(--muted);
  font-weight: 700;
}

.json-preview {
  color: var(--muted);
}
</style>
