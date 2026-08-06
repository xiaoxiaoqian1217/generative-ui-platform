<script setup lang="ts">
// PROTOTYPE(issue #179)Variant B——垂直时间线:按 sequence 排列,节点分色,详情内联展开,同步状态尺在顶部。
import { computed, ref } from "vue";
import {
  ARTIFACT_STATUS_LABEL,
  STATUS_LABEL,
  formatBytes,
  formatMs,
  type MockNode,
  type MockTurn,
} from "./mockTurn";

const props = defineProps<{ turn: MockTurn }>();

interface TimelineEntry {
  readonly key: string;
  readonly operationLabel: string;
  readonly source?: string;
  readonly runId: string;
  readonly node: MockNode;
  readonly firstInOperation: boolean;
}

const entries = computed<TimelineEntry[]>(() => {
  const list: TimelineEntry[] = [];
  for (const op of props.turn.operations) {
    let first = true;
    for (const node of [...op.run.nodes].sort((a, b) => a.startMs - b.startMs)) {
      list.push({
        key: `${op.operationId}/${node.id}`,
        operationLabel: op.label,
        ...(op.source === undefined ? {} : { source: op.source }),
        runId: op.run.runId,
        node,
        firstInOperation: first,
      });
      first = false;
    }
  }
  return list;
});

const expanded = ref<Set<string>>(new Set());

function toggle(key: string): void {
  const next = new Set(expanded.value);
  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }
  expanded.value = next;
}

const NODE_COLORS: Record<string, string> = {
  workbench: "#0ea5e9",
  "runtime-host": "#6366f1",
  "agent-adapter": "#8b5cf6",
  "business-agent": "#16a34a",
  "presentation-pipeline": "#d97706",
  "ui-compiler-core": "#dc2626",
};

const syncPercent = computed(() =>
  Math.round((props.turn.sync.persistedSequence / props.turn.sync.observedSequence) * 100),
);
</script>

<template>
  <div class="variant-b">
    <section class="sync-ruler" :class="{ gap: turn.sync.hasGap }">
      <div class="sync-bar">
        <div class="sync-persisted" :style="{ width: syncPercent + '%' }"></div>
      </div>
      <p class="sync-text">
        已持久化 sequence {{ turn.sync.persistedSequence }} / 观察到 {{ turn.sync.observedSequence }} ·
        尾部 {{ turn.sync.observedSequence - turn.sync.persistedSequence }} 条为实时事件(未持久化) ·
        revision {{ turn.sync.revision }}
        <strong v-if="turn.sync.hasGap" class="sync-gap">⚠ 存在缺口,诊断可能不完整</strong>
      </p>
    </section>

    <div class="timeline">
      <template v-for="entry in entries" :key="entry.key">
        <div v-if="entry.firstInOperation" class="op-divider">
          <span class="op-divider-label">{{ entry.operationLabel }}</span>
          <span v-if="entry.source" class="op-divider-source">{{ entry.source }}</span>
        </div>

        <article class="entry" :style="`--node-color: ${NODE_COLORS[entry.node.id] ?? '#9ca3af'}`">
          <button class="entry-head" type="button" @click="toggle(entry.key)">
            <span class="entry-status" :data-status="entry.node.status"></span>
            <strong class="entry-label">{{ entry.node.label }}</strong>
            <span class="status" :data-status="entry.node.status">{{ STATUS_LABEL[entry.node.status] }}</span>
            <span class="entry-time">+{{ formatMs(entry.node.startMs) }} · {{ formatMs(entry.node.durationMs) }}</span>
            <span class="entry-chevron">{{ expanded.has(entry.key) ? "▴" : "▾" }}</span>
          </button>

          <p class="entry-summary">{{ entry.node.summary }}</p>
          <p v-if="entry.node.degradationReason" class="entry-degraded">
            ↳ 降级:{{ entry.node.degradationReason }}
          </p>

          <div v-if="expanded.has(entry.key)" class="entry-detail">
            <section class="detail-block">
              <h4>子阶段</h4>
              <ul class="stage-list">
                <li
                  v-for="stage in entry.node.subStages"
                  :key="stage.name"
                  class="stage"
                  :data-status="stage.status"
                >
                  <span class="stage-name">{{ stage.name }}</span>
                  <span class="stage-meta">
                    {{ STATUS_LABEL[stage.status] }}
                    <template v-if="stage.durationMs !== undefined">· {{ formatMs(stage.durationMs) }}</template>
                  </span>
                  <span v-if="stage.parallelGroup" class="tag-parallel">与另一投影并行</span>
                  <span v-if="stage.errorCode" class="stage-error">
                    {{ stage.errorCode }}<template v-if="stage.fieldPath"> · {{ stage.fieldPath }}</template>
                  </span>
                  <span v-if="stage.note" class="stage-note">{{ stage.note }}</span>
                </li>
              </ul>
            </section>

            <section class="detail-block">
              <h4>请求(输入)</h4>
              <article
                v-for="artifact in entry.node.inputs"
                :key="artifact.id"
                class="artifact"
                :data-excluded="artifact.status === 'excluded' ? '' : undefined"
              >
                <header class="artifact-head">
                  <span class="io-tag in">→ 请求</span>
                  <strong>{{ artifact.label }}</strong>
                  <span class="artifact-status" :data-status="artifact.status">
                    {{ ARTIFACT_STATUS_LABEL[artifact.status] }}
                  </span>
                </header>
                <template v-if="artifact.status !== 'excluded'">
                  <p class="artifact-meta">
                    {{ artifact.contentType }} · {{ formatBytes(artifact.sizeBytes) }}
                    <template v-if="artifact.hash">· {{ artifact.hash }}</template>
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
              <p v-if="entry.node.inputs.length === 0" class="empty">无</p>
            </section>

            <section class="detail-block">
              <h4>返回(输出)</h4>
              <article
                v-for="artifact in entry.node.outputs"
                :key="artifact.id"
                class="artifact"
                :data-excluded="artifact.status === 'excluded' ? '' : undefined"
              >
                <header class="artifact-head">
                  <span class="io-tag out">← 返回</span>
                  <strong>{{ artifact.label }}</strong>
                  <span class="artifact-status" :data-status="artifact.status">
                    {{ ARTIFACT_STATUS_LABEL[artifact.status] }}
                  </span>
                </header>
                <template v-if="artifact.status !== 'excluded'">
                  <p class="artifact-meta">
                    {{ artifact.contentType }} · {{ formatBytes(artifact.sizeBytes) }}
                    <template v-if="artifact.hash">· {{ artifact.hash }}</template>
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
              <p v-if="entry.node.outputs.length === 0" class="empty">无</p>
            </section>
          </div>
        </article>
      </template>

      <div class="tail-hint">
        — 以下 {{ turn.sync.observedSequence - turn.sync.persistedSequence }} 条实时事件尚未持久化,刷新后以持久化记录为准 —
      </div>
    </div>
  </div>
