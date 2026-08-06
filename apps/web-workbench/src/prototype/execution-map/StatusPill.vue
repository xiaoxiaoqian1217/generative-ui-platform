<script setup lang="ts">
// PROTOTYPE(issue-179)：共享状态徽标，仅服务原型变体。
import { computed } from "vue";
import {
  ARTIFACT_STATE_LABELS,
  STATUS_LABELS,
  type ArtifactState,
  type ProtoStatus,
} from "./model.js";

const props = defineProps<{
  status?: ProtoStatus;
  artifact?: ArtifactState;
}>();

const label = computed(() =>
  props.artifact !== undefined
    ? ARTIFACT_STATE_LABELS[props.artifact]
    : STATUS_LABELS[props.status ?? "ok"],
);
const tone = computed(() => props.artifact ?? props.status ?? "ok");
</script>

<template>
  <span class="proto-pill" :data-tone="tone">{{ label }}</span>
</template>

<style scoped>
.proto-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 8px;
  border-radius: 999px;
  border: 1px solid var(--line);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  white-space: nowrap;
  background: var(--paper-strong);
  color: var(--muted);
}

.proto-pill[data-tone="ok"],
.proto-pill[data-tone="inline"] {
  color: var(--green);
  border-color: color-mix(in srgb, var(--green) 40%, transparent);
  background: color-mix(in srgb, var(--green) 8%, white);
}

.proto-pill[data-tone="degraded"],
.proto-pill[data-tone="stored-ref"] {
  color: var(--amber);
  border-color: color-mix(in srgb, var(--amber) 45%, transparent);
  background: color-mix(in srgb, var(--amber) 10%, white);
}

.proto-pill[data-tone="failed"] {
  color: var(--red);
  border-color: color-mix(in srgb, var(--red) 45%, transparent);
  background: color-mix(in srgb, var(--red) 8%, white);
}

.proto-pill[data-tone="running"] {
  color: var(--accent-dark);
  border-color: color-mix(in srgb, var(--accent) 50%, transparent);
  background: color-mix(in srgb, var(--accent) 10%, white);
}

.proto-pill[data-tone="skipped"],
.proto-pill[data-tone="skipped-by-protection-limit"] {
  color: var(--muted);
  border-style: dashed;
  background: transparent;
}

.proto-pill[data-tone="unavailable"],
.proto-pill[data-tone="not-disclosable"] {
  color: var(--muted);
  border-color: var(--line);
  background: repeating-linear-gradient(
    -45deg,
    transparent 0 4px,
    rgb(102 114 112 / 12%) 4px 8px
  );
}
</style>
