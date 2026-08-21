<script setup lang="ts">
import PrototypeMapSurface from "./PrototypeMapSurface.vue";
import {
  PROTOTYPE_MAP_STEPS,
  prototypeStepStatus,
} from "./map-agent-trace-prototype.js";

defineProps<{
  completedCount: number;
}>();

defineEmits<{
  replay: [];
}>();
</script>

<template>
  <section class="variant-c" data-testid="map-trace-variant-c">
    <header class="variant-c-command">
      <div>
        <small>当前任务</small>
        <strong>巡逻北侧通道</strong>
      </div>
      <p>
        {{
          completedCount >= 4
            ? "候选路线 A 已绘制，可继续比较路线"
            : "Agent 正在把分析步骤转化为地图结果"
        }}
      </p>
      <button type="button" @click="$emit('replay')">重播过程</button>
    </header>

    <div class="variant-c-map">
      <PrototypeMapSurface :completed-count="completedCount" />
    </div>

    <ol class="variant-c-timeline">
      <li
        v-for="(step, index) in PROTOTYPE_MAP_STEPS"
        :key="step.id"
        :data-status="prototypeStepStatus(index, completedCount)"
      >
        <span class="timeline-index">
          {{ index < completedCount ? "✓" : index + 1 }}
        </span>
        <div>
          <small>地图动作 {{ index + 1 }}</small>
          <strong>{{ step.label }}</strong>
          <p>
            {{
              index < completedCount
                ? step.output
                : index === completedCount
                  ? step.detail
                  : "等待执行"
            }}
          </p>
        </div>
      </li>
    </ol>

    <footer class="variant-c-composer">
      <span>继续要求 Agent 调整地图...</span>
      <button type="button">发送</button>
    </footer>
  </section>
</template>

<style scoped>
.variant-c {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto auto;
  height: 100%;
  min-height: 0;
  background: #f6f7f5;
}

.variant-c-command {
  display: grid;
  grid-template-columns: minmax(180px, 0.8fr) minmax(280px, 1.5fr) auto;
  align-items: center;
  gap: 20px;
  min-height: 68px;
  padding: 10px 18px;
  border-bottom: 1px solid #dfe3df;
  background: #fff;
}

.variant-c-command > div {
  display: grid;
  gap: 2px;
}

.variant-c-command small {
  color: #7b847e;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.06em;
}

.variant-c-command p {
  margin: 0;
  color: #606b66;
  font-size: 12px;
}

.variant-c-command button {
  padding: 7px 11px;
  border: 1px solid #ccd3cf;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  font-size: 12px;
  font-weight: 650;
}

.variant-c-map {
  min-height: 0;
}

.variant-c-timeline {
  display: grid;
  grid-template-columns: repeat(4, minmax(170px, 1fr));
  gap: 0;
  margin: 0;
  padding: 0 12px;
  overflow-x: auto;
  border-top: 1px solid #dce1dd;
  border-bottom: 1px solid #dce1dd;
  background: #fff;
  list-style: none;
}

.variant-c-timeline li {
  position: relative;
  display: grid;
  grid-template-columns: 25px minmax(0, 1fr);
  gap: 9px;
  min-width: 170px;
  padding: 13px 14px;
  color: #8a918d;
}

.variant-c-timeline li + li {
  border-left: 1px solid #eaedea;
}

.variant-c-timeline li[data-status="completed"],
.variant-c-timeline li[data-status="running"] {
  color: #263b35;
}

.variant-c-timeline li[data-status="running"] {
  background: #fff8f1;
}

.timeline-index {
  display: grid;
  width: 25px;
  height: 25px;
  place-items: center;
  border: 1px solid #d5dad7;
  border-radius: 50%;
  background: #fff;
  font-size: 10px;
  font-weight: 800;
}

[data-status="completed"] .timeline-index {
  color: #fff;
  border-color: #2d6d5a;
  background: #2d6d5a;
}

[data-status="running"] .timeline-index {
  color: #b85b13;
  border-color: #e77e29;
}

.variant-c-timeline li div {
  display: grid;
  gap: 2px;
}

.variant-c-timeline small {
  color: #8a918d;
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 0.05em;
}

.variant-c-timeline strong {
  font-size: 12px;
}

.variant-c-timeline p {
  margin: 2px 0 0;
  font-size: 10px;
  line-height: 1.4;
}

.variant-c-composer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px 14px;
  background: #fff;
}

.variant-c-composer span {
  flex: 1;
  padding: 10px 13px;
  border: 1px solid #d6dbd8;
  border-radius: 12px;
  color: #929994;
  font-size: 12px;
}

.variant-c-composer button {
  padding: 9px 18px;
  border: 0;
  border-radius: 9px;
  color: #fff;
  background: #3451d1;
}
</style>