</template>

<style scoped>
.variant-b {
  max-width: 860px;
  margin: 0 auto;
  padding: 16px 20px 96px;
}

.sync-ruler {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 20px;
  background: #fff;
}

.sync-ruler.gap {
  border-color: #dc2626;
}

.sync-bar {
  height: 8px;
  border-radius: 999px;
  background: repeating-linear-gradient(45deg, #e5e7eb, #e5e7eb 6px, #f9fafb 6px, #f9fafb 12px);
  overflow: hidden;
}

.sync-persisted {
  height: 100%;
  background: #16a34a;
}

.sync-text {
  font-size: 12px;
  color: #4b5563;
  margin: 6px 0 0;
}

.sync-gap {
  color: #b91c1c;
}

.timeline {
  position: relative;
  padding-left: 20px;
}

.timeline::before {
  content: "";
  position: absolute;
  left: 6px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #e5e7eb;
}

.op-divider {
  position: relative;
  margin: 18px 0 10px -20px;
  padding-left: 20px;
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.op-divider-label {
  font-weight: 700;
  font-size: 13px;
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  border-radius: 999px;
  padding: 2px 12px;
}

.op-divider-source {
  font-size: 12px;
  color: #7c5e10;
}

.entry {
  position: relative;
  border: 1px solid #e5e7eb;
  border-left: 4px solid var(--node-color, #9ca3af);
  border-radius: 8px;
  background: #fff;
  margin-bottom: 10px;
  padding: 8px 12px;
}

.entry::before {
  content: "";
  position: absolute;
  left: -16px;
  top: 14px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--node-color, #9ca3af);
}

.entry-head {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  border: none;
  background: none;
  padding: 0;
  font-size: 13px;
  cursor: pointer;
  text-align: left;
}

.entry-status {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #9ca3af;
}

.entry-status[data-status="completed"] {
  background: #16a34a;
}

.entry-status[data-status="degraded"] {
  background: #d97706;
}

.entry-status[data-status="failed"] {
  background: #dc2626;
}

.entry-status[data-status="skipped"] {
  background: #d1d5db;
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

.entry-time {
  margin-left: auto;
  font-size: 12px;
  color: #6b7280;
}

.entry-chevron {
  color: #9ca3af;
}

.entry-summary {
  font-size: 12px;
  color: #4b5563;
  margin: 6px 0 0;
}

.entry-degraded {
  font-size: 12px;
  color: #92400e;
  margin: 4px 0 0;
}

.entry-detail {
  margin-top: 10px;
  border-top: 1px dashed #e5e7eb;
  padding-top: 8px;
  display: grid;
  gap: 12px;
}

.detail-block h4 {
  font-size: 12px;
  color: #6b7280;
  margin: 0 0 6px;
}

.stage-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
}

.stage {
  font-size: 12px;
  border-left: 3px solid #16a34a;
  background: #f9fafb;
  border-radius: 4px;
  padding: 4px 8px;
}

.stage[data-status="failed"] {
  border-left-color: #dc2626;
  background: #fef2f2;
}

.stage[data-status="skipped"],
.stage[data-status="not-started"] {
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

.stage-note,
.stage-error {
  display: block;
  color: #6b7280;
}

.stage-error {
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
  padding: 6px 10px;
  margin-bottom: 6px;
}

.artifact[data-excluded] {
  border-style: dashed;
  background: #fffbeb;
}

.artifact-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.io-tag {
  font-size: 10px;
  border-radius: 999px;
  padding: 0 6px;
}

.io-tag.in {
  background: #eff6ff;
  color: #1d4ed8;
}

.io-tag.out {
  background: #f5f3ff;
  color: #6d28d9;
}

.artifact-status {
  margin-left: auto;
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
  width: 36%;
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

.tail-hint {
  margin-top: 14px;
  font-size: 12px;
  color: #6b7280;
  border: 1px dashed #d1d5db;
  border-radius: 8px;
  padding: 8px 12px;
  text-align: center;
}
</style>
