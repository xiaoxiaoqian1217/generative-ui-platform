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

const inputEl = ref<HTMLInputElement>();

function onInput(event: Event): void {
  emit("inputChange", (event.target as HTMLInputElement).value);
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key !== "Enter" || event.isComposing) return;
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
      inputEl.value?.focus();
    }
  },
);
</script>

<template>
  <footer class="shell-composer" data-testid="composer">
    <div class="shell-composer-inner">
      <input
        ref="inputEl"
        aria-label="输入消息"
        data-testid="composer-input"
        :disabled="isInputDisabled"
        placeholder="继续提问…"
        :value="inputValue"
        @input="onInput"
        @keydown="onKeydown"
      />
      <button
        v-if="isRunning"
        aria-label="停止生成"
        class="shell-composer-stop"
        data-testid="composer-stop"
        type="button"
        @click="emit('stop')"
      >
        停止
      </button>
      <button
        aria-label="发送消息"
        class="shell-composer-send"
        data-testid="composer-send"
        :disabled="!canSend"
        type="button"
        @click="submit"
      >
        发送
      </button>
    </div>
  </footer>
</template>
