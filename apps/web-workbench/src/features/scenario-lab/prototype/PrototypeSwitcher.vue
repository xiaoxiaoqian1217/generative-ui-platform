<script setup lang="ts">
/**
 * PROTOTYPE - throwaway. Floating variant switcher, dev-only.
 * ← / → cycle variants (ignored while typing in inputs).
 */
import { onMounted, onUnmounted } from "vue";

const props = defineProps<{ current: string }>();
const emit = defineEmits<{ navigate: [variant: string] }>();

const isDev = import.meta.env.DEV;

const VARIANTS = [
  { key: "A", name: "编辑主角" },
  { key: "B", name: "预览主角" },
  { key: "C", name: "评估主角" },
  { key: "D", name: "合成版" },
] as const;

function step(direction: 1 | -1): void {
  const index = VARIANTS.findIndex((variant) => variant.key === props.current);
  const next =
    VARIANTS[(index + direction + VARIANTS.length) % VARIANTS.length] ??
    VARIANTS[0];
  emit("navigate", next.key);
}

function onKeydown(event: KeyboardEvent): void {
  const target = event.target as HTMLElement | null;
  if (
    target !== null &&
    (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable)
  )
    return;
  if (event.key === "ArrowLeft") step(-1);
  if (event.key === "ArrowRight") step(1);
}

function exit(): void {
  window.location.assign("/scenarios");
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onUnmounted(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <div v-if="isDev" class="prototype-switcher">
    <span class="ps-tag">原型</span>
    <button type="button" @click="step(-1)">←</button>
    <span class="ps-label">
      {{ current }} — {{ VARIANTS.find((v) => v.key === current)?.name }}
    </span>
    <button type="button" @click="step(1)">→</button>
    <button type="button" class="ps-exit" title="回到正式 Scenarios 页" @click="exit">退出</button>
  </div>
</template>

<style scoped>
.prototype-switcher {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  border: 1px solid #333;
  border-radius: 999px;
  background: #1f2328;
  color: #fff;
  font-size: 12px;
  box-shadow: 0 4px 16px rgb(0 0 0 / 25%);
}

.ps-tag {
  padding: 1px 8px;
  border-radius: 999px;
  background: #f5a623;
  color: #1f2328;
  font-weight: 700;
}

.prototype-switcher button {
  padding: 2px 10px;
  border: 1px solid #555;
  border-radius: 999px;
  background: transparent;
  color: #fff;
  cursor: pointer;
}

.prototype-switcher button:hover { background: #333; }

.ps-label { min-width: 120px; text-align: center; }

.ps-exit { color: #f5a623; }
</style>
