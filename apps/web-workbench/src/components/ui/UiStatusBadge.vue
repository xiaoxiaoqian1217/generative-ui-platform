<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  label: string;
  variant?: "danger" | "info" | "neutral" | "success" | "warning" | undefined;
  weight?: number | undefined;
}>();

const rootStyle = computed(() =>
  props.weight === undefined ? undefined : { flexGrow: props.weight },
);
</script>

<template>
  <span
    class="ui-status-badge"
    data-testid="ui-status-badge"
    :data-variant="variant ?? 'neutral'"
    :style="rootStyle"
    >{{ label }}</span
  >
</template>
