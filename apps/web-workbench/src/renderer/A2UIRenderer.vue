<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import {
  type A2UIContent,
  applyA2UIOperations,
  destroySurface,
  type A2UISurface,
} from "./a2ui.js";
import type { RenderedA2UIAction } from "./a2ui.js";
import A2UISurfaceRenderer from "./A2UISurfaceRenderer.vue";

const props = withDefaults(
  defineProps<{ content: A2UIContent; readOnly?: boolean }>(),
  { readOnly: false },
);
const emit = defineEmits<{ action: [action: RenderedA2UIAction] }>();
const surfaces = ref<ReadonlyMap<string, A2UISurface>>(new Map());
const activeSurfaceId = ref<string>();
watch(
  () => props.content,
  (content) => {
    const applied = applyA2UIOperations(surfaces.value, content.operations);
    if (!applied.success) return;
    surfaces.value = applied.surfaces;
    activeSurfaceId.value = content.surfaceId;
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  if (activeSurfaceId.value)
    surfaces.value = destroySurface(surfaces.value, activeSurfaceId.value);
});
const surface = computed(() => {
  return surfaces.value.get(props.content.surfaceId);
});
</script>

<template>
  <section v-if="surface" class="a2ui-renderer" data-testid="a2ui-renderer">
    <A2UISurfaceRenderer
      :read-only="readOnly"
      :surface="surface"
      @action="emit('action', $event)"
    />
  </section>
  <div v-else class="a2ui-fallback" data-testid="a2ui-fallback" role="status">A2UI 内容未能安全渲染。</div>
</template>
