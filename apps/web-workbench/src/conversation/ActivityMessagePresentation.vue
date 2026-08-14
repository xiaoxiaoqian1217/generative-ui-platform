<script setup lang="ts">
import type { ActivityMessage } from "@ag-ui/core";
import { useRenderActivityMessage } from "@copilotkit/vue/v2";
import { computed } from "vue";

const props = defineProps<{ message: ActivityMessage }>();
const { renderActivityMessage } = useRenderActivityMessage();
const activityRenderer = computed(() => renderActivityMessage(props.message));
</script>

<template>
  <component
    :is="activityRenderer.renderer"
    v-if="activityRenderer"
    v-bind="activityRenderer.props"
  />
</template>
