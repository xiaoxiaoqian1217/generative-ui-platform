<script setup lang="ts">
import type { Device } from "../../features/map/devices.js";

defineProps<{ device: Device }>();
</script>

<template>
  <article class="device-card" data-testid="device-card">
    <div class="device-card-heading">
      <div>
        <p class="eyebrow">SELECTED DEVICE</p>
        <h3>{{ device.name }}</h3>
      </div>
      <span class="device-status" :data-status="device.status">
        {{ device.status === "online" ? "在线" : "离线" }}
      </span>
    </div>
    <dl>
      <div><dt>设备 ID</dt><dd>{{ device.id }}</dd></div>
      <div><dt>电量</dt><dd>{{ device.batteryPercent }}%</dd></div>
      <div><dt>位置</dt><dd>{{ device.location }}</dd></div>
      <div>
        <dt>坐标</dt>
        <dd>{{ device.coordinates[1].toFixed(4) }}, {{ device.coordinates[0].toFixed(4) }}</dd>
      </div>
    </dl>
  </article>
</template>
