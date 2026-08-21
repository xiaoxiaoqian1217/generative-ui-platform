<script setup lang="ts">
import { computed } from "vue";
import type { ConversationTurn } from "./conversation-store.js";
import {
  type MapOperationStepStatus,
  mapOperationSteps,
} from "./map-operation-trace.js";
import {
  mapPlanFromTurn,
  mapPlanStepForOperation,
} from "./map-plan-activity.js";

const props = defineProps<{ turn: ConversationTurn }>();
const emit = defineEmits<{ inspect: [turnId: string] }>();

const steps = computed(() => mapOperationSteps(props.turn.observations ?? []));
const plan = computed(() => mapPlanFromTurn(props.turn));
const runningStep = computed(() =>
  steps.value.find((step) => step.status === "running"),
);
const latestStep = computed(() => steps.value.at(-1));
const completedCount = computed(
  () => steps.value.filter((step) => step.status === "completed").length,
);
const failedCount = computed(
  () => steps.value.filter((step) => step.status === "failed").length,
);
const isRunning = computed(() => props.turn.status === "pending");
const hasFailure = computed(
  () => props.turn.status === "failed" || failedCount.value > 0,
);
const settledSummary = computed(() => {
  if (props.turn.status === "failed" && failedCount.value === 0)
    return `已完成 ${completedCount.value} 项，运行失败`;
  if (hasFailure.value)
    return `${completedCount.value} 项完成，${failedCount.value} 项失败`;
  if (props.turn.status === "cancelled")
    return `已完成 ${completedCount.value} 项，操作已取消`;
  return `已完成 ${completedCount.value} 项地图操作`;
});
const currentTitle = computed(() => {
  if (isRunning.value)
    return runningStep.value?.label ?? latestStep.value?.label;
  if (hasFailure.value) return "部分地图操作未完成";
  if (props.turn.status === "cancelled") return "地图操作已取消";
  return "地图操作已完成";
});
const currentDetail = computed(() => {
  if (isRunning.value) {
    const operation = runningStep.value ?? latestStep.value;
    return (
      mapPlanStepForOperation(plan.value, operation?.toolName)?.detail ??
      "Agent 正在执行地图操作。"
    );
  }
  return `${settledSummary.value}，结果已保留在地图上。`;
});

const STATUS_LABELS: Record<MapOperationStepStatus, string> = {
  cancelled: "已取消",
  completed: "已完成",
  failed: "失败",
  running: "执行中",
  superseded: "已替代",
};
</script>

<template>
  <div v-if="steps.length > 0" class="map-operation-hud">
    <section
      class="map-operation-hud-current"
      data-testid="map-operation-hud-current"
      role="status"
    >
      <span class="map-operation-hud-agent" aria-hidden="true">A</span>
      <div>
        <p>AGENT MAP ACTION</p>
        <strong>{{ currentTitle }}</strong>
        <span class="map-operation-hud-detail">{{ currentDetail }}</span>
      </div>
      <span
        v-if="isRunning && runningStep !== undefined"
        class="map-operation-hud-pulse"
        aria-hidden="true"
      ></span>
      <span
        v-else
        class="map-operation-hud-done"
        :data-failed="hasFailure ? 'true' : undefined"
        aria-hidden="true"
      >
        {{ hasFailure ? "!" : "✓" }}
      </span>
    </section>

    <TransitionGroup
      class="map-operation-hud-history"
      data-testid="map-operation-hud-history"
      name="map-operation-chip"
      tag="ol"
    >
      <li key="inspect" class="map-operation-hud-inspect-item">
        <button
          data-testid="map-operation-hud-summary"
          type="button"
          @click="emit('inspect', turn.turnId)"
        >
          查看记录
        </button>
      </li>
      <li
        v-for="step in steps"
        :key="step.toolCallId"
        :data-status="step.status"
      >
        <span aria-hidden="true">
          {{
            step.status === "completed"
              ? "✓"
              : step.status === "running"
                ? steps.indexOf(step) + 1
                : "!"
          }}
        </span>
        <strong>{{ step.label }}</strong>
        <small v-if="step.status !== 'completed'">{{
          STATUS_LABELS[step.status]
        }}</small>
      </li>
    </TransitionGroup>
  </div>
</template>
