<script setup lang="ts">
import { useCopilotKit, useFrontendTool } from "@copilotkit/vue/v2";
import { watchEffect } from "vue";
import { z } from "zod";
import { bindCopilotKitProviderCore } from "../agent/business-agent-client.js";

const props = defineProps<{
  locateDevice: ((deviceId: string) => string) | undefined;
}>();

const { copilotkit } = useCopilotKit();

watchEffect((onCleanup) => {
  const unbind = bindCopilotKitProviderCore(copilotkit.value);
  onCleanup(unbind);
});

useFrontendTool({
  name: "show_workbench_status",
  description:
    "Return the current Web Workbench frontend status from the browser. Use this only when the user asks to verify frontend connectivity or Workbench status.",
  agentId: "default",
  handler: async (_args, { signal }) => {
    signal?.throwIfAborted();
    return JSON.stringify({
      capability: "frontend-tool",
      path: window.location.pathname,
      status: "connected",
      surface: "web-workbench",
    });
  },
});

useFrontendTool({
  name: "locateDevice",
  description:
    "Locate a business device on the GIS workspace by its device ID. The browser owns the map implementation.",
  parameters: z.object({ deviceId: z.string().min(1) }).strict(),
  agentId: "default",
  handler: async ({ deviceId }, { signal }) => {
    signal?.throwIfAborted();
    return (
      props.locateDevice?.(deviceId) ??
      JSON.stringify({
        code: "LOCATE_DEVICE_UNAVAILABLE",
        status: "unavailable",
      })
    );
  },
});
</script>

<template>
  <span hidden data-copilotkit-frontend-tools="ready" />
</template>
