<script setup lang="ts">
import type { RuntimeThread } from "@generative-ui/runtime-contract";

defineProps<{
  notice: string;
  selectedThreadId?: string | undefined;
  threads: readonly RuntimeThread[];
}>();

const emit = defineEmits<{
  newConversation: [];
  selectConversation: [threadId: string];
}>();
</script>

<template>
  <aside class="conversation-sidebar" data-testid="conversation-sidebar">
    <div class="sidebar-header">
      <p class="eyebrow">CONVERSATIONS</p>
      <button
        class="secondary-button"
        data-testid="new-conversation"
        type="button"
        @click="emit('newConversation')"
      >
        + New
      </button>
    </div>
    <p v-if="notice" class="sidebar-notice" data-testid="sidebar-notice">
      {{ notice }}
    </p>
    <div class="conversation-list" data-testid="conversation-list">
      <p v-if="threads.length === 0" class="conversation-list-empty">
        暂无会话。
      </p>
      <button
        v-for="thread in threads"
        :key="thread.threadId"
        :class="{ active: selectedThreadId === thread.threadId }"
        class="conversation-list-item"
        type="button"
        @click="emit('selectConversation', thread.threadId)"
      >
        <strong>{{ thread.title }}</strong>
      </button>
    </div>
  </aside>
</template>
