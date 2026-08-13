<script setup lang="ts">
import { computed } from "vue";
import {
  type InspectableOutput,
  summarizeInspectableOutput,
} from "./presentation-summary.js";

const props = defineProps<{ output: InspectableOutput }>();
const formatted = computed(() =>
  JSON.stringify(summarizeInspectableOutput(props.output), null, 2),
);
</script>

<template>
  <section class="viewer-card" data-testid="agent-output-viewer">
    <div class="viewer-heading">
      <div>
        <p class="eyebrow">Agent output</p>
        <h3>受控内容摘要</h3>
      </div>
      <span class="result-mode">
        {{ "mode" in output ? output.mode : "error" }}
      </span>
    </div>
    <pre>{{ formatted }}</pre>
  </section>
</template>
