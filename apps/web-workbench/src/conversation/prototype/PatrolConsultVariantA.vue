<script setup lang="ts">
// PROTOTYPE - throwaway: Variant A keeps the consultation inside conversation.
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
  <div class="variant-a">
    <section class="a-conversation">
      <header class="conversation-header">
        <div>
          <span>CONVERSATION</span>
          <strong>北侧通道巡逻</strong>
        </div>
        <button type="button" aria-label="更多操作">...</button>
      </header>

      <div class="conversation-scroll">
        <div class="user-message">帮我想想怎么巡逻北侧通道。</div>
        <div class="agent-intro">
          <span class="agent-avatar">A</span>
          <p>两条候选路线都已准备好。请在地图上比较后选择。</p>
        </div>

        <section class="inline-consult-card">
          <header>
            <div>
              <span>业务征询</span>
              <h2>选择一条巡逻路线</h2>
            </div>
            <b>{{ prototypeDecisionLabel(decision) }}</b>
          </header>

          <div class="inline-options">
            <article
              v-for="option in PROTOTYPE_ROUTE_OPTIONS"
              :key="option.id"
              :data-active="activeRouteId === option.id"
              @mouseenter="emit('hover', option.id)"
              @mouseleave="emit('hover', undefined)"
            >
              <div class="route-heading">
                <i :data-route="option.id"></i>
                <strong>{{ option.label }}</strong>
                <span v-if="activeRouteId === option.id">地图正在预览</span>
              </div>
              <p>{{ option.summary }}</p>
              <div class="route-actions">
                <button
                  :disabled="decision.kind !== 'awaiting'"
                  type="button"
                  @click="emit('preview', option.id)"
                >
                  预览
                </button>
                <button
                  class="select-button"
                  :disabled="decision.kind !== 'awaiting'"
                  type="button"
                  @click="emit('select', option.id)"
                >
                  选择{{ option.label }}
                </button>
              </div>
            </article>
          </div>

          <div v-if="decision.kind === 'awaiting'" class="inline-revision">
            <div>
              <span>修改要求</span>
              <strong>{{ PROTOTYPE_REVISION_INSTRUCTION }}</strong>
            </div>
            <button type="button" @click="emit('revise')">提交修改</button>
          </div>

          <footer>
            <button
              v-if="decision.kind === 'awaiting'"
              type="button"
              @click="emit('cancel')"
            >
              取消选择
            </button>
            <button v-else type="button" @click="emit('reset')">重新体验</button>
          </footer>
        </section>
      </div>

      <div class="composer">输入消息... <button type="button">发送</button></div>
    </section>

    <section class="a-map-panel">
      <header>
        <div>
          <span>GIS WORKSPACE</span>
          <strong>北侧通道</strong>
        </div>
        <p>地图跟随对话卡片中的预览选择</p>
      </header>
      <PatrolConsultMap
        :active-route-id="activeRouteId"
        :hovered-route-id="hoveredRouteId"
        :interactive="decision.kind === 'awaiting'"
        @hover="emit('hover', $event)"
        @preview="emit('preview', $event)"
      />
    </section>
  </div>
</template>

<style scoped>
.variant-a {
  display: grid;
  grid-template-columns: minmax(360px, 44%) minmax(0, 1fr);
  width: 100%;
  height: 100%;
  min-height: 0;
  color: #22302c;
  background: #f5f7f5;
}

.a-conversation,
.a-map-panel {
  display: grid;
  min-width: 0;
  min-height: 0;
}

.a-conversation {
  grid-template-rows: auto minmax(0, 1fr) auto;
  border-right: 1px solid #dfe4e1;
  background: #fff;
}

.conversation-header,
.a-map-panel > header {
  display: flex;
  min-height: 62px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 11px 18px;
  border-bottom: 1px solid #e6e9e7;
  background: #fff;
}

.conversation-header > div,
.a-map-panel > header > div {
  display: grid;
  gap: 2px;
}

.conversation-header span,
.a-map-panel > header span {
  color: #87908c;
  font-size: 9px;
  font-weight: 850;
  letter-spacing: 0.1em;
}

.conversation-header strong,
.a-map-panel > header strong {
  font-size: 14px;
}

.conversation-header button {
  border: 0;
  background: transparent;
  color: #6a7470;
}

