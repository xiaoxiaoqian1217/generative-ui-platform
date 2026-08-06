<script setup lang="ts">
// PROTOTYPE(issue-179)：变体 B —— 泳道时间线优先。
// 六个节点作为纵向泳道列，事件按 sequence 落到列上；点击事件在右侧打开详情。
import { computed, ref, watch } from "vue";
import JsonTree from "./JsonTree.vue";
import StatusPill from "./StatusPill.vue";
import {
  NODE_LABELS,
  NODE_ORDER,
  type ProtoNodeId,
  type ProtoScenario,
  type ProtoStatus,
  type ProtoTimelineEvent,
} from "./model.js";

const props = defineProps<{ scenario: ProtoScenario }>();

const selectedSequence = ref<number>();
watch(
  () => props.scenario,
  () => {
    selectedSequence.value = undefined;
  },
);

const nodeStatus = computed(() => {
  const map = new Map<ProtoNodeId, { status: ProtoStatus; durationMs?: number | undefined }>();
  for (const operation of props.scenario.turn.operations) {
    for (const node of operation.nodes) {
      map.set(node.id, { status: node.status, durationMs: node.durationMs });
    }
  }
  return map;
});

interface LaneRow {
  key: string;
  kind: "event" | "gap";
  event?: ProtoTimelineEvent;
  gapAfter?: number;
  gapCount?: number;
}

const rows = computed<LaneRow[]>(() => {
  const result: LaneRow[] = [];
  const gap = props.scenario.turn.gap;
  let gapInserted = false;
  for (const event of props.scenario.turn.timeline) {
    if (gap !== undefined && !gapInserted && event.sequence > gap.afterSequence) {
      result.push({ key: `gap-${gap.afterSequence}`, kind: "gap", gapAfter: gap.afterSequence, gapCount: gap.missingCount });
      gapInserted = true;
    }
    result.push({ key: `ev-${event.sequence}`, kind: "event", event });
  }
  if (gap !== undefined && !gapInserted) {
    result.push({ key: `gap-${gap.afterSequence}`, kind: "gap", gapAfter: gap.afterSequence, gapCount: gap.missingCount });
  }
  return result;
});

function laneStatus(id: ProtoNodeId): ProtoStatus | undefined {
  return nodeStatus.value.get(id)?.status;
}

const selectedEvent = computed(() =>
  props.scenario.turn.timeline.find((event) => event.sequence === selectedSequence.value),
);

const selectedContext = computed(() => {
  const event = selectedEvent.value;
  if (event === undefined) return undefined;
  for (const operation of props.scenario.turn.operations) {
    const node = operation.nodes.find((item) => item.id === event.node);
    if (node === undefined) continue;
    const stage = node.substages.find((item) => event.label.includes(item.label) || item.label.includes(event.label));
    const exchange = node.exchanges.find((item) => event.label.includes(item.label) || item.label.includes(event.label));
    return { node, stage, exchange };
  }
  return undefined;
});
</script>

