<script setup lang="ts">
import type { ConversationTurn } from "./conversation-store.js";
import { computed } from "vue";
import A2UIRenderer from "../renderer/A2UIRenderer.vue";
import type { RenderedRuntimeAction } from "../renderer/a2ui.js";
import MarkdownRenderer from "../renderer/MarkdownRenderer.vue";

const props = defineProps<{
  actionsDisabled?: boolean;
  turn: ConversationTurn;
}>();
const emit = defineEmits<{
  action: [action: RenderedRuntimeAction];
  retry: [turnId: string];
}>();

const markdown = computed(() => {
  const presentation = props.turn.presentation;
  if (
    presentation === undefined ||
    !("mode" in presentation) ||
    presentation.mode !== "markdown"
  )
    return undefined;
  return presentation.markdown;
});

const failureSummary = computed(() => {
  if (props.turn.status === "cancelled") return "请求已取消。";
  if (props.turn.failure?.code === "WORKBENCH_REQUEST_TIMEOUT")
    return "请求超时，请重试。";
  return "请求未能完成。请在 Inspect 中查看诊断信息。";
});
</script>

<template>
  <section
    v-if="turn.failure"
    class="turn-failure"
    data-testid="turn-failure"
    role="status"
  >
    <strong>{{ turn.failure.code }}</strong>
    <p>{{ failureSummary }}</p>
    <button
      v-if="turn.failure.retryable && turn.status !== 'cancelled'"
      class="secondary-button"
      type="button"
      @click="emit('retry', turn.turnId)"
    >
      重试
    </button>
  </section>

  <div
    v-if="markdown !== undefined"
    class="assistant-markdown"
  >
    <MarkdownRenderer :markdown="markdown" />
  </div>

  <div
    v-for="surface in turn.businessSurfaces"
    :key="surface.surfaceId"
    class="inline-business-surface"
    :data-surface-status="surface.status"
    data-testid="inline-business-surface"
  >
    <A2UIRenderer
      :presentation="surface.presentation"
      :read-only="surface.status === 'historical' || actionsDisabled"
      @action="emit('action', $event)"
    />
  </div>
</template>

