<script setup lang="ts">
import type { QuickScenario } from "../app/scenarios.js";

interface LocalConversation {
  readonly conversationId: string;
  readonly title: string;
  readonly updatedAt: string;
}

defineProps<{
  conversations: readonly LocalConversation[];
  notice: string;
  quickScenarios: readonly QuickScenario[];
  selectedConversationId?: string | undefined;
}>();

const emit = defineEmits<{
  newConversation: [];
  runScenario: [scenario: QuickScenario];
  selectConversation: [conversationId: string];
}>();

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric",
  });
}
</script>

<template>
  <aside class="shell-sidebar" data-testid="conversation-sidebar">
    <div class="shell-sidebar-head">
      <span>Debug Conversations</span>
      <button
        class="shell-sidebar-new"
        data-testid="new-conversation"
        type="button"
        @click="emit('newConversation')"
      >
        + 新建
      </button>
    </div>
    <p v-if="notice" class="shell-sidebar-notice" data-testid="sidebar-notice">
      {{ notice }}
    </p>
    <div class="shell-conv-list" data-testid="conversation-list">
      <p v-if="conversations.length === 0" class="shell-conv-empty">暂无会话。</p>
      <button
        v-for="item in conversations"
        :key="item.conversationId"
        :class="{ active: selectedConversationId === item.conversationId }"
        class="shell-conv-item"
        type="button"
        @click="emit('selectConversation', item.conversationId)"
      >
        <span class="shell-conv-title">{{ item.title }}</span>
        <span class="shell-conv-meta">{{ formatUpdatedAt(item.updatedAt) }}</span>
      </button>
    </div>
    <section class="shell-scenarios" data-testid="quick-scenarios">
      <div class="shell-scenarios-head">
        <span>快捷场景</span>
        <span>{{ quickScenarios.length }}</span>
      </div>
      <button
        v-for="scenario in quickScenarios"
        :key="scenario.id"
        class="shell-scenario-item"
        type="button"
        @click="emit('runScenario', scenario)"
      >
        <strong>{{ scenario.label }}</strong>
        <span>{{ scenario.description }}</span>
      </button>
    </section>
  </aside>
</template>
