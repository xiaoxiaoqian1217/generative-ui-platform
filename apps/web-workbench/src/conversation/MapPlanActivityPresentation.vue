<script setup lang="ts">
import { computed } from "vue";
import type { ConversationTurn } from "./conversation-store.js";
import { mapPlanFromTurn } from "./map-plan-activity.js";

const props = defineProps<{ turn: ConversationTurn }>();
const plan = computed(() => mapPlanFromTurn(props.turn));

const STATUS_LABELS = {
  cancelled: "已取消",
  completed: "已完成",
  failed: "失败",
  pending: "待执行",
  running: "执行中",
} as const;
</script>

<template>
  <section
    v-if="plan !== undefined"
    class="map-plan-activity"
    data-testid="map-plan-activity"
  >
    <header class="map-plan-activity-header">
      <div class="map-plan-activity-goal">
        <p class="eyebrow">AGENT PLAN</p>
        <strong>{{ plan.goal }}</strong>
      </div>
      <span class="map-plan-activity-status" :data-status="plan.status">
        {{ STATUS_LABELS[plan.status] }}
      </span>
    </header>
    <ol>
      <li
        v-for="(step, index) in plan.steps"
        :key="step.id"
        :data-status="step.status"
      >
        <span class="map-plan-activity-index" aria-hidden="true">
          {{ step.status === "completed" ? "✓" : index + 1 }}
        </span>
        <div class="map-plan-activity-copy">
          <strong>{{ step.label }}</strong>
          <p>{{ step.detail }}</p>
        </div>
        <small class="map-plan-activity-step-status">
          {{ STATUS_LABELS[step.status] }}
        </small>
      </li>
    </ol>
  </section>
</template>
