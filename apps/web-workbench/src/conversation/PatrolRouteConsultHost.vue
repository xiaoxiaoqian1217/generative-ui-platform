<script setup lang="ts">
import type { ToolCallStatus } from "@copilotkit/core";
import PatrolRouteConsultCard from "./PatrolRouteConsultCard.vue";
import PatrolRouteConsultSlim from "./PatrolRouteConsultSlim.vue";
import { consultVariant } from "./consult-variant.js";
import type {
  PatrolRouteConsultRequest,
  PatrolRouteOption,
} from "./patrol-route-consult.js";

/**
 * PROTOTYPE host: routes the Human-in-the-loop render to the current consult
 * interaction variant. Variant A is the unchanged production card.
 */
const props = defineProps<{
  args: Partial<PatrolRouteConsultRequest>;
  cancelConsultPreview: (toolCallId: string) => Promise<void>;
  completeConsult: (toolCallId: string) => void;
  invalidateConsult: (toolCallId: string) => void;
  isConsultActive: (toolCallId: string) => boolean;
  markConsultActive: (toolCallId: string) => void;
  previewOption: (
    toolCallId: string,
    option: PatrolRouteOption,
  ) => Promise<void>;
  respond?: ((result: unknown) => Promise<void>) | undefined;
  result?: string | undefined;
  status: ToolCallStatus;
  toolCallId: string;
}>();
</script>

<template>
  <PatrolRouteConsultSlim
    v-if="consultVariant !== 'a'"
    :args="props.args"
    :cancel-consult-preview="props.cancelConsultPreview"
    :complete-consult="props.completeConsult"
    :invalidate-consult="props.invalidateConsult"
    :is-consult-active="props.isConsultActive"
    :mark-consult-active="props.markConsultActive"
    :respond="props.respond"
    :result="props.result"
    :status="props.status"
    :tool-call-id="props.toolCallId"
    :variant="consultVariant"
  />
  <PatrolRouteConsultCard v-else v-bind="props" />
</template>
