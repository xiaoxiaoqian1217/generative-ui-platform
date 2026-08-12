<script setup lang="ts">
import { CopilotKitProvider } from "@copilotkit/vue/v2";
import { ref } from "vue";
import type { Device } from "../map/devices.js";
// biome-ignore lint/style/useImportType: Vue renders this component from the template.
import FrontendToolAgentBridge from "./FrontendToolAgentBridge.vue";

defineProps<{ runtimeUrl: string }>();
const emit = defineEmits<{
  activityChange: [
    activity: { deviceId: string; status: "running" | "completed" | "failed" },
  ];
  deviceLocated: [device: Device];
}>();

const bridge = ref<InstanceType<typeof FrontendToolAgentBridge>>();

async function run(message: string): Promise<string> {
  if (bridge.value === undefined)
    throw new Error("AG_UI_MOCK_BRIDGE_UNAVAILABLE");
  return bridge.value.run(message);
}

function stop(): void {
  bridge.value?.stop();
}

defineExpose({ run, stop });
</script>

<template>
  <CopilotKitProvider :runtime-url="runtimeUrl">
    <FrontendToolAgentBridge
      ref="bridge"
      @activity-change="emit('activityChange', $event)"
      @device-located="emit('deviceLocated', $event)"
    />
  </CopilotKitProvider>
</template>
