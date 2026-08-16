<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  label: string;
  value: number | string;
  emphasis?: "default" | "strong" | undefined;
  trend?: "down" | "flat" | "up" | undefined;
  weight?: number | undefined;
}>();

const trendMarkers = { down: "↓", flat: "→", up: "↑" } as const;

const trendMarker = computed(() =>
  props.trend === undefined ? undefined : trendMarkers[props.trend],
);
const rootStyle = computed(() =>
  props.weight === undefined ? undefined : { flexGrow: props.weight },
);
</script>

<template>
  <div
    class="ui-metric"
    data-testid="ui-metric"
    :data-emphasis="emphasis ?? 'default'"
    :style="rootStyle"
  >
    <span class="ui-metric-label">{{ label }}</span>
    <span class="ui-metric-value">
      {{ value }}
      <span
        v-if="trendMarker !== undefined"
        class="ui-metric-trend"
        :data-trend="trend"
        >{{ trendMarker }}</span
      >
    </span>
  </div>
</template>
