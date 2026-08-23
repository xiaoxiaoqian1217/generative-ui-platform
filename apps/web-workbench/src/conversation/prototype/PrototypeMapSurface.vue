<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import MapWorkspace from "../../features/map/MapWorkspace.vue";
import {
  findMapTarget,
  MAP_PATROL_SCENARIO,
  type MapTarget,
} from "../../features/map/map-targets.js";

const props = defineProps<{
  completedCount: number;
}>();

const mapCompletedCount = ref(0);
const surfaceKey = ref(0);
let mapReadyTimer: number | undefined;

function applyMapStateAfterLoad(): void {
  if (mapReadyTimer !== undefined) window.clearTimeout(mapReadyTimer);
  mapReadyTimer = window.setTimeout(() => {
    mapCompletedCount.value = props.completedCount;
    mapReadyTimer = undefined;
  }, 1_000);
}

function requireTarget(target: Parameters<typeof findMapTarget>[0]): MapTarget {
  const resolved = findMapTarget(target);
  if (resolved === undefined)
    throw new Error("Prototype map target is missing.");
  return resolved;
}

const corridor = requireTarget(MAP_PATROL_SCENARIO.corridor);
const observationTargets =
  MAP_PATROL_SCENARIO.observationTargets.map(requireTarget);
const route = requireTarget(MAP_PATROL_SCENARIO.pathA);

const visibleLayerIds = computed(() =>
  mapCompletedCount.value >= 1
    ? [MAP_PATROL_SCENARIO.constraintsLayer.layerId]
    : [],
);
const focusedTarget = computed(() =>
  mapCompletedCount.value >= 2 ? corridor : undefined,
);
const highlightedTargets = computed(() =>
  mapCompletedCount.value >= 3 ? observationTargets : [],
);
const previewedPath = computed(() =>
  mapCompletedCount.value >= 4 ? route : undefined,
);

onMounted(() => {
  // MapLibre installs the operational layers asynchronously after the style load.
  applyMapStateAfterLoad();
});

watch(
  () => props.completedCount,
  (completedCount, previousCompletedCount) => {
    if (completedCount < previousCompletedCount) {
      mapCompletedCount.value = 0;
      surfaceKey.value += 1;
      applyMapStateAfterLoad();
      return;
    }
    if (mapReadyTimer === undefined) mapCompletedCount.value = completedCount;
  },
);

onBeforeUnmount(() => {
  if (mapReadyTimer !== undefined) window.clearTimeout(mapReadyTimer);
});
</script>

<template>
  <div class="prototype-map-surface">
    <MapWorkspace
      :key="surfaceKey"
      :focused-target="focusedTarget"
      :highlighted-targets="highlightedTargets"
      :previewed-path="previewedPath"
      :selected-device="undefined"
      :visible-layer-ids="visibleLayerIds"
    />
    <slot />
  </div>
</template>

<style scoped>
.prototype-map-surface {
  position: relative;
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  background: #edf0e9;
}

.prototype-map-surface :deep(.map-workspace) {
  width: 100%;
  min-width: 0;
  height: 100%;
  border-left: 0;
}
</style>
