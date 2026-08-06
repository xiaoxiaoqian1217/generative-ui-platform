<script setup lang="ts">
// PROTOTYPE(issue-179)：底部浮动变体切换栏，仅开发环境渲染。
import { onBeforeUnmount, onMounted } from "vue";

const props = defineProps<{
  variants: readonly string[];
  names: Record<string, string>;
  current: string;
}>();
const emit = defineEmits<{ change: [variant: string] }>();

function step(delta: number): void {
  const index = props.variants.indexOf(props.current);
  const next = (index + delta + props.variants.length) % props.variants.length;
  emit("change", props.variants[next]!);
}

function onKeydown(event: KeyboardEvent): void {
  const target = event.target as HTMLElement | null;
  if (
    target !== null &&
    (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable)
  ) {
    return;
  }
  if (event.key === "ArrowLeft") step(-1);
  if (event.key === "ArrowRight") step(1);
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));
</script>
<template>
  <div class="prototype-switcher">
    <button type="button" aria-label="上一个变体" @click="step(-1)">←</button>
    <span class="switcher-label">{{ current }} — {{ names[current] ?? current }}</span>
    <button type="button" aria-label="下一个变体" @click="step(1)">→</button>
  </div>
</template>

<style scoped>
.prototype-switcher {
  position: fixed;
  bottom: 18px;
  left: 50%;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: rgb(23 35 34 / 94%);
  color: #eef3ed;
  box-shadow: 0 10px 32px rgb(23 35 34 / 35%);
}

.prototype-switcher button {
  width: 30px;
  height: 30px;
  border: 1px solid rgb(255 255 255 / 24%);
  border-radius: 50%;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.prototype-switcher button:hover {
  background: rgb(255 255 255 / 12%);
}

.switcher-label {
  min-width: 170px;
  text-align: center;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}
</style>
