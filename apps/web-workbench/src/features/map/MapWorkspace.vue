<script setup lang="ts">
import DeviceCard from "../../components/domain/DeviceCard.vue";
import type { Device } from "./devices.js";
import MapView from "./MapView.vue";

defineProps<{ selectedDevice: Device | undefined }>();
defineEmits<{ locateTestDevice: [] }>();
</script>

<template>
  <aside class="map-workspace" data-testid="map-workspace">
    <header class="map-workspace-header">
      <div>
        <p class="eyebrow">GIS WORKSPACE</p>
        <h2>设备态势</h2>
      </div>
      <button class="map-locate-button" type="button" @click="$emit('locateTestDevice')">
        定位测试设备
      </button>
    </header>
    <div class="map-surface">
      <MapView :selected-device="selectedDevice" />
      <div class="map-coordinate-chip">31.2304 N · 121.4737 E</div>
      <DeviceCard v-if="selectedDevice" :device="selectedDevice" />
    </div>
  </aside>
</template>
