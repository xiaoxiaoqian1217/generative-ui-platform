<script setup lang="ts">
// PROTOTYPE(issue-179)：六类诊断场景切换条。
import { PROTOTYPE_SCENARIOS } from "./model.js";

defineProps<{ current: string }>();
const emit = defineEmits<{ select: [id: string] }>();
</script>

<template>
  <div class="scenario-bar">
    <span class="scenario-bar-label">诊断场景</span>
    <button
      v-for="scenario in PROTOTYPE_SCENARIOS"
      :key="scenario.id"
      type="button"
      :class="{ active: current === scenario.id }"
      :title="scenario.description"
      @click="emit('select', scenario.id)"
    >
      {{ scenario.label }}
    </button>
  </div>
</template>

<style scoped>
.scenario-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 14px;
}

.scenario-bar-label {
  margin-right: 6px;
  color: var(--muted);
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.14em;
}

button {
  padding: 4px 12px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--paper-strong);
  color: var(--ink);
  font-size: 0.78rem;
  cursor: pointer;
}

button:hover {
  border-color: var(--accent);
}

button.active {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, white);
  color: var(--accent-dark);
  font-weight: 700;
}
</style>
