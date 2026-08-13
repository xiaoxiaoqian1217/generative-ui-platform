<script setup lang="ts">
import { computed } from "vue";
import MarkdownRenderer from "../renderer/MarkdownRenderer.vue";
import type { ConversationTurn } from "./conversation-store.js";

const props = defineProps<{ turn: ConversationTurn }>();
const emit = defineEmits<{ retry: [turnId: string] }>();

const assistantMessages = computed(() =>
  props.turn.responseMessages.flatMap((message) =>
    message.role === "assistant" &&
    typeof message.content === "string" &&
    message.content.length > 0
      ? [{ id: message.id, content: message.content }]
      : [],
  ),
);

const failureSummary = computed(() => {
  if (props.turn.status === "cancelled") return "请求已取消。";
  if (props.turn.failure?.code === "WORKBENCH_REQUEST_TIMEOUT")
    return "请求超时，请重试。";
  return "请求未能完成。";
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
    v-for="message in assistantMessages"
    :key="message.id"
    class="assistant-markdown"
  >
    <MarkdownRenderer :markdown="message.content ?? ''" />
  </div>
</template>
