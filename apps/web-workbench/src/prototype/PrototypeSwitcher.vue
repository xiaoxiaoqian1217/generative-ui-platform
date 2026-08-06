<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";

const props = defineProps<{
  current: string;
  variants: readonly { key: string; name: string }[];
}>();
const emit = defineEmits<{ select: [key: string] }>();

function cycle(offset: number): void {
  const index = props.variants.findIndex((item) => item.key === props.current);
  const next = props.variants.at((index + offset + props.variants.length) % props.variants.length);
  if (next !== undefined) emit("select", next.key);
}

function handleKeydown(event: KeyboardEvent): void {
  const target = event.target;
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  )
    return;
  if (event.key === "ArrowLeft") cycle(-1);
  if (event.key === "ArrowRight") cycle(1);
}

onMounted(() => window.addEventListener("keydown", handleKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", handleKeydown));
</script>

<template>
  <div class="prototype-switcher" role="toolbar" aria-label="Issue 174 原型方案切换">
    <button aria-label="上一个方案" type="button" @click="cycle(-1)">←</button>
    <span>
      <small>ISSUE #174 · THROWAWAY PROTOTYPE</small>
      <strong>{{ current }} — {{ variants.find((item) => item.key === current)?.name }}</strong>
    </span>
    <button aria-label="下一个方案" type="button" @click="cycle(1)">→</button>
  </div>
</template>

<style scoped>
.prototype-switcher {
  position: fixed;
  z-index: 100;
  bottom: 22px;
  left: 50%;
  display: grid;
  grid-template-columns: 42px minmax(240px, auto) 42px;
  align-items: center;
  overflow: hidden;
  color: #f7faf7;
  border: 1px solid rgb(255 255 255 / 20%);
  border-radius: 999px;
  background: rgb(17 26 25 / 96%);
  box-shadow: 0 16px 50px rgb(9 18 16 / 35%);
  transform: translateX(-50%);
  backdrop-filter: blur(14px);
}

button {
  height: 46px;
  color: inherit;
  border: 0;
  background: transparent;
  cursor: pointer;
  font-size: 1.2rem;
}

button:hover {
  background: rgb(255 255 255 / 10%);
}

span {
  display: grid;
  min-width: 265px;
  padding: 7px 18px;
  border-right: 1px solid rgb(255 255 255 / 12%);
  border-left: 1px solid rgb(255 255 255 / 12%);
  text-align: center;
}

small {
  color: #9eaaa7;
  font-size: 0.56rem;
  font-weight: 800;
  letter-spacing: 0.13em;
}

strong {
  margin-top: 2px;
  font-size: 0.78rem;
}
</style>
