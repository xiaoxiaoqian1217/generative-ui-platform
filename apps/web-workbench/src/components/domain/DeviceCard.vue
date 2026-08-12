<script setup lang="ts">
import { computed } from "vue";
import type { Device } from "../../features/map/devices.js";

const props = defineProps<{
  device: Device;
}>();

const statusLabel = computed(() =>
  props.device.status === "online" ? "在线" : "离线",
);
const coordinatesLabel = computed(() =>
  props.device.coordinates
    .map((coordinate) => coordinate.toFixed(4))
    .join(", "),
);
</script>

<template>
  <article class="device-card" data-testid="device-card">
    <header>
      <div>
        <p class="device-card-kicker">已选设备</p>
        <h3>{{ device.name }}</h3>
      </div>
      <span class="device-card-status" :data-status="device.status">
        {{ statusLabel }}
      </span>
    </header>
    <dl>
      <div><dt>设备</dt><dd>ID {{ device.deviceId }}</dd></div>
      <div><dt>电量</dt><dd>{{ device.batteryPercent }}%</dd></div>
      <div><dt>位置</dt><dd>{{ device.location }}</dd></div>
      <div><dt>坐标</dt><dd>{{ coordinatesLabel }}</dd></div>
    </dl>
  </article>
</template>
