<script setup lang="ts">
import { CopilotKitProvider } from "@copilotkit/vue/v2";
import CopilotKitFrontendToolsBridge from "./CopilotKitFrontendToolsBridge.vue";

defineProps<{
  locateDevice?: (deviceId: string) => string;
  runtimeUrl: string;
}>();
</script>

<template>
  <CopilotKitProvider :runtime-url="runtimeUrl">
    <CopilotKitFrontendToolsBridge :locate-device="locateDevice" />
    <slot />
  </CopilotKitProvider>
</template>
