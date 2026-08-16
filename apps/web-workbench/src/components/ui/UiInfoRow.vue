<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  label: string;
  value: number | string;
  weight?: number | undefined;
}>();

const rootStyle = computed(() =>
  props.weight === undefined ? undefined : { flexGrow: props.weight },
);
</script>

<template>
  <div
    class="ui-info-row"
    data-testid="ui-info-row"
    :style="rootStyle"
  >
    <span class="ui-info-row-label">{{ label }}</span>
    <span class="ui-info-row-value">{{ value }}</span>
  </div>
</template>
