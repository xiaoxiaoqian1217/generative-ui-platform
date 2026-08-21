<script setup lang="ts">
// PROTOTYPE - throwaway: where should users perceive an Agent's map actions?
import { computed, onBeforeUnmount, onMounted, ref, type Component } from "vue";
import MapTraceVariantA from "./MapTraceVariantA.vue";
import MapTraceVariantB from "./MapTraceVariantB.vue";
import MapTraceVariantC from "./MapTraceVariantC.vue";
import {
  PROTOTYPE_MAP_STEPS,
  resolveMapAgentTraceVariant,
  type MapAgentTraceVariant,
} from "./map-agent-trace-prototype.js";

const variants = [
  {
    id: "map-A",
    label: "A 对话记录",
    note: "完整步骤留在对话中",
    component: MapTraceVariantA,
  },
  {
    id: "map-B",
    label: "B 地图 HUD",
    note: "当前动作贴近地图反馈",
    component: MapTraceVariantB,
  },
  {
    id: "map-C",
    label: "C 操作轨迹",
    note: "地图与时间线并列",
    component: MapTraceVariantC,
  },
] as const satisfies readonly {
  component: Component;
  id: MapAgentTraceVariant;
  label: string;
  note: string;
}[];

const currentVariant = ref<MapAgentTraceVariant>(
  resolveMapAgentTraceVariant(
    new URLSearchParams(window.location.search).get("variant"),
  ),
);
const completedCount = ref(0);
let replayTimer: number | undefined;

const selectedVariant = computed(
  () =>
    variants.find((variant) => variant.id === currentVariant.value) ??
    variants[0],
);

function selectVariant(variant: MapAgentTraceVariant): void {
  currentVariant.value = variant;
  const url = new URL(window.location.href);
  url.searchParams.set("variant", variant);
  window.history.replaceState({}, "", url);
}

function replay(): void {
  if (replayTimer !== undefined) window.clearInterval(replayTimer);
  completedCount.value = 0;
  replayTimer = window.setInterval(() => {
    completedCount.value += 1;
    if (completedCount.value >= PROTOTYPE_MAP_STEPS.length) {
      window.clearInterval(replayTimer);
      replayTimer = undefined;
    }
  }, 850);
}

function moveStep(delta: number): void {
  if (replayTimer !== undefined) {
    window.clearInterval(replayTimer);
    replayTimer = undefined;
  }
  completedCount.value = Math.max(
    0,
    Math.min(PROTOTYPE_MAP_STEPS.length, completedCount.value + delta),
  );
}

function onKeydown(event: KeyboardEvent): void {
  if (event.target instanceof HTMLInputElement) return;
  const index = variants.findIndex(
    (variant) => variant.id === currentVariant.value,
  );
  if (event.key === "ArrowLeft") {
    selectVariant(
      variants[(index - 1 + variants.length) % variants.length]!.id,
    );
  }
  if (event.key === "ArrowRight") {
    selectVariant(variants[(index + 1) % variants.length]!.id);
  }
}

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
  replay();
});
onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
  if (replayTimer !== undefined) window.clearInterval(replayTimer);
});
</script>

<template>
  <div class="map-trace-prototype">
    <aside class="prototype-sidebar">
      <header>
        <strong>Debug<br />Conversations</strong>
        <button type="button">+ 新建</button>
      </header>
      <div class="prototype-conversation-active">
        <strong>北侧通道巡逻</strong>
        <span>刚刚</span>
      </div>
      <div class="prototype-scenarios">
        <small>快捷场景</small>
        <strong>北侧通道巡逻方案</strong>
        <span>验证连续地图意图和 Agent 操作反馈</span>
      </div>
    </aside>

    <section class="prototype-stage">
      <header class="prototype-source-bar">
        <div>
          <strong>Agent Source</strong>
          <span>AGUIMock</span>
        </div>
        <p>Prototype - 比较 Agent 地图操作过程的用户感知位置</p>
        <div
          v-if="currentVariant !== 'map-B'"
          class="prototype-replay-controls"
        >
          <button type="button" aria-label="上一步" @click="moveStep(-1)">‹</button>
          <span>
            {{ completedCount }}/{{ PROTOTYPE_MAP_STEPS.length }}
          </span>
          <button type="button" aria-label="下一步" @click="moveStep(1)">›</button>
          <button type="button" @click="replay">重播</button>
        </div>
      </header>

      <component
        :is="selectedVariant.component"
        :completed-count="completedCount"
        @inspect="selectVariant('map-C')"
        @replay="replay"
      />
    </section>

    <nav class="prototype-switcher" aria-label="地图过程原型版本">
      <div class="prototype-switcher-intro">
        <strong>过程感知原型</strong>
        <span>{{ selectedVariant.note }}</span>
      </div>
      <button
        v-for="variant in variants"
        :key="variant.id"
        type="button"
        :class="{ active: variant.id === currentVariant }"
        @click="selectVariant(variant.id)"
      >
        {{ variant.label }}
      </button>
      <a href="/conversation">退出原型</a>
    </nav>
  </div>