.a-map-panel {
  grid-template-rows: auto minmax(0, 1fr);
}

.a-map-panel > header p {
  margin: 0;
  color: #75807c;
  font-size: 11px;
}

.conversation-scroll {
  padding: 20px;
  overflow-y: auto;
  background: #fafbfa;
}

.user-message {
  width: fit-content;
  max-width: 76%;
  margin-left: auto;
  padding: 10px 13px;
  border-radius: 14px 14px 4px;
  color: #fff;
  background: #334fc2;
  font-size: 12px;
}

.agent-intro {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 18px 0 10px;
}

.agent-intro p {
  max-width: 78%;
  margin: 0;
  color: #4f5c57;
  font-size: 12px;
  line-height: 1.55;
}

.agent-avatar {
  display: grid;
  width: 25px;
  height: 25px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 8px;
  color: #fff;
  background: #2f6d5c;
  font-size: 10px;
  font-weight: 850;
}

.inline-consult-card {
  display: grid;
  gap: 12px;
  padding: 15px;
  border: 1px solid #cfd9d5;
  border-radius: 15px;
  background: #fff;
  box-shadow: 0 12px 30px rgb(30 48 42 / 8%);
}

.inline-consult-card > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.inline-consult-card > header span {
  color: #6e7c77;
  font-size: 9px;
  font-weight: 850;
  letter-spacing: 0.08em;
}

.inline-consult-card h2 {
  margin: 4px 0 0;
  font-size: 15px;
}

.inline-consult-card > header b {
  padding: 4px 8px;
  border-radius: 999px;
  color: #2f6959;
  background: #e6f1ed;
  font-size: 9px;
  white-space: nowrap;
}

.inline-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
}

.inline-options article {
  display: grid;
  align-content: space-between;
  gap: 9px;
  min-width: 0;
  padding: 11px;
  border: 1px solid #dbe2df;
  border-radius: 11px;
  background: #fbfcfb;
}

.inline-options article[data-active="true"] {
  border-color: #5f8378;
  box-shadow: 0 0 0 3px rgb(51 111 94 / 10%);
}

.route-heading {
  display: flex;
  align-items: center;
  gap: 6px;
}

.route-heading i {
  width: 12px;
  height: 4px;
  border-radius: 2px;
  background: #3767ca;
}

.route-heading i[data-route="route-b"] {
  background: #cb6d35;
}

.route-heading strong {
  font-size: 12px;
}

.route-heading span {
  margin-left: auto;
  color: #34715f;
  font-size: 8px;
  font-weight: 750;
}

.inline-options p {
  margin: 0;
  color: #69756f;
  font-size: 10px;
  line-height: 1.5;
}

.route-actions {
  display: flex;
  gap: 6px;
}

.route-actions button,
.inline-revision button,
.inline-consult-card footer button {
  min-height: 28px;
  padding: 0 9px;
  border: 1px solid #ccd5d1;
  border-radius: 7px;
  color: #35443f;
  background: #fff;
  cursor: pointer;
  font-size: 9px;
  font-weight: 750;
}

.route-actions .select-button {
  flex: 1;
  border-color: #3451d1;
  color: #fff;
  background: #3451d1;
}

.route-actions button:disabled {
  cursor: default;
  opacity: 0.42;
}

.inline-revision {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 10px;
  border-radius: 9px;
  background: #f2f5f3;
}

.inline-revision > div {
  display: grid;
  gap: 2px;
}

.inline-revision span {
  color: #78827e;
  font-size: 8px;
  font-weight: 800;
}

.inline-revision strong {
  font-size: 10px;
}

.inline-consult-card footer {
  display: flex;
  justify-content: flex-end;
}

.composer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 12px;
  padding: 9px 9px 9px 13px;
  border: 1px solid #d8dddb;
  border-radius: 10px;
  color: #949c98;
  background: #fff;
  font-size: 11px;
}

.composer button {
  padding: 5px 10px;
  border: 0;
  border-radius: 6px;
  color: #fff;
  background: #3451d1;
  font-size: 10px;
}

@media (width <= 1000px) {
  .variant-a {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(420px, 1fr) minmax(320px, 0.8fr);
    overflow-y: auto;
  }
}
</style>
