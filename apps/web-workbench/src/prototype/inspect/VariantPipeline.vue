<script setup lang="ts">
// PROTOTYPE(issue #179)Variant A——六列管道泳道:节点为列,箭头表达请求/返回流向,右侧抽屉看安全输入输出。
import { computed, ref } from "vue";
import {
  ARTIFACT_STATUS_LABEL,
  STATUS_LABEL,
  formatBytes,
  formatMs,
  type MockArtifact,
  type MockNode,
  type MockOperation,
  type MockTurn,
} from "./mockTurn";

defineProps<{ turn: MockTurn }>();

const expandedStages = ref<Set<string>>(new Set());
const detailNode = ref<{ op: MockOperation; node: MockNode }>();

function toggleStages(key: string): void {
  const next = new Set(expandedStages.value);
  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }
  expandedStages.value = next;
}

function openDetail(op: MockOperation, node: MockNode): void {
  detailNode.value = { op, node };
}

function closeDetail(): void {
  detailNode.value = undefined;
}

const detailArtifacts = computed(() => {
  if (!detailNode.value) return { inputs: [], outputs: [] };
  return {
    inputs: detailNode.value.node.inputs,
    outputs: detailNode.value.node.outputs,
  };
});

function failedCount(node: MockNode): number {
  return node.subStages.filter((stage) => stage.status === "failed").length;
}
</script>

<template>
  <div class="variant-a">
    <section v-for="op in turn.operations" :key="op.operationId" class="op-block">
      <header class="op-head">
        <span class="op-label">{{ op.label }}</span>
        <span v-if="op.source" class="op-source">{{ op.source }}</span>
        <span class="op-meta">
          {{ op.run.runId }} ·
          <span class="status" :data-status="op.run.status">{{ STATUS_LABEL[op.run.status] }}</span>
          · {{ formatMs(op.run.durationMs) }}
        </span>
      </header>

      <div class="pipeline">
        <template v-for="(node, index) in op.run.nodes" :key="node.id">
          <div v-if="index > 0" class="edge" aria-hidden="true">
            <span class="edge-req">请求 →</span>
            <span class="edge-res">← 返回</span>
          </div>

          <article
            class="node-card"
            :data-status="node.status"
            :class="{ selected: detailNode?.node.id === node.id && detailNode?.op.operationId === op.operationId }"
            @click="openDetail(op, node)"
          >
            <header class="node-head">
              <span class="node-status" :data-status="node.status"></span>
              <strong>{{ node.label }}</strong>
            </header>
            <p class="node-meta">
              <span class="status" :data-status="node.status">{{ STATUS_LABEL[node.status] }}</span>
              · {{ formatMs(node.durationMs) }}
            </p>
            <p class="node-summary">{{ node.summary }}</p>
            <p v-if="node.degradationReason" class="node-degraded">↳ {{ node.degradationReason }}</p>

            <button
              class="stages-toggle"
              type="button"
              @click.stop="toggleStages(op.operationId + '/' + node.id)"
            >
              子阶段 {{ node.subStages.length }} 个
              <template v-if="failedCount(node) > 0"> · {{ failedCount(node) }} 失败</template>
              {{ expandedStages.has(op.operationId + "/" + node.id) ? "▴" : "▾" }}
            </button>

            <ul
              v-if="expandedStages.has(op.operationId + '/' + node.id)"
              class="stages"
              @click.stop
            >
              <li
                v-for="stage in node.subStages"
                :key="stage.name"
                class="stage"
                :data-status="stage.status"
                :data-parallel="stage.parallelGroup ? '' : undefined"
              >
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

            <p class="node-io">
              输入 {{ node.inputs.length }} · 输出 {{ node.outputs.length }}
              <span v-if="node.outputs.some((a) => a.status === 'excluded')" class="tag-excluded">🔒 含安全排除</span>
            </p>
          </article>
        </template>
      </div>
    </section>

    <aside v-if="detailNode" class="drawer" @click.stop>
      <header class="drawer-head">
        <div>
          <strong>{{ detailNode.node.label }}</strong>
          <p class="drawer-sub">
            {{ detailNode.op.operationId }} / {{ detailNode.op.run.runId }} ·
            <span class="status" :data-status="detailNode.node.status">{{ STATUS_LABEL[detailNode.node.status] }}</span>
            · {{ formatMs(detailNode.node.durationMs) }}
          </p>
        </div>
        <button class="drawer-close" type="button" @click="closeDetail">✕</button>
      </header>

      <p v-if="detailNode.node.degradationReason" class="drawer-degraded">
        降级原因:{{ detailNode.node.degradationReason }}
      </p>

      <section v-for="group in (['inputs', 'outputs'] as const)" :key="group" class="drawer-group">
        <h3>{{ group === "inputs" ? "请求(输入)" : "返回(输出)" }}</h3>
        <p v-if="detailArtifacts[group].length === 0" class="drawer-empty">无</p>
        <article
          v-for="artifact in detailArtifacts[group]"
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
            <button class="raw-btn" type="button">查看安全原始内容(显式展开)</button>
          </template>
          <p v-else class="artifact-excluded">🔒 {{ artifact.note }}</p>
        </article>
      </section>
    </aside>
  </div>
