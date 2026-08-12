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
  isSubmitDisabled: boolean;
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
        >
          <template #send-button="{ disabled, isProcessing, onClick }">
            <div class="cpk:mr-[10px]">
              <button
                type="button"
                data-testid="copilot-chat-input-send"
                aria-label="Send message"
                :disabled="disabled || (isSubmitDisabled && !isProcessing)"
                class="cpk:inline-flex cpk:h-9 cpk:w-9 cpk:shrink-0 cpk:items-center cpk:justify-center cpk:rounded-full cpk:bg-black cpk:text-white cpk:transition-colors cpk:hover:opacity-70 cpk:disabled:cursor-not-allowed cpk:disabled:opacity-50 cpk:disabled:bg-[#00000014] cpk:disabled:text-[rgb(13,13,13)] cpk:disabled:hover:opacity-100 cpk:dark:bg-white cpk:dark:text-black cpk:dark:disabled:bg-[#454545] cpk:dark:disabled:text-white"
                @click="onClick"
              >
                <svg
                  v-if="isProcessing"
                  aria-hidden="true"
                  class="cpk:size-[18px]"
                  viewBox="0 0 24 24"
                >
                  <rect x="6" y="6" width="12" height="12" fill="currentColor" />
                </svg>
                <svg
                  v-else
                  aria-hidden="true"
                  class="cpk:size-[18px]"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="m6 11 6-6 6 6M12 5v14"
                    fill="none"
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                </svg>
              </button>
            </div>
          </template>
        </CopilotChatInput>
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
