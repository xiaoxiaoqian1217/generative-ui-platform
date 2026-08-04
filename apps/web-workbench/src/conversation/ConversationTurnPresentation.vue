<script setup lang="ts">
import type { AssistantMessage, Message } from "@ag-ui/core";
import type { ConversationTurn } from "./conversation-store.js";
import { computed } from "vue";
import { CopilotChatAssistantMessage } from "@copilotkit/vue/v2";
import A2UIRenderer from "../renderer/A2UIRenderer.vue";
import type { RenderedRuntimeAction } from "../renderer/a2ui.js";
import MarkdownRenderer from "../renderer/MarkdownRenderer.vue";

const props = defineProps<{
  messages: readonly Message[];
  turn: ConversationTurn;
}>();
const emit = defineEmits<{ action: [action: RenderedRuntimeAction] }>();

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

function surfaceMessage(surfaceId: string): AssistantMessage {
  return {
    content: "",
    id: `${props.turn.turnId}:assistant:${surfaceId}`,
    role: "assistant",
  };
}
</script>

<template>
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
        :read-only="surface.status === 'historical'"
        @action="emit('action', $event)"
      />
    </template>
  </CopilotChatAssistantMessage>
</template>
