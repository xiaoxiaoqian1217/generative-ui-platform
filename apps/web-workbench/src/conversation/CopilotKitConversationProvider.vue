<script setup lang="ts">
import { CopilotKitProvider } from "@copilotkit/vue/v2";

defineProps<{
  runtimeUrl: string;
}>();
</script>

<template>
  <CopilotKitProvider :runtime-url="runtimeUrl">
    <slot />
  </CopilotKitProvider>
</template>
