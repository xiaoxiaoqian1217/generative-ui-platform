<script setup lang="ts">
import { CopilotKitProvider } from "@copilotkit/vue/v2";
import { computed } from "vue";
import type { ObservationSink } from "../agent/business-agent-client.js";
import { platformCatalog } from "../features/a2ui/catalog/platform-catalog.js";
import type {
  MapLayerRef,
  MapTargetRef,
} from "../features/map/map-operation.js";
import type { PatrolRouteConsultController } from "./patrol-route-consult.js";
import CopilotKitFrontendToolsBridge from "./CopilotKitFrontendToolsBridge.vue";

const props = defineProps<{
  agentId: string;
  a2uiEnabled: boolean;
  frontendToolsEnabled: boolean;
  focusOn?: (target: MapTargetRef) => string;
  highlight?: (targets: readonly MapTargetRef[]) => string;
  previewPath?: (
    target: MapTargetRef,
    toolCallId: string,
  ) => Promise<string> | string;
  patrolRouteConsult: PatrolRouteConsultController;
  setLayerVisibility?: (
    layer: MapLayerRef,
    visible: boolean,
  ) => Promise<string> | string;
  observe?: ObservationSink | undefined;
  runtimeUrl: string;
}>();

const a2ui = { catalog: platformCatalog };
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
      :focus-on="focusOn"
      :highlight="highlight"
      :preview-path="previewPath"
      :patrol-route-consult="patrolRouteConsult"
      :set-layer-visibility="setLayerVisibility"
      :observe="observe"
    />
    <slot />
  </CopilotKitProvider>
</template>