</template>

<style scoped>
.map-trace-prototype {
  position: relative;
  display: grid;
  grid-template-columns: 244px minmax(0, 1fr);
  flex: 1;
  min-width: 0;
  min-height: 0;
  padding-bottom: 68px;
  overflow: hidden;
  color: #1f2927;
  background: #f6f7f5;
}

.prototype-sidebar {
  display: flex;
  min-height: 0;
  flex-direction: column;
  border-right: 1px solid #dfe3e1;
  background: #fff;
}

.prototype-sidebar header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 59px;
  padding: 10px;
  border-bottom: 1px solid #e7e9e8;
}

.prototype-sidebar header strong {
  font-size: 14px;
  line-height: 1.05;
}

.prototype-sidebar header button {
  padding: 7px 11px;
  border: 0;
  border-radius: 7px;
  color: #fff;
  background: #3451d1;
  font-weight: 700;
}

.prototype-conversation-active {
  display: grid;
  gap: 2px;
  margin: 8px;
  padding: 10px;
  border-radius: 9px;
  background: #eef2ff;
}

.prototype-conversation-active span,
.prototype-scenarios span {
  color: #7a8380;
  font-size: 11px;
}

.prototype-scenarios {
  display: grid;
  gap: 4px;
  margin-top: auto;
  padding: 14px 12px 18px;
  border-top: 1px solid #e7e9e8;
}

.prototype-scenarios small {
  margin-bottom: 4px;
  color: #7a8380;
  font-weight: 800;
  letter-spacing: 0.05em;
}

.prototype-stage {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
}

.prototype-source-bar {
  display: flex;
  align-items: center;
  gap: 22px;
  min-height: 59px;
  padding: 8px 18px;
  border-bottom: 1px solid #dfe3e1;
  background: #fff;
}

.prototype-source-bar > div:first-child {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 12px;
}

.prototype-source-bar > div:first-child span {
  min-width: 150px;
  padding: 7px 28px 7px 9px;
  border: 1px solid #ccd2d0;
  border-radius: 7px;
}

.prototype-source-bar p {
  margin: 0;
  color: #737d79;
  font-size: 12px;
}

.prototype-replay-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}

.prototype-replay-controls button,
.prototype-replay-controls span {
  display: grid;
  min-width: 29px;
  height: 29px;
  place-items: center;
  border: 1px solid #d1d6d3;
  border-radius: 7px;
  background: #fff;
  color: #35413d;
  font-size: 11px;
}

.prototype-replay-controls button {
  cursor: pointer;
}

.prototype-switcher {
  position: fixed;
  right: 50%;
  bottom: 12px;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 5px;
  max-width: calc(100vw - 32px);
  padding: 7px;
  border: 1px solid rgb(34 50 45 / 14%);
  border-radius: 14px;
  background: rgb(25 34 31 / 94%);
  box-shadow: 0 16px 42px rgb(16 23 20 / 26%);
  transform: translateX(50%);
  backdrop-filter: blur(12px);
}

.prototype-switcher-intro {
  display: grid;
  min-width: 150px;
  gap: 1px;
  padding: 0 8px;
  color: #fff;
}

.prototype-switcher-intro strong {
  font-size: 11px;
}

.prototype-switcher-intro span {
  color: #b8c2bd;
  font-size: 9px;
}

.prototype-switcher button,
.prototype-switcher a {
  flex: 0 0 auto;
  padding: 8px 11px;
  border: 0;
  border-radius: 8px;
  color: #c9d0cd;
  background: transparent;
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
  text-decoration: none;
}

.prototype-switcher button.active {
  color: #1d2d28;
  background: #fff;
}

.prototype-switcher a {
  border-left: 1px solid #46534f;
  border-radius: 0;
}

@media (max-width: 1050px) {
  .map-trace-prototype {
    grid-template-columns: minmax(0, 1fr);
  }

  .prototype-sidebar {
    display: none;
  }

  .prototype-source-bar p {
    display: none;
  }
}
</style>
