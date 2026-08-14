<script setup lang="ts">
import { CopilotKitProvider, vueBasicCatalog } from "@copilotkit/vue/v2";
import { computed } from "vue";
import type { ObservationSink } from "../agent/business-agent-client.js";
import CopilotKitFrontendToolsBridge from "./CopilotKitFrontendToolsBridge.vue";

const props = defineProps<{
  agentId: string;
  a2uiEnabled: boolean;
  frontendToolsEnabled: boolean;
  locateDevice?: (deviceId: string) => string;
  observe?: ObservationSink | undefined;
  runtimeUrl: string;
}>();

const a2ui = { catalog: vueBasicCatalog };
const providerProps = computed(() =>
  props.a2uiEnabled
    ? { a2ui, runtimeUrl: props.runtimeUrl }
    : { runtimeUrl: props.runtimeUrl },
);
</script>

<template>
  <CopilotKitProvider v-bind="providerProps">
    <CopilotKitFrontendToolsBridge
      :agent-id="agentId"
      :enabled="frontendToolsEnabled"
      :locate-device="locateDevice"
      :observe="observe"
    />
    <slot />
  </CopilotKitProvider>
</template>
