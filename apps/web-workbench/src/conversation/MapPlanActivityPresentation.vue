<script setup lang="ts">
import { computed } from "vue";
import type { ConversationTurn } from "./conversation-store.js";
import { mapPlanFromTurn } from "./map-plan-activity.js";

const props = defineProps<{ turn: ConversationTurn }>();
const plan = computed(() => mapPlanFromTurn(props.turn));
</script>

<template>
  <div
    v-if="turn.status === 'pending' && plan !== undefined"
    class="map-plan-activity"
    data-testid="map-plan-activity"
    role="status"
  >
    <span class="map-plan-activity-indicator" aria-hidden="true"></span>
    <div class="map-plan-activity-copy">
      <p>Agent 正在处理地图</p>
      <strong>{{ plan.goal }}</strong>
    </div>
  </div>
</template>
