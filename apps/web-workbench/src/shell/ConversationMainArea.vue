<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import type { ConversationTurn } from "../conversation/conversation-store.js";
import ConversationTurnPresentation from "../conversation/ConversationTurnPresentation.vue";

export type ConversationRunState =
  | "idle"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

const props = defineProps<{
  isRunning: boolean;
  runState: ConversationRunState;
  turns: readonly ConversationTurn[];
}>();

const emit = defineEmits<{
  inspect: [turnId: string];
  retry: [turnId: string];
}>();

const scrollHost = ref<HTMLElement>();
const isEmpty = computed(() => props.turns.length === 0);

watch(
  () => [props.turns.length, props.turns.at(-1)?.status],
  async () => {
    await nextTick();
    const host = scrollHost.value;
    if (host) host.scrollTop = host.scrollHeight;
  },
);
</script>

<template>
  <div ref="scrollHost" class="shell-chat-scroll" data-testid="conversation-main">
    <div v-if="isEmpty" class="shell-chat-empty">
      <p>开始一段真实 Agent Conversation</p>
      <p class="shell-chat-empty-sub">
        Assistant 消息直接来自 AG-UI，Frontend Tool 可以更新 Workbench。
      </p>
    </div>

    <div v-else class="shell-chat-column" data-testid="conversation-turns">
      <section
        v-for="turn in turns"
        :key="turn.turnId"
        class="shell-turn"
        :data-status="turn.status"
        :data-testid="`conversation-turn-${turn.turnId}`"
      >
        <div class="shell-bubble shell-bubble-user" data-testid="user-message">
          {{ turn.userMessage.content }}
        </div>

        <div class="shell-assistant">
          <div
            v-if="turn.status === 'pending'"
            class="shell-turn-hint shell-turn-hint-running"
            role="status"
          >
            <span class="shell-spinner"></span>正在运行...
          </div>
          <div
            v-else-if="turn.status === 'failed'"
            class="shell-turn-hint shell-turn-hint-failed"
            role="alert"
          >
            运行失败
          </div>
          <div
            v-else-if="turn.status === 'cancelled'"
            class="shell-turn-hint shell-turn-hint-failed"
            role="status"
          >
            已取消
          </div>

          <ConversationTurnPresentation
            :turn="turn"
            @retry="emit('retry', $event)"
          />

          <div class="shell-debug-tools">
            <button
              class="shell-debug-btn"
              :data-testid="`inspect-turn-${turn.turnId}`"
              type="button"
              @click="emit('inspect', turn.turnId)"
            >
              Inspect
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
