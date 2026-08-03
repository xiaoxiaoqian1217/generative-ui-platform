<script setup lang="ts">
import type { PresentationResult } from "@generative-ui/presentation-contract";
import type { RuntimeActionEnvelope } from "@generative-ui/runtime-contract";
import { computed } from "vue";
import { applyA2UIOperations } from "./a2ui.js";
import A2UISurfaceRenderer from "./A2UISurfaceRenderer.vue";

const props = defineProps<{ presentation: PresentationResult }>();
const emit = defineEmits<{ action: [action: RuntimeActionEnvelope] }>();
const surface = computed(() => {
  const presentation = props.presentation;
  if (
    presentation.status !== "completed" ||
    presentation.mode !== "generative-ui"
  )
    return undefined;
  const applied = applyA2UIOperations(new Map(), presentation.operations);
  return applied.success
    ? applied.surfaces.get(presentation.surfaceId)
    : undefined;
});
</script>

<template>
  <section v-if="surface" class="a2ui-renderer" data-testid="a2ui-renderer">
    <A2UISurfaceRenderer :surface="surface" @action="emit('action', $event)" />
  </section>
  <div v-else class="a2ui-fallback" data-testid="a2ui-fallback" role="status">A2UI 内容未能安全渲染。</div>
</template>
