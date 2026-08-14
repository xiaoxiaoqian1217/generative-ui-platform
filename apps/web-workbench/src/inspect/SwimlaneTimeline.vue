<script setup lang="ts">
import { computed } from "vue";
import {
  correlationKeyOf,
  lanesFromObservations,
  OBSERVATION_SOURCE_LABELS,
  type ObservationSource,
  type TurnObservation,
} from "./turn-inspection.js";

/**
 * Issue #205 / #179 Resolution（变体 B）：泳道时间线。
 * - 泳道来自真实观察到的 participant / source，不存在的 participant 不显示；
 * - 事件按 Workbench observed order 落列，gutter 显示序号与观察时间偏移，
 *   不伪造 authoritative sequence；
 * - duration / status 只在真实存在时呈现；
 * - 关联（toolCallId / interruptId）只在真实存在对应关系时高亮。
 */

const props = defineProps<{
  activeCorrelationKey?: string | undefined;
  observations: readonly TurnObservation[];
  selectedId?: string | undefined;
}>();

const emit = defineEmits<{ select: [id: string] }>();

const lanes = computed(() => lanesFromObservations(props.observations));

const gridColumns = computed(
  () => `88px repeat(${Math.max(lanes.value.length, 1)}, minmax(0, 1fr))`,
);

const firstObservedAt = computed(() =>
  props.observations.length === 0
    ? undefined
    : Date.parse(props.observations[0]?.observedAt ?? ""),
);

function offsetLabel(item: TurnObservation): string {
  const first = firstObservedAt.value;
  const current = Date.parse(item.observedAt);
  if (first === undefined || Number.isNaN(first) || Number.isNaN(current))
    return "+0ms";
  return `+${Math.max(0, current - first)}ms`;
}

/** 泳道头着色仅是对该泳道内真实事件状态的汇总，不推断新事实。 */
function laneRollup(lane: ObservationSource): string | undefined {
  const items = props.observations.filter((item) => item.source === lane);
  if (items.some((item) => item.status === "failed")) return "failed";
  if (items.some((item) => item.status === "interrupted")) return "interrupted";
  return undefined;
}
</script>

<template>
  <div class="swimlane-timeline" data-testid="swimlane-timeline">
    <p v-if="observations.length === 0" data-testid="timeline-empty">
      该 Turn 没有可观察事实记录。
    </p>

    <div v-else class="lane-board">
      <div class="lane-header-row" :style="{ gridTemplateColumns: gridColumns }">
        <div class="seq-corner">seq</div>
        <div
          v-for="lane in lanes"
          :key="lane"
          class="lane-head"
          :data-rollup="laneRollup(lane)"
          :data-testid="`timeline-lane-${lane}`"
        >
          {{ OBSERVATION_SOURCE_LABELS[lane] }}
        </div>
      </div>

      <div class="lane-body">
        <div
          v-for="item in observations"
          :key="item.id"
          class="lane-row"
          :style="{ gridTemplateColumns: gridColumns }"
        >
          <div class="seq-cell">
            <code>#{{ item.observedIndex }}</code>
            <span>{{ offsetLabel(item) }}</span>
          </div>
            <div v-for="lane in lanes" :key="lane" class="lane-cell">
            <button
              v-if="item.source === lane"
              class="event-chip"
              :class="{
                'event-chip-selected': item.id === selectedId,
              }"
              :data-correlated="
                activeCorrelationKey !== undefined &&
                correlationKeyOf(item) === activeCorrelationKey
                  ? 'true'
                  : undefined
              "
              :data-lane="item.source"
              :data-status="item.status ?? 'ok'"
              :data-testid="`timeline-node-${item.id}`"
              :data-type="item.type"
              type="button"
              @click="emit('select', item.id)"
            >
              <span class="event-kind">{{ item.type }}</span>
              <span
                v-if="item.status || item.durationMs !== undefined"
                class="event-meta"
              >
                <span v-if="item.status">{{ item.status }}</span>
                <span v-if="item.durationMs !== undefined"
                  >{{ item.durationMs }}ms</span
                >
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
