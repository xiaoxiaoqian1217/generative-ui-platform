<script setup lang="ts">
// PROTOTYPE(issue #179)——/inspect/:turnId 的六节点 Execution Map + Node Detail。
// 三个变体经 ?variant=pipeline|timeline|waterfall 切换,仅开发期 /prototype-inspect 使用。
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { MOCK_TURN, STATUS_LABEL, formatMs } from "./inspect/mockTurn";
import VariantPipeline from "./inspect/VariantPipeline.vue";
import VariantTimeline from "./inspect/VariantTimeline.vue";
import VariantWaterfall from "./inspect/VariantWaterfall.vue";

const VARIANTS = [
  { key: "pipeline", name: "六列管道泳道", component: VariantPipeline },
  { key: "timeline", name: "垂直时间线", component: VariantTimeline },
  { key: "waterfall", name: "瀑布甘特", component: VariantWaterfall },
] as const;

type VariantKey = (typeof VARIANTS)[number]["key"];

const turn = MOCK_TURN;

const variant = ref<VariantKey>(readVariant());

function readVariant(): VariantKey {
  const param = new URLSearchParams(window.location.search).get("variant");
  return VARIANTS.some((item) => item.key === param) ? (param as VariantKey) : "pipeline";
}

function setVariant(next: VariantKey): void {
  variant.value = next;
  const url = new URL(window.location.href);
  url.searchParams.set("variant", next);
  window.history.replaceState(null, "", url.toString());
}

function step(delta: number): void {
  const index = VARIANTS.findIndex((item) => item.key === variant.value);
  const next = VARIANTS[(index + delta + VARIANTS.length) % VARIANTS.length];
  if (next) setVariant(next.key);
}

function onKeydown(event: KeyboardEvent): void {
  const target = event.target as HTMLElement | null;
  if (
    target &&
    (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
  ) {
    return;
  }
  if (event.key === "ArrowLeft") step(-1);
  if (event.key === "ArrowRight") step(1);
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));

const activeVariant = computed(() => VARIANTS.find((item) => item.key === variant.value));
</script>

<template>
  <div class="inspect-proto">
    <header class="page-head">
      <div class="crumbs">
        <span class="crumb">{{ turn.conversationTitle }}</span>
        <span class="crumb-sep">/</span>
        <span class="crumb">Inspect · {{ turn.turnId }}</span>
      </div>
      <h1 class="title">
        Turn 诊断
        <span class="status" :data-status="turn.status">{{ STATUS_LABEL[turn.status] }}</span>
      </h1>
      <p class="meta">
        {{ turn.startedAt }} · 总耗时 {{ formatMs(turn.durationMs) }} ·
        已持久化 seq {{ turn.sync.persistedSequence }} / 观察 {{ turn.sync.observedSequence }} ·
        revision {{ turn.sync.revision }}
        <span v-if="turn.sync.hasGap" class="gap">⚠ 事件存在缺口,诊断可能不完整</span>
      </p>
      <p class="user-msg">「{{ turn.userMessage }}」</p>
    </header>

    <component :is="activeVariant?.component" v-if="activeVariant" :turn="turn" />

    <div class="switcher" role="group" aria-label="原型变体切换">
      <button type="button" @click="step(-1)">←</button>
      <span class="switcher-label">
        {{ activeVariant?.key }} — {{ activeVariant?.name }}
      </span>
      <button type="button" @click="step(1)">→</button>
    </div>
  </div>
</template>

<style scoped>
.inspect-proto {
  min-height: 100vh;
  background: #f3f4f6;
  color: #111827;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.page-head {
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  padding: 14px 20px;
}

.crumbs {
  font-size: 12px;
  color: #6b7280;
}

.crumb-sep {
  margin: 0 6px;
}

.title {
  font-size: 18px;
  margin: 6px 0 4px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.status {
  font-size: 12px;
  border-radius: 999px;
  padding: 1px 10px;
}

.status[data-status="completed"] {
  background: #ecfdf5;
  color: #15803d;
}

.status[data-status="degraded"] {
  background: #fef3c7;
  color: #b45309;
}

.status[data-status="failed"] {
  background: #fef2f2;
  color: #b91c1c;
}

.meta {
  font-size: 12px;
  color: #6b7280;
  margin: 0;
}

.gap {
  color: #b91c1c;
}

.user-msg {
  font-size: 13px;
  margin: 8px 0 0;
  color: #374151;
}

.switcher {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  background: #111827;
  color: #f9fafb;
  border-radius: 999px;
  padding: 6px 10px;
  box-shadow: 0 8px 24px rgb(0 0 0 / 25%);
  z-index: 50;
}

.switcher button {
  border: 1px solid #374151;
  background: #1f2937;
  color: #f9fafb;
  border-radius: 999px;
  width: 28px;
  height: 28px;
  cursor: pointer;
}

.switcher-label {
  font-size: 12px;
  min-width: 180px;
  text-align: center;
}
</style>
