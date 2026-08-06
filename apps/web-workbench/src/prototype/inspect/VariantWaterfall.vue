<script setup lang="ts">
// PROTOTYPE(issue #179)Variant C——瀑布甘特:横轴耗时,行=节点/子阶段,瓶颈与并行一眼可见,点击行看详情。
import { computed, ref } from "vue";
import {
  ARTIFACT_STATUS_LABEL,
  STATUS_LABEL,
  formatBytes,
  formatMs,
  type MockNode,
  type MockOperation,
  type MockSubStage,
  type MockTurn,
} from "./mockTurn";

const props = defineProps<{ turn: MockTurn }>();

const expandedRows = ref<Set<string>>(new Set(["op-201/run-301/ui-compiler-core"]));
const detail = ref<{ op: MockOperation; node: MockNode }>();

function toggleRow(key: string): void {
  const next = new Set(expandedRows.value);
  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }
  expandedRows.value = next;
}

function openDetail(op: MockOperation, node: MockNode): void {
  detail.value = { op, node };
}

interface StageBar {
  readonly stage: MockSubStage;
  readonly left: number;
  readonly width: number;
  readonly spanning: boolean;
}

function stageBars(node: MockNode): StageBar[] {
  const bars: StageBar[] = [];
  let cursor = 0;
  for (const stage of node.subStages) {
    if (stage.durationMs === undefined || node.durationMs === 0) {
      bars.push({ stage, left: 0, width: 100, spanning: true });
      continue;
    }
    const width = Math.max((stage.durationMs / node.durationMs) * 100, 2);
    bars.push({ stage, left: cursor, width, spanning: false });
    cursor += width;
  }
  return bars;
}

const maxDuration = computed(() =>
  Math.max(...props.turn.operations.map((op) => op.run.durationMs)),
);

const ticks = computed(() => {
  const total = maxDuration.value;
  const step = total > 4000 ? 1000 : 500;
  const list: number[] = [];
  for (let t = 0; t <= total; t += step) {
    list.push(t);
  }
  return list;
});
</script>

