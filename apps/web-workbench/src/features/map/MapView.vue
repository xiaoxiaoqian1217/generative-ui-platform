<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { DEVICES, type Device } from "./devices.js";
import { createMapController, type MapController } from "./map-controller.js";

const props = defineProps<{
  selectedDevice: Device | undefined;
}>();

const container = ref<HTMLElement>();
let controller: MapController | undefined;

onMounted(() => {
  if (container.value === undefined) return;
  controller = createMapController({
    container: container.value,
    devices: DEVICES,
  });
  if (props.selectedDevice !== undefined)
    controller.locateDevice(props.selectedDevice);
});

watch(
  () => props.selectedDevice,
  (device) => {
    if (device !== undefined) controller?.locateDevice(device);
  },
);

onBeforeUnmount(() => controller?.destroy());
</script>

<template>
  <div ref="container" class="map-canvas" data-testid="map-canvas"></div>
</template>