<template>
  <div class="variant-b">
    <header class="turn-header">
      <div>
        <p class="eyebrow">TURN {{ scenario.turn.turnId }}</p>
        <h3>{{ scenario.turn.title }}</h3>
      </div>
      <div class="turn-meta">
        <StatusPill :status="scenario.turn.status" />
        <span>{{ scenario.turn.startedAt }}</span>
        <span>总耗时 {{ scenario.turn.durationMs }} ms</span>
      </div>
    </header>

    <div class="lane-layout">
      <div class="lane-board">
        <div class="lane-header-row">
          <div class="seq-corner">seq</div>
          <div v-for="id in NODE_ORDER" :key="id" class="lane-head" :data-status="laneStatus(id)">
            <strong>{{ NODE_LABELS[id] }}</strong>
            <StatusPill v-if="laneStatus(id)" :status="laneStatus(id)!" />
            <span class="lane-duration">{{ nodeStatus.get(id)?.durationMs !== undefined ? `${nodeStatus.get(id)!.durationMs} ms` : "—" }}</span>
          </div>
        </div>

        <div class="lane-body">
          <template v-for="row in rows" :key="row.key">
            <div v-if="row.kind === 'gap'" class="gap-row">
              <span>⚠ sequence {{ (row.gapAfter ?? 0) + 1 }}–{{ (row.gapAfter ?? 0) + (row.gapCount ?? 0) }} 缺失 {{ row.gapCount }} 个事件，诊断可能不完整</span>
            </div>
            <div v-else-if="row.event" class="lane-row">
              <div class="seq-cell">
                <code>#{{ row.event.sequence }}</code>
                <span>+{{ row.event.atOffsetMs }}ms</span>
              </div>
              <div v-for="id in NODE_ORDER" :key="id" class="lane-cell">
                <button
                  v-if="row.event.node === id"
                  type="button"
                  class="event-chip"
                  :data-status="row.event.status ?? 'ok'"
                  :class="{ selected: selectedSequence === row.event.sequence }"
                  @click="selectedSequence = row.event.sequence"
                >
                  <span class="event-kind">{{ row.event.kind }}</span>
                  <span class="event-label">{{ row.event.label }}</span>
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>

      <aside class="event-detail">
        <template v-if="selectedEvent">
          <p class="eyebrow">EVENT #{{ selectedEvent.sequence }}</p>
          <h4>{{ selectedEvent.label }}</h4>
          <dl>
            <div><dt>节点</dt><dd>{{ NODE_LABELS[selectedEvent.node] }}</dd></div>
            <div><dt>类型</dt><dd>{{ selectedEvent.kind }}</dd></div>
            <div><dt>时间偏移</dt><dd>+{{ selectedEvent.atOffsetMs }} ms</dd></div>
            <div><dt>状态</dt><dd><StatusPill :status="selectedEvent.status ?? 'ok'" /></dd></div>
          </dl>
          <template v-if="selectedContext?.exchange">
            <h5>关联请求与返回（原始 JSON 直通）</h5>
            <p class="ctx-line"><strong>{{ selectedContext.exchange.label }}</strong></p>
            <div v-if="selectedContext.exchange.request" class="ctx-block">
              <span class="ctx-side">→ 请求<template v-if="selectedContext.exchange.request.artifact"> · {{ selectedContext.exchange.request.artifact.label }} <StatusPill :artifact="selectedContext.exchange.request.artifact.state" /></template></span>
              <JsonTree v-if="selectedContext.exchange.request.payload !== undefined" :value="selectedContext.exchange.request.payload" />
              <p v-else class="ctx-note">{{ selectedContext.exchange.request.summary }}</p>
            </div>
            <div v-if="selectedContext.exchange.response" class="ctx-block">
              <span class="ctx-side">← 返回<template v-if="selectedContext.exchange.response.artifact"> · {{ selectedContext.exchange.response.artifact.label }} <StatusPill :artifact="selectedContext.exchange.response.artifact.state" /></template></span>
              <JsonTree v-if="selectedContext.exchange.response.payload !== undefined" :value="selectedContext.exchange.response.payload" />
              <p v-else class="ctx-note">{{ selectedContext.exchange.response.summary }}</p>
            </div>
            <p v-if="selectedContext.exchange.note" class="ctx-note">{{ selectedContext.exchange.note }}</p>
          </template>
          <template v-else-if="selectedContext?.stage">
            <h5>关联子阶段</h5>
            <p class="ctx-line">
              {{ selectedContext.stage.label }}
              <StatusPill :status="selectedContext.stage.status" />
              <span v-if="selectedContext.stage.durationMs !== undefined">{{ selectedContext.stage.durationMs }} ms</span>
            </p>
            <p v-if="selectedContext.stage.errorCode" class="ctx-line">错误代码：<code>{{ selectedContext.stage.errorCode }}</code></p>
            <p v-if="selectedContext.stage.fieldPath" class="ctx-line">字段路径：<code>{{ selectedContext.stage.fieldPath }}</code></p>
          </template>
          <p v-else class="ctx-note">该事件属于 {{ NODE_LABELS[selectedEvent.node] }} 节点的常规过程事件。</p>
        </template>
        <template v-else>
          <p class="eyebrow">EVENT DETAIL</p>
          <p class="ctx-note">点击左侧任一事件芯片查看请求/返回、子阶段与关联详情。</p>
        </template>
      </aside>
    </div>

    <footer class="persistence-line">
      诊断持久化：事件 {{ scenario.turn.persistence.eventsSaved }}/{{ scenario.turn.persistence.eventsTotal }}
      <span v-if="scenario.turn.persistence.note"> · {{ scenario.turn.persistence.note }}</span>
      <span class="lane-hint">同列事件按 sequence 排序；并行投影以相同时间偏移呈现。</span>
    </footer>
  </div>
