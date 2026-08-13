<script setup lang="ts">
import { computed } from "vue";
import type { ConversationTurn } from "../conversation/conversation-store.js";

const props = defineProps<{ turn: ConversationTurn }>();
defineEmits<{ close: [] }>();

const assistantMessages = computed(() =>
  props.turn.responseMessages.filter((message) => message.role === "assistant"),
);
</script>

<template>
  <aside class="inspect-panel" data-testid="inspect-panel">
    <header>
      <div>
        <p class="eyebrow">AG-UI Run</p>
        <h2>Turn Inspect</h2>
      </div>
      <button data-testid="inspect-close" type="button" @click="$emit('close')">
        关闭
      </button>
    </header>

    <dl>
      <div><dt>turnId</dt><dd>{{ turn.turnId }}</dd></div>
      <div><dt>threadId</dt><dd>{{ turn.threadId ?? '-' }}</dd></div>
      <div><dt>runId</dt><dd>{{ turn.runId ?? '-' }}</dd></div>
      <div><dt>status</dt><dd>{{ turn.status }}</dd></div>
    </dl>

    <section class="viewer-card" data-testid="agent-message-viewer">
      <p class="eyebrow">Assistant messages</p>
      <pre>{{ JSON.stringify(assistantMessages, null, 2) }}</pre>
    </section>
  </aside>
</template>
