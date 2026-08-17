<script setup lang="ts">
import type { ActivityMessage } from "@ag-ui/core";
import { useRenderActivityMessage } from "@copilotkit/vue/v2";
import { computed } from "vue";

const A2UI_GENERATION_ERROR_ACTIVITY_TYPE = "a2ui-generation-error";

/**
 * The explicit generation-failure payload emitted by the Runtime
 * presentation policy (Issue #210 Plain Content Fallback): the original
 * business content stays visible and this activity carries the error.
 */
interface A2uiGenerationErrorContent {
  readonly code?: "A2UI_GENERATION_FAILED" | "A2UI_GENERATION_UNAVAILABLE";
  readonly errors?: readonly string[];
  readonly message?: string;
}

const props = defineProps<{ message: ActivityMessage }>();
const { renderActivityMessage } = useRenderActivityMessage();
const activityRenderer = computed(() => renderActivityMessage(props.message));
const generationError = computed(() => {
  if (props.message.activityType !== A2UI_GENERATION_ERROR_ACTIVITY_TYPE)
    return undefined;
  const content = props.message.content;
  if (typeof content !== "object" || content === null) return undefined;
  const payload = content as A2uiGenerationErrorContent;
  return {
    code: payload.code ?? "A2UI_GENERATION_FAILED",
    detail:
      payload.errors?.join("; ") ??
      payload.message ??
      "The generated surface did not satisfy the catalog boundary.",
  };
});
</script>

<template>
  <section
    v-if="generationError"
    class="turn-failure"
    data-testid="a2ui-generation-error"
    role="alert"
  >
    <strong>{{ generationError.code }}</strong>
    <p>{{ generationError.detail }}</p>
  </section>
  <component
    v-else-if="activityRenderer"
    :is="activityRenderer.renderer"
    v-bind="activityRenderer.props"
  />
</template>
