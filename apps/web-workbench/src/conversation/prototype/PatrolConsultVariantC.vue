<script setup lang="ts">
// PROTOTYPE - throwaway: Variant C makes comparison a persistent bottom dock.
import type {
  PrototypeConsultDecision,
  PrototypeRouteId,
} from "./patrol-consult-prototype.js";
import {
  PROTOTYPE_REVISION_INSTRUCTION,
  PROTOTYPE_ROUTE_OPTIONS,
  prototypeDecisionLabel,
} from "./patrol-consult-prototype.js";
import PatrolConsultMap from "./PatrolConsultMap.vue";

defineProps<{
  activeRouteId: PrototypeRouteId;
  decision: PrototypeConsultDecision;
  hoveredRouteId?: PrototypeRouteId | undefined;
}>();

const emit = defineEmits<{
  cancel: [];
  hover: [routeId: PrototypeRouteId | undefined];
  preview: [routeId: PrototypeRouteId];
  reset: [];
  revise: [];
  select: [routeId: PrototypeRouteId];
}>();
</script>

<template>
  <div class="variant-c">
    <header class="c-workspace-header">
      <div class="c-title">
        <span>巡逻方案征询</span>
        <strong>北侧通道</strong>
      </div>
      <div class="c-thread-receipt">
        <i>A</i>
        <span>Agent 已提供 2 条候选路线</span>
        <b>{{ prototypeDecisionLabel(decision) }}</b>
      </div>
      <button type="button">图层 3</button>
    </header>

    <main class="c-map">
      <PatrolConsultMap
        :active-route-id="activeRouteId"
        :hovered-route-id="hoveredRouteId"
        :interactive="decision.kind === 'awaiting'"
        :show-legend="false"
        compact
        @hover="emit('hover', $event)"
        @preview="emit('preview', $event)"
      />
      <div class="c-map-instruction">
        点击地图路线，或在下方对比后确认
      </div>
    </main>

    <section class="comparison-dock">
      <header>
        <div>
          <span>候选路线对比</span>
          <h2>先比较差异，再做一次明确确认</h2>
        </div>
        <p>字段均来自 Agent 当前候选描述</p>
      </header>

      <div class="comparison-grid" role="table" aria-label="候选路线对比">
        <div class="comparison-labels" role="rowgroup">
          <span role="row">方案</span>
          <span role="row">主要经过</span>
          <span role="row">相对距离</span>
          <span role="row">东侧覆盖</span>
        </div>
        <button
          v-for="option in PROTOTYPE_ROUTE_OPTIONS"
          :key="option.id"
          class="comparison-route"
          :data-active="activeRouteId === option.id"
          :disabled="decision.kind !== 'awaiting'"
          type="button"
          @click="emit('preview', option.id)"
          @mouseenter="emit('hover', option.id)"
          @mouseleave="emit('hover', undefined)"
        >
          <span class="comparison-route-title">
            <i :data-route="option.id"></i>
            <strong>{{ option.label }}</strong>
            <b v-if="activeRouteId === option.id">当前预览</b>
          </span>
          <span>{{ option.via }}</span>
          <span>{{ option.distance }}</span>
          <span>{{ option.coverage }}</span>
        </button>
      </div>

      <footer v-if="decision.kind === 'awaiting'">
        <button class="dock-cancel" type="button" @click="emit('cancel')">
          取消征询
        </button>
        <button class="dock-revise" type="button" @click="emit('revise')">
          {{ PROTOTYPE_REVISION_INSTRUCTION }}
        </button>
        <button
          class="dock-confirm"
          type="button"
          @click="emit('select', activeRouteId)"
        >
          确认选择{{ activeRouteId === 'route-a' ? '路线 A' : '路线 B' }}
        </button>
      </footer>
      <footer v-else class="dock-result">
        <span>{{ prototypeDecisionLabel(decision) }}</span>
        <button type="button" @click="emit('reset')">重新体验</button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.variant-c {
  display: grid;
  grid-template-rows: auto minmax(260px, 1fr) auto;
  width: 100%;
  height: 100%;
  min-height: 0;
  color: #23312d;
  background: #eef2ed;
}

.c-workspace-header {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  min-height: 62px;
  padding: 9px 17px;
  border-bottom: 1px solid #dce2de;
  background: #fff;
}

.c-title {
  display: grid;
  gap: 1px;
}

