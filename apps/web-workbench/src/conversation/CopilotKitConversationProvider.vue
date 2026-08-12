<script setup lang="ts">
import { CopilotKitProvider } from "@copilotkit/vue/v2";
import CopilotKitFrontendToolsBridge from "./CopilotKitFrontendToolsBridge.vue";

defineProps<{
  runtimeUrl: string;
}>();
</script>

<template>
  <CopilotKitProvider :runtime-url="runtimeUrl">
    <CopilotKitFrontendToolsBridge />
    <slot />
  </CopilotKitProvider>
</template>
