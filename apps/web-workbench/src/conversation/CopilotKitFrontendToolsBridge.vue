<script setup lang="ts">
import { watchEffect } from "vue";
import { useCopilotKit, useFrontendTool } from "@copilotkit/vue/v2";
import { bindCopilotKitProviderCore } from "../agent/business-agent-client.js";

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
</script>

<template>
  <span hidden data-copilotkit-frontend-tools="ready" />
</template>
