<script setup lang="ts">
import {
  useCopilotKit,
  useFrontendTool,
  useHumanInTheLoop,
  type VueHumanInTheLoopRenderProps,
} from "@copilotkit/vue/v2";
import { h, watchEffect } from "vue";
import { z } from "zod";
import {
  bindCopilotKitProviderCore,
  type ObservationSink,
} from "../agent/business-agent-client.js";
import type {
  MapLayerRef,
  MapTargetRef,
} from "../features/map/map-operation.js";
import PatrolRouteConsultHost from "./PatrolRouteConsultHost.vue";
import {
  PATROL_ROUTE_CONSULT_TOOL,
  patrolRouteConsultRequestSchema,
  type PatrolRouteConsultController,
  type PatrolRouteConsultRequest,
} from "./patrol-route-consult.js";

const props = defineProps<{
  agentId: string;
  enabled: boolean;
  focusOn: ((target: MapTargetRef) => string) | undefined;
  highlight: ((targets: readonly MapTargetRef[]) => string) | undefined;
  previewPath:
    | ((target: MapTargetRef, toolCallId: string) => Promise<string> | string)
    | undefined;
  patrolRouteConsult: PatrolRouteConsultController;
  setLayerVisibility:
    | ((layer: MapLayerRef, visible: boolean) => Promise<string> | string)
    | undefined;
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

const E2E_HANG_FOCUS_ON_KEY = "generative-ui.workbench.e2e.hang-focus-on";

async function hangE2eFocusOnUntilAbort(
  signal: AbortSignal | undefined,
): Promise<void> {
  if (
    import.meta.env.MODE !== "test" ||
    window.localStorage.getItem(E2E_HANG_FOCUS_ON_KEY) !== "true"
  )
    return;
  await new Promise<void>((_resolve, reject) => {
    const abort = () =>
      reject(
        signal?.reason ??
          new DOMException(
            "Frontend Tool execution was aborted.",
            "AbortError",
          ),
      );
    if (signal?.aborted === true) {
      abort();
      return;
    }
    signal?.addEventListener("abort", abort, { once: true });
  });
}

function toMapTargetRef(target: {
  featureId: string;
  layerId?: string | undefined;
}): MapTargetRef {
  return {
    featureId: target.featureId,
    ...(target.layerId === undefined ? {} : { layerId: target.layerId }),
  };
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

const mapTargetRefSchema = z
  .object({
    featureId: z.string().min(1),
    layerId: z.string().min(1).optional(),
  })
  .strict();

type PatrolRouteConsultRenderProps =
  VueHumanInTheLoopRenderProps<PatrolRouteConsultRequest> & {
    readonly toolCallId?: string;
  };

useHumanInTheLoop({
  name: PATROL_ROUTE_CONSULT_TOOL,
  description:
    "Ask the user to compare and select one of the two existing patrol routes, cancel, or provide a short revision instruction.",
  parameters: patrolRouteConsultRequestSchema,
  agentId: props.agentId,
  available: props.enabled,
  render: (renderProps: PatrolRouteConsultRenderProps) =>
    h(PatrolRouteConsultHost, {
      ...renderProps,
      cancelConsultPreview: props.patrolRouteConsult.cancelPreview,
      completeConsult: props.patrolRouteConsult.complete,
      invalidateConsult: props.patrolRouteConsult.invalidate,
      isConsultActive: props.patrolRouteConsult.isActive,
      markConsultActive: props.patrolRouteConsult.markActive,
      previewOption: props.patrolRouteConsult.previewOption,
      toolCallId: renderProps.toolCallId ?? "unknown-consult",
    }),
});

useFrontendTool({
  name: "focusOn",
  description:
    "Focus the persistent map viewport on one addressable map feature. Use map feature references only.",
  parameters: z.object({ target: mapTargetRefSchema }).strict(),
  agentId: props.agentId,
  available: props.enabled,
  handler: async ({ target }, context) => {
    context.signal?.throwIfAborted();
    return observeHandler("focusOn", { target }, context, async () => {
      await hangE2eFocusOnUntilAbort(context.signal);
      return (
        props.focusOn?.(toMapTargetRef(target)) ??
        JSON.stringify({
          affectedFeatureIds: [],
          reason: "Map focus capability is unavailable.",
          status: "failed",
        })
      );
    });
  },
});

useFrontendTool({
  name: "highlight",
  description:
    "Highlight one or more addressable features on the persistent map surface. Use map feature references only.",
  parameters: z
    .object({ targets: z.array(mapTargetRefSchema).min(1) })
    .strict(),
  agentId: props.agentId,
  available: props.enabled,
  handler: async ({ targets }, context) => {
    context.signal?.throwIfAborted();
    return observeHandler(
      "highlight",
      { targets },
      context,
      () =>
        props.highlight?.(targets.map(toMapTargetRef)) ??
        JSON.stringify({
          affectedFeatureIds: [],
          reason: "Map highlight capability is unavailable.",
          status: "failed",
        }),
    );
  },
});

useFrontendTool({
  name: "setLayerVisibility",
  description:
    "Show or hide one existing map layer by its stable map layer reference. This does not create or style layers.",
  parameters: z
    .object({
      layer: z.object({ layerId: z.string().min(1) }).strict(),
      visible: z.boolean(),
    })
    .strict(),
  agentId: props.agentId,
  available: props.enabled,
  handler: async ({ layer, visible }, context) => {
    context.signal?.throwIfAborted();
    return observeHandler(
      "setLayerVisibility",
      { layer, visible },
      context,
      () =>
        props.setLayerVisibility?.({ layerId: layer.layerId }, visible) ??
        JSON.stringify({
          affectedLayerIds: [],
          reason: "Map layer visibility capability is unavailable.",
          status: "failed",
        }),
    );
  },
});

useFrontendTool({
  name: "previewPath",
  description:
    "Preview one existing path feature on the persistent map. A new preview replaces the previous Agent path preview and does not calculate or commit a route.",
  parameters: z.object({ target: mapTargetRefSchema }).strict(),
  agentId: props.agentId,
  available: props.enabled,
  handler: async ({ target }, context) => {
    context.signal?.throwIfAborted();
    return observeHandler(
      "previewPath",
      { target },
      context,
      () =>
        props.previewPath?.(toMapTargetRef(target), context.toolCall.id) ??
        JSON.stringify({
          affectedFeatureIds: [],
          reason: "Map path preview capability is unavailable.",
          status: "failed",
        }),
    );
  },
});
</script>

<template>
  <span hidden data-copilotkit-frontend-tools="ready" />
</template>
