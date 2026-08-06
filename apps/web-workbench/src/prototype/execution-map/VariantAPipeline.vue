<script setup lang="ts">
// PROTOTYPE(issue-179)：变体 A —— 管道优先。
// 顶部六节点固定拓扑管道，点击节点打开 Node Detail（子阶段可展开 + 请求/返回配对）。
import { computed, ref, watch } from "vue";
import StatusPill from "./StatusPill.vue";
import {
  NODE_ORDER,
  type ProtoNode,
  type ProtoNodeId,
  type ProtoScenario,
  type ProtoSubstage,
} from "./model.js";

const props = defineProps<{ scenario: ProtoScenario }>();

const operationId = ref(props.scenario.turn.operations[0]?.id);
watch(
  () => props.scenario,
  (next) => {
    operationId.value = next.turn.operations[0]?.id;
    selectedNodeId.value = firstAttentionNode(next.turn.operations[0]?.nodes ?? []);
  },
);

function firstAttentionNode(nodes: readonly ProtoNode[]): ProtoNodeId {
  return (
    nodes.find((node) => node.status === "failed")?.id ??
    nodes.find((node) => node.status === "degraded")?.id ??
    nodes.find((node) => node.status === "unavailable")?.id ??
    "business-agent"
  );
}

const operation = computed(
  () =>
    props.scenario.turn.operations.find((item) => item.id === operationId.value) ??
    props.scenario.turn.operations[0],
);
const orderedNodes = computed(() => {
  const nodes = operation.value?.nodes ?? [];
  return NODE_ORDER.map((id) => nodes.find((node) => node.id === id)).filter(
    (node): node is ProtoNode => node !== undefined,
  );
});
const selectedNodeId = ref<ProtoNodeId>(firstAttentionNode(orderedNodes.value));
const selectedNode = computed(
  () => orderedNodes.value.find((node) => node.id === selectedNodeId.value),
);
const expandedStages = ref<ReadonlySet<string>>(new Set());

function toggleStage(stage: ProtoSubstage): void {
  const next = new Set(expandedStages.value);
  if (next.has(stage.id)) next.delete(stage.id);
  else next.add(stage.id);
  expandedStages.value = next;
}

function stageHasDetail(stage: ProtoSubstage): boolean {
  return (
    stage.detail !== undefined ||
    stage.errorCode !== undefined ||
    stage.fieldPath !== undefined
  );
}
</script>

<template>
  <div class="variant-a">
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

    <div v-if="scenario.turn.gap" class="gap-banner">
      sequence {{ scenario.turn.gap.afterSequence + 1 }}–{{ scenario.turn.gap.afterSequence + scenario.turn.gap.missingCount }}
      缺失 {{ scenario.turn.gap.missingCount }} 个事件，诊断历史可能不完整。
    </div>

    <nav v-if="scenario.turn.operations.length > 1" class="operation-tabs">
      <button
        v-for="item in scenario.turn.operations"
        :key="item.id"
        type="button"
        :class="{ active: item.id === operation?.id }"
        @click="operationId = item.id"
      >
        {{ item.label }} <StatusPill :status="item.status" />
      </button>
    </nav>

    <ol class="pipeline" aria-label="六节点执行管道">
      <template v-for="(node, index) in orderedNodes" :key="node.id">
        <li>
          <button
            type="button"
            class="node-card"
            :data-status="node.status"
            :class="{ selected: node.id === selectedNodeId }"
            @click="selectedNodeId = node.id"
          >
            <span class="node-name">{{ node.label }}</span>
            <StatusPill :status="node.status" />
            <span class="node-duration">{{ node.durationMs !== undefined ? `${node.durationMs} ms` : "—" }}</span>
            <span class="node-summary">{{ node.summary }}</span>
          </button>
        </li>
        <li v-if="index < orderedNodes.length - 1" class="pipeline-arrow" aria-hidden="true">→</li>
      </template>
    </ol>

    <section v-if="selectedNode" class="node-detail" :data-status="selectedNode.status">
      <header class="detail-heading">
        <div>
          <p class="eyebrow">NODE DETAIL</p>
          <h3>{{ selectedNode.label }}</h3>
        </div>
        <StatusPill :status="selectedNode.status" />
      </header>
      <p class="detail-summary">{{ selectedNode.summary }}</p>

      <h4>子阶段</h4>
      <ul class="stage-list">
        <li v-for="stage in selectedNode.substages" :key="stage.id">
          <button
            type="button"
            class="stage-row"
            :disabled="!stageHasDetail(stage)"
            @click="toggleStage(stage)"
          >
            <StatusPill :status="stage.status" />
            <span class="stage-label">{{ stage.label }}</span>
            <span class="stage-duration">{{ stage.durationMs !== undefined ? `${stage.durationMs} ms` : "" }}</span>
            <span v-if="stageHasDetail(stage)" class="stage-toggle">{{ expandedStages.has(stage.id) ? "▾" : "▸" }}</span>
          </button>
          <div v-if="expandedStages.has(stage.id) && stageHasDetail(stage)" class="stage-detail">
            <p v-if="stage.detail">{{ stage.detail }}</p>
            <p v-if="stage.errorCode">错误代码：<code>{{ stage.errorCode }}</code></p>
            <p v-if="stage.fieldPath">字段路径：<code>{{ stage.fieldPath }}</code></p>
          </div>
        </li>
      </ul>

      <h4>请求与返回</h4>
      <p v-if="selectedNode.exchanges.length === 0" class="empty-line">本节点在此 Turn 没有输入输出记录。</p>
      <article v-for="exchange in selectedNode.exchanges" :key="exchange.id" class="exchange-card" :data-status="exchange.status">
        <header>
          <strong>{{ exchange.label }}</strong>
          <StatusPill :status="exchange.status" />
        </header>
        <div class="exchange-grid">
          <div class="exchange-side">
            <span class="side-label">请求</span>
            <p>{{ exchange.request?.summary ?? "（无）" }}</p>
            <span v-if="exchange.request?.artifact" class="artifact-line">
              {{ exchange.request.artifact.label }}
              <StatusPill :artifact="exchange.request.artifact.state" />
              <code v-if="exchange.request.artifact.sizeLabel">{{ exchange.request.artifact.sizeLabel }}</code>
            </span>
          </div>
          <div class="exchange-side">
            <span class="side-label">返回</span>
            <p>{{ exchange.response?.summary ?? "（无）" }}</p>
            <span v-if="exchange.response?.artifact" class="artifact-line">
              {{ exchange.response.artifact.label }}
              <StatusPill :artifact="exchange.response.artifact.state" />
              <code v-if="exchange.response.artifact.sizeLabel">{{ exchange.response.artifact.sizeLabel }}</code>
            </span>
          </div>
        </div>
        <p v-if="exchange.note" class="exchange-note">{{ exchange.note }}</p>
      </article>
    </section>

    <footer class="persistence-line">
      诊断持久化：事件 {{ scenario.turn.persistence.eventsSaved }}/{{ scenario.turn.persistence.eventsTotal }}
      <span v-if="scenario.turn.persistence.note"> · {{ scenario.turn.persistence.note }}</span>
    </footer>
  </div>
