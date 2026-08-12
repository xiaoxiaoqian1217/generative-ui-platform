<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { Device } from "./devices.js";
import { TEST_DEVICES } from "./devices.js";
import { createMapController, type MapController } from "./map-controller.js";

const props = defineProps<{
  selectedDevice: Device | undefined;
}>();

const mapContainer = ref<HTMLElement>();
let controller: MapController | undefined;
let resizeObserver: ResizeObserver | undefined;

onMounted(() => {
  if (mapContainer.value === undefined) return;
  controller = createMapController(mapContainer.value, TEST_DEVICES);
  resizeObserver = new ResizeObserver(() => controller?.resize());
  resizeObserver.observe(mapContainer.value);
  controller.selectDevice(props.selectedDevice);
});

watch(
  () => props.selectedDevice,
  (device) => controller?.selectDevice(device),
);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  controller?.destroy();
  controller = undefined;
});
</script>

<template>
  <div ref="mapContainer" class="map-view" data-testid="map-view" />
</template>