<template>
  <div class="variant-c">
    <div class="chart">
      <section v-for="op in turn.operations" :key="op.operationId" class="op-group">
        <div class="op-row">
          <span class="op-label">{{ op.label }}</span>
          <span v-if="op.source" class="op-source">{{ op.source }}</span>
          <span class="op-meta">
            {{ op.run.runId }} ·
            <span class="status" :data-status="op.run.status">{{ STATUS_LABEL[op.run.status] }}</span>
            · {{ formatMs(op.run.durationMs) }}
          </span>
        </div>

        <div class="scale">
          <span class="scale-spacer"></span>
          <div class="scale-track">
            <span
              v-for="tick in ticks"
              :key="tick"
              class="tick"
              :style="{ left: (tick / maxDuration) * 100 + '%' }"
            >
              {{ formatMs(tick) }}
            </span>
          </div>
        </div>

        <template v-for="node in op.run.nodes" :key="node.id">
          <div
            class="row"
            :class="{ selected: detail?.op.operationId === op.operationId && detail?.node.id === node.id }"
            @click="openDetail(op, node)"
          >
            <span class="row-label">
              <button class="row-toggle" type="button" @click.stop="toggleRow(op.operationId + '/' + op.run.runId + '/' + node.id)">
                {{ expandedRows.has(op.operationId + "/" + op.run.runId + "/" + node.id) ? "▴" : "▾" }}
              </button>
              {{ node.label }}
            </span>
            <div class="track">
              <div
                class="bar"
                :data-status="node.status"
                :style="{
                  left: (node.startMs / maxDuration) * 100 + '%',
                  width: Math.max((node.durationMs / maxDuration) * 100, node.status === 'skipped' ? 0 : 0.8) + '%',
                }"
                :title="node.label + ' · ' + STATUS_LABEL[node.status] + ' · ' + formatMs(node.durationMs)"
              >
                <span v-if="node.status === 'skipped'" class="bar-skipped">跳过</span>
                <span v-else-if="(node.durationMs / maxDuration) > 0.08" class="bar-text">
                  {{ formatMs(node.durationMs) }}
                </span>
              </div>
            </div>
          </div>

          <template v-if="expandedRows.has(op.operationId + '/' + op.run.runId + '/' + node.id)">
            <div v-for="bar in stageBars(node)" :key="bar.stage.name" class="row sub" @click="openDetail(op, node)">
              <span class="row-label sub-label">{{ bar.stage.name }}</span>
              <div class="track">
                <div
                  class="bar sub-bar"
                  :class="{ spanning: bar.spanning }"
                  :data-status="bar.stage.status"
                  :data-parallel="bar.stage.parallelGroup ? '' : undefined"
                  :style="{
                    left: ((node.startMs + (bar.left / 100) * node.durationMs) / maxDuration) * 100 + '%',
                    width: Math.max((bar.width / 100) * (node.durationMs / maxDuration) * 100, bar.spanning ? 0 : 0.5) + '%',
                  }"
                  :title="bar.stage.name + ' · ' + STATUS_LABEL[bar.stage.status]"
                >
                  <span v-if="bar.spanning" class="spanning-text">
                    {{ bar.stage.note ?? STATUS_LABEL[bar.stage.status] }}
                  </span>
                </div>
              </div>
            </div>
          </template>
        </template>
      </section>
    </div>

    <aside v-if="detail" class="panel">
      <header class="panel-head">
        <div>
          <strong>{{ detail.node.label }}</strong>
          <p class="panel-sub">
            {{ detail.op.operationId }} / {{ detail.op.run.runId }} ·
            <span class="status" :data-status="detail.node.status">{{ STATUS_LABEL[detail.node.status] }}</span>
            · 开始 +{{ formatMs(detail.node.startMs) }} · 耗时 {{ formatMs(detail.node.durationMs) }}
          </p>
        </div>
        <button class="panel-close" type="button" @click="detail = undefined">✕</button>
      </header>

      <p class="panel-summary">{{ detail.node.summary }}</p>
      <p v-if="detail.node.degradationReason" class="panel-degraded">
        降级原因:{{ detail.node.degradationReason }}
      </p>

      <section class="panel-group">
        <h3>子阶段</h3>
        <ul class="panel-stages">
          <li v-for="stage in detail.node.subStages" :key="stage.name" :data-status="stage.status">
            <span class="stage-name">{{ stage.name }}</span>
            <span class="stage-meta">
              {{ STATUS_LABEL[stage.status] }}
              <template v-if="stage.durationMs !== undefined">· {{ formatMs(stage.durationMs) }}</template>
            </span>
            <span v-if="stage.parallelGroup" class="tag-parallel">并行</span>
            <span v-if="stage.errorCode" class="stage-error">
              {{ stage.errorCode }}<template v-if="stage.fieldPath"> · {{ stage.fieldPath }}</template>
            </span>
            <span v-if="stage.note" class="stage-note">{{ stage.note }}</span>
          </li>
        </ul>
      </section>

      <section v-for="group in (['inputs', 'outputs'] as const)" :key="group" class="panel-group">
        <h3>{{ group === "inputs" ? "请求(输入)" : "返回(输出)" }}</h3>
        <p v-if="detail.node[group].length === 0" class="empty">无</p>
        <article
          v-for="artifact in detail.node[group]"
          :key="artifact.id"
          class="artifact"
          :data-excluded="artifact.status === 'excluded' ? '' : undefined"
        >
          <header class="artifact-head">
            <strong>{{ artifact.label }}</strong>
            <span class="artifact-status" :data-status="artifact.status">
              {{ ARTIFACT_STATUS_LABEL[artifact.status] }}
            </span>
          </header>
          <template v-if="artifact.status !== 'excluded'">
            <p class="artifact-meta">
              {{ artifact.contentType }} · {{ formatBytes(artifact.sizeBytes) }}
              <template v-if="artifact.hash"> · {{ artifact.hash }}</template>
            </p>
            <table v-if="artifact.preview" class="artifact-preview">
              <tbody>
                <tr v-for="row in artifact.preview" :key="row[0]">
                  <td>{{ row[0] }}</td>
                  <td>{{ row[1] }}</td>
                </tr>
              </tbody>
            </table>
          </template>
          <p v-else class="artifact-excluded">🔒 {{ artifact.note }}</p>
        </article>
      </section>
    </aside>
  </div>
</template>

<style scoped>
.variant-c {
  padding: 16px 20px 96px;
}

.chart {
  min-width: 900px;
}

.op-group {
  margin-bottom: 28px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 10px 14px 14px;
  background: #fff;
}

.op-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 8px;
}

.op-label {
  font-weight: 700;
  font-size: 13px;
}

.op-source {
  font-size: 12px;
  color: #7c5e10;
  background: #fef3c7;
  border: 1px solid #f5d98b;
  border-radius: 999px;
  padding: 1px 10px;
}

.op-meta {
  margin-left: auto;
  font-size: 12px;
  color: #6b7280;
}

.scale {
  display: flex;
  margin-bottom: 4px;
}

.scale-spacer {
  flex: 0 0 220px;
}

