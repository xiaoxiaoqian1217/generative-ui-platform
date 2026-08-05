<script setup lang="ts">
import type { Message } from "@ag-ui/core";
import {
  CopilotChatInput,
  CopilotChatMessageView,
  CopilotChatView,
} from "@copilotkit/vue/v2";
import type { ConversationTurn } from "./conversation-store.js";
import ConversationTurnPresentation from "./ConversationTurnPresentation.vue";
import type { RenderedRuntimeAction } from "../renderer/a2ui.js";

const props = defineProps<{
  inputValue: string;
  isActionDisabled: boolean;
  isInputDisabled: boolean;
  isRunning: boolean;
  messages: Message[];
  turns: readonly ConversationTurn[];
}>();

const emit = defineEmits<{
  inputChange: [value: string];
  stop: [];
  submitMessage: [value: string];
  action: [action: RenderedRuntimeAction];
  retry: [turnId: string];
}>();

function turnForUserMessage(messageId: string): ConversationTurn | undefined {
  return props.turns.find((turn) => turn.userMessage.id === messageId);
}
</script>

<template>
  <div class="controlled-copilot-chat-view">
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
        #message-view="{ messages: viewMessages, isRunning: viewIsRunning }"
      >
        <CopilotChatMessageView
          :is-running="viewIsRunning"
          :messages="viewMessages"
        >
          <template #message-after="{ message }">
            <ConversationTurnPresentation
              v-if="message.role === 'user' && turnForUserMessage(message.id)"
              :messages="viewMessages"
              :actions-disabled="isActionDisabled"
              :turn="turnForUserMessage(message.id)!"
              @action="emit('action', $event)"
              @retry="emit('retry', $event)"
            />
          </template>
        </CopilotChatMessageView>
      </template>
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
    <button
      v-if="isRunning"
      aria-label="停止生成"
      class="secondary-button"
      type="button"
      @click="emit('stop')"
    >
      停止
    </button>
  </div>
</template>

<style>
@import "../styles/copilotkit.css";
</style>