.c-title span,
.comparison-dock > header span {
  color: #7d8884;
  font-size: 9px;
  font-weight: 850;
  letter-spacing: 0.08em;
}

.c-title strong {
  font-size: 14px;
}

.c-thread-receipt {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 11px;
  border: 1px solid #d7dfdb;
  border-radius: 999px;
  color: #66736e;
  background: #f8faf9;
  font-size: 9px;
}

.c-thread-receipt i {
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  background: #2f6c5b;
  font-style: normal;
  font-weight: 850;
}

.c-thread-receipt b {
  color: #2f6c5b;
}

.c-workspace-header > button {
  justify-self: end;
  padding: 7px 10px;
  border: 1px solid #d2d9d5;
  border-radius: 8px;
  color: #53605b;
  background: #fff;
  font-size: 10px;
}

.c-map {
  position: relative;
  min-height: 0;
  overflow: hidden;
}

.c-map-instruction {
  position: absolute;
  top: 14px;
  left: 50%;
  z-index: 4;
  padding: 7px 11px;
  border: 1px solid rgb(37 55 48 / 12%);
  border-radius: 999px;
  color: #52615b;
  background: rgb(255 255 255 / 90%);
  box-shadow: 0 5px 16px rgb(32 46 41 / 10%);
  transform: translateX(-50%);
  font-size: 9px;
  font-weight: 700;
  white-space: nowrap;
}

.comparison-dock {
  position: relative;
  z-index: 5;
  display: grid;
  grid-template-columns: 190px minmax(0, 1fr) auto;
  grid-template-rows: auto auto;
  gap: 11px 18px;
  padding: 15px 18px 18px;
  border-top: 1px solid #d5dcd8;
  background: rgb(255 255 255 / 98%);
  box-shadow: 0 -14px 34px rgb(33 49 43 / 9%);
}

.comparison-dock > header {
  grid-row: 1 / 3;
}

.comparison-dock h2 {
  margin: 4px 0 7px;
  font-size: 15px;
  line-height: 1.35;
}

.comparison-dock > header p {
  margin: 0;
  color: #7b8581;
  font-size: 9px;
  line-height: 1.45;
}

.comparison-grid {
  display: grid;
  grid-template-columns: 78px repeat(2, minmax(160px, 1fr));
  gap: 7px;
  min-width: 0;
}

.comparison-labels,
.comparison-route {
  display: grid;
  grid-template-rows: repeat(4, minmax(25px, auto));
}

.comparison-labels span,
.comparison-route > span {
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 4px 8px;
  border-bottom: 1px solid #e8ebe9;
  color: #53605b;
  font-size: 9px;
}

.comparison-labels span {
  padding-left: 0;
  color: #89918e;
  font-weight: 700;
}

.comparison-route {
  padding: 0;
  overflow: hidden;
  border: 1px solid #dce2df;
  border-radius: 10px;
  background: #fbfcfb;
  cursor: pointer;
  text-align: left;
}

.comparison-route[data-active="true"] {
  border-color: #527e70;
  background: #f0f7f4;
  box-shadow: 0 0 0 3px rgb(47 108 91 / 10%);
}

.comparison-route:disabled {
  cursor: default;
  opacity: 0.68;
}

.comparison-route-title {
  gap: 6px;
}

.comparison-route-title i {
  width: 13px;
  height: 4px;
  border-radius: 3px;
  background: #3767ca;
}

.comparison-route-title i[data-route="route-b"] {
  background: #cb6d35;
}

.comparison-route-title b {
  margin-left: auto;
  color: #2f6c5b;
  font-size: 8px;
}

.comparison-dock > footer {
  display: flex;
  grid-column: 2 / 4;
  justify-content: flex-end;
  gap: 7px;
}

.comparison-dock > footer button {
  min-height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 9px;
  font-weight: 750;
}

.dock-cancel,
.dock-revise,
.dock-result button {
  border: 1px solid #d0d8d4;
  color: #4c5a55;
  background: #fff;
}

.dock-confirm {
  border: 1px solid #3451d1;
  color: #fff;
  background: #3451d1;
}

.dock-result {
  align-items: center;
  color: #2f6c5b;
  font-size: 11px;
  font-weight: 750;
}

@media (width <= 1000px) {
  .comparison-dock {
    grid-template-columns: 150px minmax(0, 1fr);
  }

  .comparison-grid {
    grid-column: 2;
  }

  .comparison-dock > footer {
    grid-column: 2;
  }
}
</style>