</template>

<style scoped>
.variant-a {
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

.turn-header h3,
.detail-heading h3 {
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

.gap-banner {
  padding: 8px 14px;
  border: 1px dashed var(--red);
  border-radius: 8px;
  color: var(--red);
  background: color-mix(in srgb, var(--red) 6%, white);
  font-size: 0.8rem;
  font-weight: 700;
}

.operation-tabs {
  display: flex;
  gap: 8px;
}

.operation-tabs button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--paper-strong);
  cursor: pointer;
}

.operation-tabs button.active {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, white);
}

.pipeline {
  display: flex;
  align-items: stretch;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pipeline > li {
  display: flex;
  flex: 1;
  min-width: 0;
}

.pipeline-arrow {
  flex: 0 0 auto;
  align-self: center;
  color: var(--muted);
  font-weight: 800;
}

.node-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  width: 100%;
  padding: 12px;
  border: 1.5px solid var(--line);
  border-radius: 10px;
  background: var(--paper-strong);
  text-align: left;
  cursor: pointer;
}

.node-card.selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 16%, transparent);
}

.node-card[data-status="failed"] {
  border-color: var(--red);
}

.node-card[data-status="degraded"] {
  border-color: var(--amber);
}

.node-card[data-status="skipped"] {
  border-style: dashed;
  opacity: 0.75;
}

.node-name {
  font-weight: 800;
  font-size: 0.85rem;
}

.node-duration {
  color: var(--muted);
  font-size: 0.72rem;
}

.node-summary {
  color: var(--muted);
  font-size: 0.72rem;
  line-height: 1.5;
}

.node-detail {
  padding: 16px 18px;
  border: 1px solid var(--line);
  border-left-width: 5px;
  border-radius: 10px;
  background: var(--paper);
}

.node-detail[data-status="failed"] {
  border-left-color: var(--red);
}

.node-detail[data-status="degraded"] {
  border-left-color: var(--amber);
}

.node-detail[data-status="ok"] {
  border-left-color: var(--green);
}

.node-detail[data-status="skipped"] {
  border-left-color: var(--muted);
}

.detail-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.detail-summary {
  color: var(--muted);
  font-size: 0.85rem;
}

h4 {
  margin: 14px 0 8px;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  color: var(--muted);
}

.stage-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.stage-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 7px 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--paper-strong);
  cursor: pointer;
  text-align: left;
}

.stage-row:disabled {
  cursor: default;
}

.stage-label {
  flex: 1;
}

.stage-duration {
  color: var(--muted);
  font-size: 0.75rem;
}

.stage-toggle {
  color: var(--muted);
}

.stage-detail {
  margin: 4px 0 4px 12px;
  padding: 8px 12px;
  border-left: 3px solid var(--line);
  color: var(--muted);
  font-size: 0.8rem;
}

.stage-detail p {
  margin: 2px 0;
}

.empty-line {
  color: var(--muted);
  font-size: 0.8rem;
}

.exchange-card {
  margin-bottom: 10px;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--paper-strong);
}

.exchange-card[data-status="failed"] {
  border-color: var(--red);
}

.exchange-card[data-status="degraded"] {
  border-color: var(--amber);
}

.exchange-card[data-status="unavailable"] {
  border-style: dashed;
}

.exchange-card header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.exchange-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.exchange-side {
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--paper);
  font-size: 0.8rem;
}

.exchange-side p {
  margin: 4px 0 6px;
  line-height: 1.55;
}

.side-label {
  color: var(--muted);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.artifact-line {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
}

.exchange-note {
  margin: 8px 0 0;
  color: var(--muted);
  font-size: 0.75rem;
}

.persistence-line {
  color: var(--muted);
  font-size: 0.78rem;
}
</style>
