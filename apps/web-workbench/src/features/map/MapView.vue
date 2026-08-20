<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { Device } from "./devices.js";
import { TEST_DEVICES } from "./devices.js";
import {
  createMapController,
  type MapController,
  type MapViewportState,
} from "./map-controller.js";
import type { MapTarget } from "./map-targets.js";

const props = defineProps<{
  focusedTarget: MapTarget | undefined;
  highlightedTargets: readonly MapTarget[];
  previewedPath: MapTarget | undefined;
  selectedDevice: Device | undefined;
  visibleLayerIds: readonly string[];
}>();

const mapContainer = ref<HTMLElement>();
const appliedFocusedTarget = ref<MapTarget>();
const appliedHighlightedTargets = ref<readonly MapTarget[]>([]);
const appliedPreviewedPath = ref<MapTarget>();
const appliedSelectedDeviceId = ref<string>();
const appliedVisibleLayerIds = ref<readonly string[]>([]);
const appliedViewport = ref<MapViewportState>();
let controller: MapController | undefined;
let resizeObserver: ResizeObserver | undefined;

function requireController(): MapController {
  if (controller === undefined) throw new Error("Map surface is not ready.");
  return controller;
}

function focusOn(target: MapTarget): void {
  const viewport = requireController().focusOn(target);
  appliedFocusedTarget.value = target;
  appliedViewport.value = viewport;
}

function highlight(targets: readonly MapTarget[]): void {
  requireController().highlight(targets);
  appliedHighlightedTargets.value = targets;
}

async function previewPath(target: MapTarget): Promise<void> {
  await requireController().previewPath(target);
  appliedPreviewedPath.value = target;
}

function selectDevice(device: Device | undefined): void {
  requireController().selectDevice(device);
  appliedSelectedDeviceId.value = device?.deviceId;
}

async function setLayerVisibility(
  layerId: string,
  visible: boolean,
): Promise<void> {
  await requireController().setLayerVisibility(layerId, visible);
  appliedVisibleLayerIds.value = visible
    ? [...new Set([...appliedVisibleLayerIds.value, layerId])]
    : appliedVisibleLayerIds.value.filter((candidate) => candidate !== layerId);
}

function sameTarget(
  first: MapTarget | undefined,
  second: MapTarget | undefined,
): boolean {
  return (
    first?.featureId === second?.featureId &&
    first?.layerId === second?.layerId &&
    first?.coordinates[0] === second?.coordinates[0] &&
    first?.coordinates[1] === second?.coordinates[1] &&
    first?.zoom === second?.zoom
  );
}

function sameTargets(
  first: readonly MapTarget[],
  second: readonly MapTarget[],
): boolean {
  return (
    first.length === second.length &&
    first.every((target, index) => sameTarget(target, second[index]))
  );
}

defineExpose({
  focusOn,
  highlight,
  previewPath,
  selectDevice,
  setLayerVisibility,
});

onMounted(() => {
  if (mapContainer.value === undefined) return;
  controller = createMapController(mapContainer.value, TEST_DEVICES);
  resizeObserver = new ResizeObserver(() => controller?.resize());
  resizeObserver.observe(mapContainer.value);
  selectDevice(props.selectedDevice);
  if (props.focusedTarget !== undefined) focusOn(props.focusedTarget);
  highlight(props.highlightedTargets);
  for (const layerId of props.visibleLayerIds)
    void setLayerVisibility(layerId, true);
  if (props.previewedPath !== undefined) void previewPath(props.previewedPath);
});

watch(
  () => props.selectedDevice,
  (device) => {
    if (device?.deviceId !== appliedSelectedDeviceId.value)
      selectDevice(device);
  },
);

watch(
  () => props.previewedPath,
  (target) => {
    if (target !== undefined && !sameTarget(target, appliedPreviewedPath.value))
      void previewPath(target);
  },
);

watch(
  () => props.visibleLayerIds,
  (layerIds) => {
    const expected = new Set(layerIds);
    const applied = new Set(appliedVisibleLayerIds.value);
    for (const layerId of new Set([...expected, ...applied])) {
      if (expected.has(layerId) !== applied.has(layerId))
        void setLayerVisibility(layerId, expected.has(layerId));
    }
  },
);

watch(
  () => props.focusedTarget,
  (target) => {
    if (target !== undefined && !sameTarget(target, appliedFocusedTarget.value))
      focusOn(target);
  },
);

watch(
  () => props.highlightedTargets,
  (targets) => {
    if (!sameTargets(targets, appliedHighlightedTargets.value))
      highlight(targets);
  },
);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  controller?.destroy();
  controller = undefined;
});
</script>

<template>
  <div
    ref="mapContainer"
    class="map-view"
    :data-center="appliedViewport?.center.join(',')"
    :data-focused-feature-id="appliedFocusedTarget?.featureId"
    :data-highlighted-feature-ids="
      appliedHighlightedTargets.map((target) => target.featureId).join(',')
    "
    :data-previewed-path-feature-id="appliedPreviewedPath?.featureId"
    :data-visible-layer-ids="appliedVisibleLayerIds.join(',')"
    :data-zoom="appliedViewport?.zoom"
    data-testid="map-view"
  />
</template>