</template>

<style scoped>
.variant-a {
  padding: 16px 20px 96px;
}

.op-block {
  margin-bottom: 28px;
}

.op-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 10px;
}

.op-label {
  font-weight: 700;
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

.pipeline {
  display: flex;
  align-items: stretch;
  gap: 0;
  overflow-x: auto;
}

.edge {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  padding: 0 6px;
  font-size: 10px;
  color: #9ca3af;
  white-space: nowrap;
}

.edge-req {
  border-bottom: 2px solid #93c5fd;
  padding-bottom: 2px;
}

.edge-res {
  border-top: 2px solid #c4b5fd;
  padding-top: 2px;
}

.node-card {
  flex: 1 0 200px;
  max-width: 260px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 10px 12px;
  cursor: pointer;
  background: #fff;
}

.node-card:hover {
  border-color: #2563eb;
}

.node-card.selected {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px #bfdbfe;
}

.node-card[data-status="degraded"] {
  border-color: #d97706;
  background: #fffbeb;
}

.node-card[data-status="failed"] {
  border-color: #dc2626;
  background: #fef2f2;
}

.node-card[data-status="skipped"] {
  border-style: dashed;
  color: #6b7280;
  background: #f9fafb;
}

.node-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.node-status {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #9ca3af;
}

.node-status[data-status="completed"] {
  background: #16a34a;
}

.node-status[data-status="degraded"] {
  background: #d97706;
}

.node-status[data-status="failed"] {
  background: #dc2626;
}

.node-status[data-status="skipped"] {
  background: #d1d5db;
}

.node-meta,
.node-summary,
.node-io {
  font-size: 12px;
  color: #4b5563;
  margin: 6px 0 0;
}

.node-card[data-status="skipped"] .node-summary {
  color: #9ca3af;
}

.node-degraded {
  font-size: 12px;
  color: #92400e;
  margin: 6px 0 0;
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

.stages-toggle {
  margin-top: 8px;
  font-size: 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #f9fafb;
  padding: 2px 8px;
  cursor: pointer;
}

.stages {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: grid;
  gap: 6px;
}

.stage {
  border-left: 3px solid #16a34a;
  background: #f9fafb;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
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

.stage[data-parallel] {
  border-left-color: #7c3aed;
}

.stage-name {
  font-weight: 600;
  display: block;
}

.stage-meta,
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
  display: inline-block;
  font-size: 10px;
  color: #7c3aed;
  border: 1px solid #ddd6fe;
  background: #f5f3ff;
  border-radius: 999px;
  padding: 0 6px;
}

.tag-excluded {
  color: #7c5e10;
}

.drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 380px;
  background: #fff;
  border-left: 1px solid #d1d5db;
  box-shadow: -8px 0 24px rgb(0 0 0 / 8%);
  padding: 16px;
  overflow-y: auto;
  z-index: 20;
}

.drawer-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.drawer-sub {
  font-size: 12px;
  color: #6b7280;
  margin: 4px 0 0;
}

.drawer-close {
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
}

.drawer-degraded {
  font-size: 12px;
  color: #92400e;
  background: #fef3c7;
  border-radius: 6px;
  padding: 6px 8px;
}

.drawer-group h3 {
  font-size: 13px;
  margin: 16px 0 8px;
}

.drawer-empty {
  font-size: 12px;
  color: #9ca3af;
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

.artifact-status[data-status="persistence-failed"] {
  background: #fef2f2;
  color: #b91c1c;
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

.raw-btn {
  margin-top: 6px;
  font-size: 11px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #f9fafb;
  padding: 2px 8px;
  cursor: pointer;
}

.artifact-excluded {
  font-size: 12px;
  color: #92400e;
  margin: 6px 0 0;
}
</style>
