<script setup lang="ts">
import { computed, ref, watch } from "vue";

const props = defineProps<{ operations: readonly Record<string, unknown>[] }>();
const MAX_RAW_CHARACTERS = 64_000;
const revealed = ref(false);
const formatted = computed(() => {
  const raw = JSON.stringify(props.operations, null, 2);
  return raw.length <= MAX_RAW_CHARACTERS
    ? raw
    : `${raw.slice(0, MAX_RAW_CHARACTERS)}\n… 已截断`;
});

watch(
  () => props.operations,
  () => {
    revealed.value = false;
  },
);
</script>

<template>
  <section class="viewer-card raw-viewer" data-testid="a2ui-raw-viewer">
    <div class="viewer-heading">
      <div>
        <p class="eyebrow">A2UI RAW</p>
        <h3>只读协议检查器</h3>
      </div>
      <label class="reveal-control">
        <input v-model="revealed" type="checkbox" />
        显示原始数据
      </label>
    </div>
    <p class="security-note">
      原始操作默认隐藏，仅作为诊断文本查看；Workbench 不执行其中的代码。
    </p>
    <pre v-if="revealed" data-testid="a2ui-raw-content">{{ formatted }}</pre>
    <div v-else class="raw-placeholder">显式开启后才会显示，单次最多 64,000 字符。</div>
  </section>
</template>
