<script setup lang="ts">
import type { PresentationResult } from "@generative-ui/presentation-contract";
import type { RuntimeActionEnvelope } from "@generative-ui/runtime-contract";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import {
  applyA2UIOperations,
  destroySurface,
  type A2UISurface,
} from "./a2ui.js";
import A2UISurfaceRenderer from "./A2UISurfaceRenderer.vue";

const props = defineProps<{ presentation: PresentationResult }>();
const emit = defineEmits<{ action: [action: RuntimeActionEnvelope] }>();
const surfaces = ref<ReadonlyMap<string, A2UISurface>>(new Map());
const activeSurfaceId = ref<string>();
watch(
  () => props.presentation,
  (presentation) => {
    if (
      presentation.status !== "completed" ||
      presentation.mode !== "generative-ui"
    )
      return;
    const applied = applyA2UIOperations(
      surfaces.value,
      presentation.operations,
    );
    if (!applied.success) return;
    surfaces.value = applied.surfaces;
    activeSurfaceId.value = presentation.surfaceId;
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  if (activeSurfaceId.value)
    surfaces.value = destroySurface(surfaces.value, activeSurfaceId.value);
});
const surface = computed(() => {
  const presentation = props.presentation;
  if (
    presentation.status !== "completed" ||
    presentation.mode !== "generative-ui"
  )
    return undefined;
  return surfaces.value.get(presentation.surfaceId);
});
</script>

<template>
  <section v-if="surface" class="a2ui-renderer" data-testid="a2ui-renderer">
    <A2UISurfaceRenderer :surface="surface" @action="emit('action', $event)" />
  </section>
  <div v-else class="a2ui-fallback" data-testid="a2ui-fallback" role="status">A2UI 内容未能安全渲染。</div>
</template>
