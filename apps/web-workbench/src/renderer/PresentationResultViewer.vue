<script setup lang="ts">
import type { RuntimeRunResult } from "@generative-ui/runtime-contract";
import { computed } from "vue";
import { summarizePresentationResult } from "./presentation-summary.js";

const props = defineProps<{ result: RuntimeRunResult }>();
const presentation = computed(() => props.result.presentation);
const formatted = computed(() =>
  presentation.value === undefined
    ? ""
    : JSON.stringify(summarizePresentationResult(presentation.value), null, 2),
);
</script>

<template>
  <section class="viewer-card" data-testid="presentation-result-viewer">
    <div class="viewer-heading">
      <div>
        <p class="eyebrow">PresentationResult</p>
        <h3>受契约校验的安全摘要</h3>
      </div>
      <span v-if="presentation" class="result-mode">
        {{ "mode" in presentation ? presentation.mode : "error" }}
      </span>
    </div>
    <pre>{{ formatted }}</pre>
  </section>
</template>