</template>

<style scoped>
.variant-b {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.turn-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.turn-header h3 {
  margin: 0;
}

.turn-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--muted);
  font-size: 0.78rem;
  white-space: nowrap;
}

.lane-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 14px;
  align-items: start;
}

.lane-board {
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--paper);
  overflow: hidden;
}

.lane-header-row,
.lane-row {
  display: grid;
  grid-template-columns: 92px repeat(6, minmax(0, 1fr));
}

.lane-header-row {
  position: sticky;
  top: 0;
  background: var(--paper-strong);
  border-bottom: 1px solid var(--line);
}

.seq-corner {
  padding: 10px;
  color: var(--muted);
  font-size: 0.7rem;
  font-weight: 800;
}

.lane-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  border-left: 1px solid var(--line);
}

.lane-head[data-status="failed"] {
  background: color-mix(in srgb, var(--red) 7%, white);
}

.lane-head[data-status="degraded"] {
  background: color-mix(in srgb, var(--amber) 8%, white);
}

.lane-head[data-status="skipped"] {
  opacity: 0.65;
}

.lane-head strong {
  font-size: 0.72rem;
}

.lane-duration {
  color: var(--muted);
  font-size: 0.68rem;
}

.seq-cell {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 4px 10px;
  color: var(--muted);
  font-size: 0.7rem;
  border-top: 1px solid color-mix(in srgb, var(--line) 55%, transparent);
}

.lane-cell {
  padding: 4px 6px;
  border-left: 1px solid color-mix(in srgb, var(--line) 55%, transparent);
  border-top: 1px solid color-mix(in srgb, var(--line) 55%, transparent);
  min-height: 40px;
}

.event-chip {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  padding: 5px 8px;
  border: 1px solid var(--line);
  border-left-width: 4px;
  border-radius: 6px;
  background: var(--paper-strong);
  cursor: pointer;
  text-align: left;
}

.event-chip.selected {
  outline: 2px solid var(--accent);
}

.event-chip[data-status="failed"] {
  border-left-color: var(--red);
  background: color-mix(in srgb, var(--red) 6%, white);
}

.event-chip[data-status="degraded"] {
  border-left-color: var(--amber);
  background: color-mix(in srgb, var(--amber) 8%, white);
}

.event-chip[data-status="ok"] {
  border-left-color: var(--green);
}

.event-kind {
  color: var(--muted);
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.event-label {
  font-size: 0.72rem;
  line-height: 1.4;
}

.gap-row {
  padding: 8px 12px;
  border-top: 1px dashed var(--red);
  border-bottom: 1px dashed var(--red);
  background: repeating-linear-gradient(
    -45deg,
    color-mix(in srgb, var(--red) 5%, white) 0 8px,
    transparent 8px 16px
  );
  color: var(--red);
  font-size: 0.75rem;
  font-weight: 700;
}

.event-detail {
  position: sticky;
  top: 96px;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--paper-strong);
}

.event-detail h4 {
  margin: 0 0 10px;
  font-size: 0.9rem;
}

.event-detail h5 {
  margin: 14px 0 6px;
  font-size: 0.75rem;
  color: var(--muted);
  letter-spacing: 0.08em;
}

.event-detail dl {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
}

.event-detail dl div {
  display: flex;
  gap: 8px;
  font-size: 0.78rem;
}

.event-detail dt {
  min-width: 64px;
  color: var(--muted);
}

.event-detail dd {
  margin: 0;
}

.ctx-line {
  margin: 4px 0;
  font-size: 0.78rem;
  line-height: 1.55;
}

.ctx-block {
  margin: 8px 0;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--paper);
  overflow-x: auto;
}

.ctx-side {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  color: var(--muted);
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.1em;
}

.ctx-note {
  color: var(--muted);
  font-size: 0.78rem;
  line-height: 1.55;
}

.persistence-line {
  display: flex;
  gap: 14px;
  color: var(--muted);
  font-size: 0.78rem;
}

.lane-hint {
  margin-left: auto;
}
</style>
