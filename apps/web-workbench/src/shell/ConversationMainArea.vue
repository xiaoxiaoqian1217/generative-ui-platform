<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import type { ConversationTurn } from "../conversation/conversation-store.js";
import ConversationTurnPresentation from "../conversation/ConversationTurnPresentation.vue";
import type { RenderedRuntimeAction } from "../renderer/a2ui.js";

export type ConversationRunState =
  | "idle"
  | "running"
  | "rendering"
  | "completed"
  | "degraded"
  | "failed"
  | "cancelled";

const props = defineProps<{
  actionsDisabled: boolean;
  isRunning: boolean;
  runState: ConversationRunState;
  turns: readonly ConversationTurn[];
}>();

const emit = defineEmits<{
  action: [action: RenderedRuntimeAction];
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
  <div ref="scrollHost" class="conversation-scroll" data-testid="conversation-main">
    <div v-if="isEmpty" class="conversation-empty">
      <p class="eyebrow">READY</p>
      <h2>开始一段真实 Agent Conversation</h2>
      <p>
        用自然语言描述你的意图。Assistant 的最终 Markdown 与 Generated UI
        会直接内联在这里，调试信息按需通过 Inspect 查看。
      </p>
    </div>

    <ol v-else class="conversation-turns" data-testid="conversation-turns">
      <li
        v-for="turn in turns"
        :key="turn.turnId"
        class="conversation-turn"
        :data-status="turn.status"
        :data-testid="`conversation-turn-${turn.turnId}`"
      >
        <div class="turn-row turn-row-user">
          <div class="message-bubble user-bubble" data-testid="user-message">
            {{ turn.userMessage.content }}
          </div>
        </div>

        <div class="turn-row turn-row-assistant">
          <div class="assistant-stack">
            <div
              v-if="turn.status === 'pending'"
              class="turn-progress"
              role="status"
            >
              <span class="turn-progress-dot"></span>
              Agent 正在运行…
            </div>

            <ConversationTurnPresentation
              :actions-disabled="actionsDisabled"
              :messages="[]"
              :turn="turn"
              @action="emit('action', $event)"
              @retry="emit('retry', $event)"
            />

            <div class="turn-meta">
              <button
                class="inspect-link"
                :data-testid="`inspect-turn-${turn.turnId}`"
                type="button"
                @click="emit('inspect', turn.turnId)"
              >
                Inspect
              </button>
            </div>
          </div>
        </div>
      </li>
    </ol>
  </div>
</template>
