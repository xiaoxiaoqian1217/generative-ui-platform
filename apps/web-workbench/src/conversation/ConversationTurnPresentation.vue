<script setup lang="ts">
import type { AssistantMessage, Message } from "@ag-ui/core";
import type { ConversationTurn } from "./conversation-store.js";
import { computed } from "vue";
import { CopilotChatAssistantMessage } from "@copilotkit/vue/v2";
import A2UIRenderer from "../renderer/A2UIRenderer.vue";
import A2UIRawViewer from "../renderer/A2UIRawViewer.vue";
import type { RenderedRuntimeAction } from "../renderer/a2ui.js";
import MarkdownRenderer from "../renderer/MarkdownRenderer.vue";

const props = defineProps<{
  actionsDisabled?: boolean;
  messages: readonly Message[];
  turn: ConversationTurn;
}>();
const emit = defineEmits<{
  action: [action: RenderedRuntimeAction];
  retry: [turnId: string];
}>();

const markdownMessage = computed<AssistantMessage | undefined>(() => {
  const presentation = props.turn.presentation;
  if (
    presentation === undefined ||
    !("mode" in presentation) ||
    presentation.mode !== "markdown"
  )
    return undefined;
  return {
    content: presentation.markdown,
    id: `${props.turn.turnId}:assistant`,
    role: "assistant",
  };
});
const markdown = computed(() => markdownMessage.value?.content);
const failureSummary = computed(() => {
  if (props.turn.status === "cancelled") return "请求已取消。";
  if (props.turn.failure?.code === "WORKBENCH_REQUEST_TIMEOUT")
    return "请求超时，请重试。";
  return "请求未能完成。请在 Inspect 中查看诊断信息。";
});

function surfaceMessage(surfaceId: string): AssistantMessage {
  return {
    content: "",
    id: `${props.turn.turnId}:assistant:${surfaceId}`,
    role: "assistant",
  };
}
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

  <A2UIRawViewer
    v-if="turn.historicalSnapshotRaw !== undefined"
    :value="turn.historicalSnapshotRaw"
  />

  <CopilotChatAssistantMessage
    v-if="markdownMessage"
    :message="markdownMessage"
    :messages="[...messages, markdownMessage]"
  >
    <template #message-renderer>
      <MarkdownRenderer v-if="markdown" :markdown="markdown" />
    </template>
  </CopilotChatAssistantMessage>

  <CopilotChatAssistantMessage
    v-for="surface in turn.businessSurfaces"
    :key="surface.surfaceId"
    :message="surfaceMessage(surface.surfaceId)"
    :messages="[...messages, surfaceMessage(surface.surfaceId)]"
  >
    <template #message-renderer>
      <A2UIRenderer
        :presentation="surface.presentation"
      :read-only="surface.status === 'historical' || actionsDisabled"
        @action="emit('action', $event)"
      />
    </template>
  </CopilotChatAssistantMessage>
</template>
