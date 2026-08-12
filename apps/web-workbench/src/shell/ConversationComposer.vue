<script setup lang="ts">
import { nextTick, ref, watch } from "vue";

const props = defineProps<{
  canSend: boolean;
  inputValue: string;
  isInputDisabled: boolean;
  isRunning: boolean;
}>();

const emit = defineEmits<{
  inputChange: [value: string];
  stop: [];
  submit: [value: string];
}>();

const textarea = ref<HTMLTextAreaElement>();

function onInput(event: Event): void {
  emit("inputChange", (event.target as HTMLTextAreaElement).value);
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
  event.preventDefault();
  submit();
}

function submit(): void {
  const value = props.inputValue.trim();
  if (value === "" || !props.canSend) return;
  emit("submit", value);
}

watch(
  () => props.isInputDisabled,
  async (disabled) => {
    if (!disabled) {
      await nextTick();
      textarea.value?.focus();
    }
  },
);
</script>

<template>
  <div class="composer" data-testid="composer">
    <textarea
      ref="textarea"
      aria-label="输入消息"
      class="composer-textarea"
      data-testid="composer-input"
      :disabled="isInputDisabled"
      placeholder="输入消息， Enter 发送， Shift+Enter 换行"
      rows="3"
      :value="inputValue"
      @input="onInput"
      @keydown="onKeydown"
    />
    <div class="composer-actions">
      <button
        v-if="isRunning"
        aria-label="停止生成"
        class="secondary-button"
        data-testid="composer-stop"
        type="button"
        @click="emit('stop')"
      >
        停止
      </button>
      <button
        aria-label="发送消息"
        class="primary-button"
        data-testid="composer-send"
        :disabled="!canSend"
        type="button"
        @click="submit"
      >
        发送
      </button>
    </div>
  </div>
</template>
