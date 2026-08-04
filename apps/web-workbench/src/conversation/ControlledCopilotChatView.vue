<script setup lang="ts">
import type { Message } from "@ag-ui/core";
import { CopilotChatView } from "@copilotkit/vue/v2";

defineProps<{
  inputValue: string;
  isRunning: boolean;
  messages: Message[];
}>();

const emit = defineEmits<{
  inputChange: [value: string];
  stop: [];
  submitMessage: [value: string];
}>();
</script>

<template>
  <CopilotChatView
    :input-value="inputValue"
    :is-running="isRunning"
    :messages="messages"
    auto-scroll="pin-to-bottom"
    @input-change="emit('inputChange', $event)"
    @stop="emit('stop')"
    @submit-message="emit('submitMessage', $event)"
  />
</template>

<style>
@import "../styles/copilotkit.css";
</style>
