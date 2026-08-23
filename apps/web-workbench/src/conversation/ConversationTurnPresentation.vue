<script setup lang="ts">
import type { ActivityMessage, AssistantMessage } from "@ag-ui/core";
import { CopilotChatToolCallsView } from "@copilotkit/vue/v2";
import { computed, reactive } from "vue";
import MarkdownRenderer from "../renderer/MarkdownRenderer.vue";
import ActivityMessagePresentation from "./ActivityMessagePresentation.vue";
import { isMapPlanActivityMessage } from "./map-plan-activity.js";
import type {
  ConversationTurn,
  InterruptResponse,
} from "./conversation-store.js";

const props = defineProps<{ turn: ConversationTurn }>();
const emit = defineEmits<{
  respondInterrupt: [response: InterruptResponse];
  retry: [turnId: string];
}>();

type PresentableMessage =
  | { id: string; kind: "activity"; activity: ActivityMessage }
  | { content: string; id: string; kind: "assistant" };

const presentableMessages = computed<PresentableMessage[]>(() => {
  const messages: PresentableMessage[] = [];
  for (const message of props.turn.responseMessages) {
    if (message.role === "activity") {
      if (isMapPlanActivityMessage(message)) continue;
      messages.push({ id: message.id, kind: "activity", activity: message });
    } else if (
      message.role === "assistant" &&
      typeof message.content === "string" &&
      message.content.length > 0
    ) {
      messages.push({
        content: message.content,
        id: message.id,
        kind: "assistant",
      });
    }
  }
  return messages;
});

const toolCallMessages = computed(() =>
  props.turn.responseMessages.filter(
    (message): message is AssistantMessage =>
      message.role === "assistant" && (message.toolCalls?.length ?? 0) > 0,
  ),
);

const failureSummary = computed(() => {
  if (props.turn.status === "cancelled") return "请求已取消。";
  if (props.turn.failure?.code === "WORKBENCH_REQUEST_TIMEOUT")
    return "请求超时，请重试。";
  return "请求未能完成。";
});

const interruptInputs = reactive<Record<string, string>>({});

function respondInterrupt(
  interruptId: string,
  status: "cancelled" | "resolved",
): void {
  const input = interruptInputs[interruptId]?.trim();
  emit("respondInterrupt", {
    interruptId,
    ...(status === "resolved" && input !== undefined && input !== ""
      ? { payload: input }
      : {}),
    status,
    turnId: props.turn.turnId,
  });
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

  <template v-for="message in presentableMessages" :key="message.id">
    <div v-if="message.kind === 'assistant'" class="assistant-markdown">
      <MarkdownRenderer :markdown="message.content" />
    </div>
    <ActivityMessagePresentation v-else :message="message.activity" />
  </template>

  <CopilotChatToolCallsView
    v-for="message in toolCallMessages"
    :key="`tools-${message.id}`"
    :message="message"
    :messages="[...turn.responseMessages]"
  />

  <section
    v-if="turn.status === 'interrupted' && turn.pendingInterrupts?.length"
    class="turn-interrupt"
    data-testid="turn-interrupt"
  >
    <form
      v-for="interrupt in turn.pendingInterrupts"
      :key="interrupt.id"
      class="turn-interrupt-card"
      :data-testid="`interrupt-${interrupt.id}`"
      @submit.prevent="respondInterrupt(interrupt.id, 'resolved')"
    >
      <p class="eyebrow">Agent 中断请求</p>
      <p class="turn-interrupt-reason" data-testid="interrupt-reason">
        {{ interrupt.message ?? interrupt.reason }}
      </p>
      <label class="turn-interrupt-input">
        回复
        <input
          v-model="interruptInputs[interrupt.id]"
          :data-testid="`interrupt-input-${interrupt.id}`"
          type="text"
        />
      </label>
      <div class="button-group">
        <button
          class="primary-button"
          :data-testid="`interrupt-submit-${interrupt.id}`"
          type="submit"
        >
          提交
        </button>
        <button
          class="secondary-button"
          :data-testid="`interrupt-cancel-${interrupt.id}`"
          type="button"
          @click="respondInterrupt(interrupt.id, 'cancelled')"
        >
          取消
        </button>
      </div>
    </form>
  </section>
</template>
