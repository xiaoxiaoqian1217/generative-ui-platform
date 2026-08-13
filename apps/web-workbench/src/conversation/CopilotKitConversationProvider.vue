<script setup lang="ts">
import { CopilotKitProvider } from "@copilotkit/vue/v2";
import CopilotKitFrontendToolsBridge from "./CopilotKitFrontendToolsBridge.vue";

defineProps<{
  agentId: string;
  frontendToolsEnabled: boolean;
  locateDevice?: (deviceId: string) => string;
  runtimeUrl: string;
}>();
</script>

<template>
  <CopilotKitProvider :runtime-url="runtimeUrl">
    <CopilotKitFrontendToolsBridge
      :agent-id="agentId"
      :enabled="frontendToolsEnabled"
      :locate-device="locateDevice"
    />
    <slot />
  </CopilotKitProvider>
</template>
