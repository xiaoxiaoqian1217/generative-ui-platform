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
  <section class="variant-a" data-testid="map-trace-variant-a">
    <div class="variant-a-chat">
      <header>
        <div>
          <strong>新会话</strong>
          <span>对话内行动记录</span>
        </div>
        <button type="button" @click="$emit('replay')">重播</button>
      </header>

      <div class="variant-a-transcript">
        <p class="variant-user-message">帮我想想怎么巡逻北侧通道</p>

        <article class="variant-a-trace">
          <div class="variant-a-trace-title">
            <div>
              <span class="agent-mark">A</span>
              <div>
                <strong>Agent 正在操作地图</strong>
                <small>地图会随每一步同步更新</small>
              </div>
            </div>
            <span class="trace-count">
              {{ Math.min(completedCount, PROTOTYPE_MAP_STEPS.length) }}/{{
                PROTOTYPE_MAP_STEPS.length
              }}
            </span>
          </div>

          <ol>
            <li
              v-for="(step, index) in PROTOTYPE_MAP_STEPS"
              :key="step.id"
              :data-status="prototypeStepStatus(index, completedCount)"
            >
              <span class="step-node">
                {{ index < completedCount ? "✓" : index + 1 }}
              </span>
              <div>
                <strong>{{ step.label }}</strong>
                <p>
                  {{
                    index < completedCount
                      ? step.output
                      : index === completedCount
                        ? step.detail
                        : "等待前一步完成"
                  }}
                </p>
              </div>
            </li>
          </ol>
        </article>

        <p v-if="completedCount >= 4" class="variant-assistant-message">
          已展示限制区、3 个观察点，并绘制候选路线 A。你可以继续让我比较其他路线。
        </p>
      </div>

      <footer>继续提问...</footer>
    </div>

    <PrototypeMapSurface :completed-count="completedCount" />
  </section>
</template>

<style scoped>
.variant-a {
  display: grid;
  grid-template-columns: minmax(390px, 44%) minmax(0, 1fr);
  height: 100%;
  min-height: 0;
  background: #fff;
}

.variant-a-chat {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  border-right: 1px solid #dfe3e8;
}

.variant-a-chat > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 58px;
  padding: 10px 20px;
  border-bottom: 1px solid #e7e9ed;
}

.variant-a-chat > header div {
  display: grid;
  gap: 2px;
}

.variant-a-chat > header span {
  color: #7a818c;
  font-size: 11px;
}

.variant-a-chat button,
.variant-a-trace button {
  border: 1px solid #d2d7de;
  border-radius: 7px;
  padding: 5px 10px;
  background: #fff;
  cursor: pointer;
}

.variant-a-transcript {
  flex: 1;
  min-height: 0;
  padding: 28px 22px;
  overflow-y: auto;
}

.variant-user-message {
  width: fit-content;
  max-width: 75%;
  margin: 0 0 22px auto;
  padding: 9px 14px;
  border-radius: 16px 16px 4px 16px;
  color: #fff;
  background: #3451d1;
}

.variant-a-trace {
  overflow: hidden;
  border: 1px solid #dde3e8;
  border-radius: 12px;
  background: #f9fafb;
}

.variant-a-trace-title,
.variant-a-trace-title > div {
  display: flex;
  align-items: center;
}

.variant-a-trace-title {
  justify-content: space-between;
  padding: 13px 14px;
  border-bottom: 1px solid #e7eaee;
  background: #fff;
}

.variant-a-trace-title > div {
  gap: 10px;
}

.variant-a-trace-title > div > div {
  display: grid;
  gap: 2px;
}

.variant-a-trace-title small {
  color: #747d87;
}

.agent-mark {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 9px;
  color: #fff;
  background: #2d6d5a;
  font-weight: 800;
}

.trace-count {
  color: #69727d;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.variant-a-trace ol {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 4px 14px 8px;
  list-style: none;
}

.variant-a-trace li {
  position: relative;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 10px;
  padding: 10px 0;
  color: #8a9199;
}

.variant-a-trace li:not(:last-child)::after {
  position: absolute;
  top: 35px;
  bottom: -5px;
  left: 13px;
  width: 2px;
  background: #dfe4e8;
  content: "";
}

.variant-a-trace li[data-status="completed"],
.variant-a-trace li[data-status="running"] {
  color: #1f3430;
}

.step-node {
  position: relative;
  z-index: 1;
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 1px solid #d8dde2;
  border-radius: 50%;
  background: #fff;
  font-size: 12px;
  font-weight: 800;
}

[data-status="completed"] .step-node {
  color: #fff;
  border-color: #2d6d5a;
  background: #2d6d5a;
}

[data-status="running"] .step-node {
  border-color: #e77e29;
  color: #c75f0e;
  box-shadow: 0 0 0 4px rgb(231 126 41 / 13%);
}

.variant-a-trace li strong {
  font-size: 13px;
}

.variant-a-trace li p {
  margin: 3px 0 0;
  font-size: 12px;
  line-height: 1.45;
}

.variant-assistant-message {
  margin: 18px 0 0;
  color: #28363a;
  line-height: 1.65;
}

.variant-a-chat > footer {
  margin: 12px 18px 18px;
  padding: 13px 15px;
  border: 1px solid #d8dde3;
  border-radius: 14px;
  color: #89919b;
}
</style>
