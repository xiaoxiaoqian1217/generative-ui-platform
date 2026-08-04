<script setup lang="ts">
import type { Message } from "@ag-ui/core";
import { CopilotChatInput, CopilotChatView } from "@copilotkit/vue/v2";

defineProps<{
  inputValue: string;
  isInputDisabled: boolean;
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
  >
    <template
      #input="{
        isRunning: viewIsRunning,
        modelValue,
        onStop,
        onSubmitMessage,
        onUpdateModelValue,
      }"
    >
      <CopilotChatInput
        :disabled="isInputDisabled"
        :is-running="viewIsRunning"
        :model-value="modelValue"
        @stop="onStop?.()"
        @submit-message="onSubmitMessage"
        @update:model-value="onUpdateModelValue"
      />
    </template>
  </CopilotChatView>
</template>

<style>
@import "../styles/copilotkit.css";
</style>