.scale-track {
  position: relative;
  flex: 1;
  height: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.tick {
  position: absolute;
  transform: translateX(-50%);
  font-size: 10px;
  color: #9ca3af;
}

.row {
  display: flex;
  align-items: center;
  height: 30px;
  cursor: pointer;
  border-radius: 6px;
}

.row:hover {
  background: #f9fafb;
}

.row.selected {
  background: #eff6ff;
}

.row-label {
  flex: 0 0 220px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sub-label {
  padding-left: 28px;
  color: #6b7280;
}

.row-toggle {
  border: none;
  background: none;
  cursor: pointer;
  color: #9ca3af;
  font-size: 10px;
  padding: 0 2px;
}

.track {
  position: relative;
  flex: 1;
  height: 100%;
}

.bar {
  position: absolute;
  top: 6px;
  height: 18px;
  border-radius: 4px;
  background: #16a34a;
  color: #fff;
  font-size: 10px;
  display: flex;
  align-items: center;
  padding: 0 6px;
  box-sizing: border-box;
  overflow: visible;
  white-space: nowrap;
}

.bar[data-status="degraded"] {
  background: #d97706;
}

.bar[data-status="failed"] {
  background: #dc2626;
}

.bar[data-status="skipped"] {
  background: transparent;
  border: 1px dashed #d1d5db;
  color: #9ca3af;
  width: auto !important;
  padding: 0 8px;
}

.bar-skipped {
  font-size: 10px;
}

.sub-bar {
  top: 8px;
  height: 14px;
  opacity: 0.85;
}

.sub-bar[data-status="skipped"],
.sub-bar[data-status="not-started"] {
  background: repeating-linear-gradient(45deg, #e5e7eb, #e5e7eb 4px, #f9fafb 4px, #f9fafb 8px);
  color: #9ca3af;
}

.sub-bar[data-parallel] {
  background: #7c3aed;
}

.sub-bar.spanning {
  background: transparent;
  border: none;
  color: #6b7280;
}

.spanning-text {
  font-size: 10px;
}

.status[data-status="completed"] {
  color: #15803d;
}

.status[data-status="degraded"] {
  color: #b45309;
}

.status[data-status="failed"] {
  color: #b91c1c;
}

.status[data-status="skipped"] {
  color: #9ca3af;
}

.panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 400px;
  background: #fff;
  border-left: 1px solid #d1d5db;
  box-shadow: -8px 0 24px rgb(0 0 0 / 8%);
  padding: 16px;
  overflow-y: auto;
  z-index: 20;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.panel-sub {
  font-size: 12px;
  color: #6b7280;
  margin: 4px 0 0;
}

.panel-close {
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
}

.panel-summary {
  font-size: 12px;
  color: #4b5563;
}

.panel-degraded {
  font-size: 12px;
  color: #92400e;
  background: #fef3c7;
  border-radius: 6px;
  padding: 6px 8px;
}

.panel-group h3 {
  font-size: 13px;
  margin: 16px 0 8px;
}

.panel-stages {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
  font-size: 12px;
}

.panel-stages li {
  border-left: 3px solid #16a34a;
  background: #f9fafb;
  border-radius: 4px;
  padding: 4px 8px;
}

.panel-stages li[data-status="failed"] {
  border-left-color: #dc2626;
  background: #fef2f2;
}

.panel-stages li[data-status="skipped"],
.panel-stages li[data-status="not-started"] {
  border-left-color: #d1d5db;
  color: #9ca3af;
}

.stage-name {
  font-weight: 600;
  margin-right: 8px;
}

.stage-meta {
  color: #6b7280;
}

.stage-note {
  display: block;
  color: #6b7280;
}

.stage-error {
  display: block;
  color: #b91c1c;
  font-family: ui-monospace, monospace;
}

.tag-parallel {
  font-size: 10px;
  color: #7c3aed;
  border: 1px solid #ddd6fe;
  background: #f5f3ff;
  border-radius: 999px;
  padding: 0 6px;
  margin-left: 6px;
}

.artifact {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px 10px;
  margin-bottom: 8px;
}

.artifact[data-excluded] {
  border-style: dashed;
  background: #fffbeb;
}

.artifact-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.artifact-status {
  font-size: 11px;
  border-radius: 999px;
  padding: 0 8px;
  background: #ecfdf5;
  color: #15803d;
}

.artifact-status[data-status="stored"] {
  background: #eff6ff;
  color: #1d4ed8;
}

.artifact-status[data-status="excluded"] {
  background: #fef3c7;
  color: #92400e;
}

.artifact-meta {
  font-size: 11px;
  color: #6b7280;
  margin: 4px 0;
}

.artifact-preview {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.artifact-preview td {
  border-top: 1px solid #f3f4f6;
  padding: 3px 4px;
  vertical-align: top;
}

.artifact-preview td:first-child {
  color: #6b7280;
  white-space: nowrap;
  width: 40%;
}

.artifact-excluded {
  font-size: 12px;
  color: #92400e;
  margin: 6px 0 0;
}

.empty {
  font-size: 12px;
  color: #9ca3af;
}
</style>
