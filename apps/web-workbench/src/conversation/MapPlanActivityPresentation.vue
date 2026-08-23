<script setup lang="ts">
import { computed } from "vue";
import type { ConversationTurn } from "./conversation-store.js";
import { mapPlanFromTurn } from "./map-plan-activity.js";

const props = defineProps<{ turn: ConversationTurn }>();
const plan = computed(() => mapPlanFromTurn(props.turn));
const visibleSteps = computed(() =>
  plan.value?.steps.filter(
    (step) => step.status === "completed" || step.status === "running",
  ),
);
const isComplete = computed(() => plan.value?.status === "completed");
</script>

<template>
  <div
    v-if="plan !== undefined"
    class="map-plan-activity"
    :data-status="plan.status"
    data-testid="map-plan-activity"
    :role="isComplete ? undefined : 'status'"
  >
    <div class="map-plan-activity-header">
      <span class="map-plan-activity-mark" aria-hidden="true">A</span>
      <div class="map-plan-activity-heading">
        <p>{{ isComplete ? "Agent 研判摘要" : "Agent 正在研判" }}</p>
        <strong>{{ plan.goal }}</strong>
      </div>
      <span class="map-plan-activity-state">
        {{ isComplete ? "已完成" : "进行中" }}
      </span>
    </div>

    <ol class="map-plan-activity-findings" aria-label="研判进展">
      <li
        v-for="step in visibleSteps"
        :key="step.id"
        :data-status="step.status"
      >
        <span class="map-plan-activity-step-mark" aria-hidden="true">
          {{ step.status === "completed" ? "✓" : "" }}
        </span>
        <div>
          <small>
            {{ step.status === "completed" ? "阶段发现" : "当前研判" }}
          </small>
          <p>{{ step.outcome ?? step.label }}</p>
        </div>
      </li>
    </ol>

    <div
      v-if="isComplete && plan.decisionBoundary"
      class="map-plan-activity-boundary"
    >
      <small>待你决定</small>
      <p>{{ plan.decisionBoundary }}</p>
    </div>
  </div>
</template>
