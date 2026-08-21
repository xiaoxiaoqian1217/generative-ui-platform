<script setup lang="ts">
import { computed } from "vue";
import { PROTOTYPE_MAP_STEPS } from "./map-agent-trace-prototype.js";
import PrototypeMapSurface from "./PrototypeMapSurface.vue";

const props = defineProps<{
  completedCount: number;
}>();

defineEmits<{
  inspect: [];
  replay: [];
}>();

const activeStep = computed(() =>
  props.completedCount < PROTOTYPE_MAP_STEPS.length
    ? PROTOTYPE_MAP_STEPS[props.completedCount]
    : undefined,
);
const visibleSteps = computed(() =>
  PROTOTYPE_MAP_STEPS.slice(
    0,
    Math.min(props.completedCount + 1, PROTOTYPE_MAP_STEPS.length),
  ),
);
</script>

<template>
  <section class="variant-b" data-testid="map-trace-variant-b">
    <aside class="variant-b-chat">
      <header>
        <strong>Agent 对话</strong>
        <span>地图内实时 HUD</span>
      </header>
      <div class="variant-b-messages">
        <p class="variant-b-user">帮我想想怎么巡逻北侧通道</p>
        <p class="variant-b-agent">
          我会直接在地图上完成分析。你可以在地图左上角看到当前动作。
        </p>
        <p v-if="completedCount >= 4" class="variant-b-agent">
          候选路线 A 已经绘制完成。地图上的所有结果都可以继续检查和调整。
        </p>
      </div>
      <footer>继续提问...</footer>
    </aside>

    <PrototypeMapSurface :completed-count="completedCount">
      <div class="map-hud">
        <div class="map-hud-head">
          <span class="hud-agent">A</span>
          <div>
            <small>AGENT MAP ACTION</small>
            <strong v-if="activeStep">{{ activeStep.label }}</strong>
            <strong v-else>地图操作已完成</strong>
          </div>
          <span v-if="activeStep" class="hud-pulse" aria-label="正在执行"></span>
          <span v-else class="hud-done">✓</span>
        </div>
        <p v-if="activeStep">{{ activeStep.detail }}</p>
        <p v-else>4 个动作已转化为地图上的可见结果。</p>
      </div>

      <div class="map-action-stack">
        <button type="button" @click="$emit('replay')">重播操作</button>
        <TransitionGroup name="action-chip">
          <div
            v-for="(step, index) in visibleSteps"
            :key="step.id"
            class="action-chip"
            :data-active="index === completedCount"
            :data-complete="index < completedCount"
          >
            <span>{{ index < completedCount ? "✓" : index + 1 }}</span>
            <strong>{{ step.label }}</strong>
          </div>
        </TransitionGroup>
        <button
          v-if="completedCount >= PROTOTYPE_MAP_STEPS.length"
          type="button"
          @click="$emit('inspect')"
        >
          查看记录
        </button>
      </div>
    </PrototypeMapSurface>
  </section>
</template>

<style scoped>
.variant-b {
  display: grid;
  grid-template-columns: minmax(300px, 29%) minmax(0, 1fr);
  height: 100%;
  min-height: 0;
  background: #fff;
}

.variant-b-chat {
  z-index: 2;
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  border-right: 1px solid #dfe3e8;
  box-shadow: 8px 0 24px rgb(32 42 48 / 6%);
}

.variant-b-chat header {
  display: grid;
  gap: 2px;
  padding: 16px 20px;
  border-bottom: 1px solid #e6e9ed;
}

.variant-b-chat header span {
  color: #7b838d;
  font-size: 11px;
}

.variant-b-messages {
  flex: 1;
  padding: 24px 18px;
  overflow-y: auto;
}

.variant-b-user {
  width: fit-content;
  margin: 0 0 22px auto;
  padding: 9px 13px;
  border-radius: 15px 15px 4px 15px;
  color: #fff;
  background: #3451d1;
}

.variant-b-agent {
  margin: 0 0 18px;
  color: #344044;
  font-size: 13px;
  line-height: 1.65;
}

.variant-b-chat footer {
  margin: 12px 16px 18px;
  padding: 12px 14px;
  border: 1px solid #d7dce1;
  border-radius: 13px;
  color: #89919b;
}

.map-hud {
  position: absolute;
  top: 76px;
  left: 18px;
  z-index: 5;
  width: min(380px, calc(100% - 36px));
  padding: 13px 14px;
  border: 1px solid rgb(34 65 61 / 14%);
  border-radius: 13px;
  background: rgb(255 255 255 / 94%);
  box-shadow: 0 14px 34px rgb(32 46 44 / 18%);
  backdrop-filter: blur(10px);
}

.map-hud-head {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) 20px;
  align-items: center;
  gap: 10px;
}

.hud-agent {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 9px;
  color: #fff;
  background: #2d6d5a;
  font-weight: 800;
}

.map-hud-head div {
  display: grid;
  gap: 1px;
}

.map-hud small {
  color: #748079;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.09em;
}

.map-hud strong {
  color: #1e3530;
  font-size: 14px;
}

.map-hud p {
  margin: 9px 0 0 40px;
  color: #65716d;
  font-size: 12px;
  line-height: 1.45;
}

.hud-pulse {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #e77e29;
  box-shadow: 0 0 0 5px rgb(231 126 41 / 16%);
}

.hud-done {
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  background: #2d6d5a;
  font-size: 11px;
  font-weight: 800;
}

.map-action-stack {
  position: absolute;
  bottom: 28px;
  left: 18px;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 7px;
  max-width: calc(100% - 36px);
  padding: 8px;
  overflow-x: auto;
  border: 1px solid rgb(34 65 61 / 12%);
  border-radius: 13px;
  background: rgb(255 255 255 / 92%);
  box-shadow: 0 10px 28px rgb(32 46 44 / 17%);
  backdrop-filter: blur(9px);
}

.map-action-stack > button {
  flex: 0 0 auto;
  min-height: 34px;
  padding: 0 11px;
  border: 1px solid #ccd3d0;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
}

.action-chip {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 0 10px;
  border-radius: 8px;
  color: #7d8585;
  background: #f2f4f2;
  font-size: 11px;
}

.action-chip span {
  display: grid;
  width: 17px;
  height: 17px;
  place-items: center;
  border-radius: 50%;
  background: #fff;
  font-size: 9px;
  font-weight: 800;
}

.action-chip[data-complete="true"] {
  color: #28584d;
  background: #e8f1ed;
}

.action-chip[data-complete="true"] span {
  color: #fff;
  background: #2d6d5a;
}

.action-chip[data-active="true"] {
  color: #9b4b0c;
  background: #fff0e3;
}

.action-chip-enter-active {
  transition:
    opacity 180ms ease,
    transform 220ms ease;
}

.action-chip-enter-from {
  opacity: 0;
  transform: translateX(-8px) scale(0.96);
}

.map-action-summary {
  position: absolute;
  bottom: 28px;
  left: 18px;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 7px 10px;
  border: 1px solid rgb(34 65 61 / 14%);
  border-radius: 12px;
  color: #28584d;
  background: rgb(255 255 255 / 94%);
  box-shadow: 0 10px 28px rgb(32 46 44 / 17%);
  backdrop-filter: blur(9px);
  cursor: pointer;
}

.map-action-summary > span {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  background: #2d6d5a;
  font-size: 11px;
  font-weight: 800;
}

.map-action-summary small {
  color: #61716c;
}
</style>
