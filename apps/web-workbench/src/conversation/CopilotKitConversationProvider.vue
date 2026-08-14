<script setup lang="ts">
import { CopilotKitProvider } from "@copilotkit/vue/v2";
import type { ObservationSink } from "../agent/business-agent-client.js";
import CopilotKitFrontendToolsBridge from "./CopilotKitFrontendToolsBridge.vue";

defineProps<{
  agentId: string;
  frontendToolsEnabled: boolean;
  locateDevice?: (deviceId: string) => string;
  observe?: ObservationSink | undefined;
  runtimeUrl: string;
}>();
</script>

<template>
  <CopilotKitProvider :runtime-url="runtimeUrl">
    <CopilotKitFrontendToolsBridge
      :agent-id="agentId"
      :enabled="frontendToolsEnabled"
      :locate-device="locateDevice"
      :observe="observe"
    />
    <slot />
  </CopilotKitProvider>
</template>
