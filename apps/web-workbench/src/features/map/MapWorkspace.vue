<script setup lang="ts">
import DeviceCard from "../../components/domain/DeviceCard.vue";
import type { Device } from "./devices.js";
import MapView from "./MapView.vue";

defineProps<{
  selectedDevice: Device | undefined;
}>();

const emit = defineEmits<{
  locateDevice: [deviceId: string];
}>();
</script>

<template>
  <aside class="map-workspace" data-testid="map-workspace">
    <header class="map-workspace-header">
      <div>
        <p>GIS Workspace</p>
        <span>受控业务 Surface</span>
      </div>
      <button type="button" @click="emit('locateDevice', '01')">定位测试设备</button>
    </header>
    <div class="map-workspace-canvas">
      <MapView :selected-device="selectedDevice" />
      <DeviceCard v-if="selectedDevice !== undefined" :device="selectedDevice" />
    </div>
  </aside>
</template>
