<script setup lang="ts">
import { useCopilotKit, useFrontendTool } from "@copilotkit/vue/v2";
import { watchEffect } from "vue";
import { z } from "zod";
import {
  bindCopilotKitProviderCore,
  type ObservationSink,
} from "../agent/business-agent-client.js";

const props = defineProps<{
  agentId: string;
  enabled: boolean;
  locateDevice: ((deviceId: string) => string) | undefined;
  observe?: ObservationSink | undefined;
}>();

const { copilotkit } = useCopilotKit();

watchEffect((onCleanup) => {
  const unbind = bindCopilotKitProviderCore(copilotkit.value);
  onCleanup(unbind);
});

interface FrontendToolHandlerContextLike {
  toolCall: { id: string };
  signal?: AbortSignal;
}

// Issue #205：Frontend Tool 的浏览器侧 invocation / result 是 Workbench
// 真实可观察事实，通过 toolCallId 与 AG-UI TOOL_CALL_* 事件建立关联。
async function observeHandler<TArgs>(
  name: string,
  args: TArgs,
  context: FrontendToolHandlerContextLike,
  handler: () => Promise<unknown> | unknown,
): Promise<unknown> {
  const startedAt = globalThis.performance.now();
  props.observe?.({
    hasArtifact: true,
    payload: { args, name },
    source: "frontend-tool",
    toolCallId: context.toolCall.id,
    type: "FRONTEND_TOOL_INVOCATION",
  });
  try {
    const result = await handler();
    props.observe?.({
      durationMs: Math.round(globalThis.performance.now() - startedAt),
      hasArtifact: true,
      payload: { name, result },
      source: "frontend-tool",
      status: "ok",
      toolCallId: context.toolCall.id,
      type: "FRONTEND_TOOL_RESULT",
    });
    return result;
  } catch (error) {
    props.observe?.({
      durationMs: Math.round(globalThis.performance.now() - startedAt),
      hasArtifact: true,
      payload: {
        message: error instanceof Error ? error.message : "handler failed",
        name,
      },
      source: "frontend-tool",
      status: "failed",
      toolCallId: context.toolCall.id,
      type: "FRONTEND_TOOL_RESULT",
    });
    throw error;
  }
}

useFrontendTool({
  name: "show_workbench_status",
  description:
    "Return the current Web Workbench frontend status from the browser. Use this only when the user asks to verify frontend connectivity or Workbench status.",
  agentId: props.agentId,
  available: props.enabled,
  handler: async (args, context) => {
    context.signal?.throwIfAborted();
    return observeHandler("show_workbench_status", args, context, () =>
      JSON.stringify({
        capability: "frontend-tool",
        path: window.location.pathname,
        status: "connected",
        surface: "web-workbench",
      }),
    );
  },
});

useFrontendTool({
  name: "locateDevice",
  description:
    "Locate a business device on the GIS workspace by its device ID. The browser owns the map implementation.",
  parameters: z.object({ deviceId: z.string().min(1) }).strict(),
  agentId: props.agentId,
  available: props.enabled,
  handler: async ({ deviceId }, context) => {
    context.signal?.throwIfAborted();
    return observeHandler(
      "locateDevice",
      { deviceId },
      context,
      () =>
        props.locateDevice?.(deviceId) ??
        JSON.stringify({
          code: "LOCATE_DEVICE_UNAVAILABLE",
          status: "unavailable",
        }),
    );
  },
});
</script>

<template>
  <span hidden data-copilotkit-frontend-tools="ready" />
</template>
