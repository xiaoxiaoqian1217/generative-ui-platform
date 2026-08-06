<script setup lang="ts">
// PROTOTYPE(issue-179)：变体 C —— 混合。
// 顶部紧凑状态条做总览与锚点跳转；下方按节点分组的折叠区块，异常节点默认展开。
import { computed, ref, watch } from "vue";
import StatusPill from "./StatusPill.vue";
import {
  NODE_ORDER,
  type ProtoNode,
  type ProtoNodeId,
  type ProtoScenario,
} from "./model.js";

const props = defineProps<{ scenario: ProtoScenario }>();

interface NodeSection {
  operationLabel: string;
  node: ProtoNode;
  sequences: number[];
}

const sections = computed<NodeSection[]>(() => {
  const result: NodeSection[] = [];
  for (const id of NODE_ORDER) {
    for (const operation of props.scenario.turn.operations) {
      const node = operation.nodes.find((item) => item.id === id);
      if (node === undefined) continue;
      result.push({
        operationLabel: operation.label,
        node,
        sequences: props.scenario.turn.timeline
          .filter((event) => event.node === id)
          .map((event) => event.sequence),
      });
    }
  }
  return result;
});

function needsAttention(section: NodeSection): boolean {
  return section.node.status !== "ok" || section.node.substages.some((stage) => stage.status === "failed" || stage.status === "degraded");
}

const collapsed = ref<ReadonlySet<string>>(new Set());

function defaultCollapsed(): Set<string> {
  return new Set(
    sections.value
      .filter((section) => !needsAttention(section))
      .map((section) => `${section.operationLabel}|${section.node.id}`),
  );
}

watch(
  () => props.scenario,
  () => {
    collapsed.value = defaultCollapsed();
  },
  { immediate: true },
);

function sectionKey(section: NodeSection): string {
  return `${section.operationLabel}|${section.node.id}`;
}

function isCollapsed(section: NodeSection): boolean {
  return collapsed.value.has(sectionKey(section));
}

function toggle(section: NodeSection): void {
  const key = sectionKey(section);
  const next = new Set(collapsed.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  collapsed.value = next;
}

function scrollTo(section: NodeSection): void {
  if (isCollapsed(section)) toggle(section);
  document.getElementById(`proto-c-${sectionKey(section)}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
</script>

<template>
  <div class="variant-c">
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
      ⚠ sequence {{ scenario.turn.gap.afterSequence + 1 }}–{{ scenario.turn.gap.afterSequence + scenario.turn.gap.missingCount }}
      缺失 {{ scenario.turn.gap.missingCount }} 个事件，诊断历史可能不完整。
    </div>

    <nav class="status-strip" aria-label="节点状态总览">
      <button
        v-for="section in sections"
        :key="sectionKey(section)"
        type="button"
        class="strip-item"
        :data-status="section.node.status"
        @click="scrollTo(section)"
      >
        <span class="strip-dot" aria-hidden="true"></span>
        <span class="strip-name">{{ section.node.label }}</span>
        <span class="strip-duration">{{ section.node.durationMs !== undefined ? `${section.node.durationMs}ms` : "—" }}</span>
      </button>
    </nav>

    <section
      v-for="section in sections"
      :id="`proto-c-${sectionKey(section)}`"
      :key="sectionKey(section)"
      class="node-section"
      :data-status="section.node.status"
    >
      <button type="button" class="section-head" @click="toggle(section)">
        <span class="section-toggle">{{ isCollapsed(section) ? "▸" : "▾" }}</span>
        <strong>{{ section.node.label }}</strong>
        <span v-if="scenario.turn.operations.length > 1" class="section-operation">{{ section.operationLabel }}</span>
        <StatusPill :status="section.node.status" />
        <span class="section-duration">{{ section.node.durationMs !== undefined ? `${section.node.durationMs} ms` : "" }}</span>
        <span class="section-seq">seq {{ section.sequences.join(", ") || "—" }}</span>
      </button>

      <div v-if="!isCollapsed(section)" class="section-body">
        <p class="section-summary">{{ section.node.summary }}</p>

        <ol class="stage-steps">
          <li v-for="(stage, index) in section.node.substages" :key="stage.id" :data-status="stage.status">
            <span class="step-index">{{ index + 1 }}</span>
            <div class="step-content">
              <div class="step-line">
                <span class="step-label">{{ stage.label }}</span>
                <StatusPill :status="stage.status" />
                <span v-if="stage.durationMs !== undefined" class="step-duration">{{ stage.durationMs }} ms</span>
              </div>
              <p v-if="stage.detail" class="step-detail">{{ stage.detail }}</p>
              <p v-if="stage.errorCode" class="step-detail">
                <code>{{ stage.errorCode }}</code>
                <template v-if="stage.fieldPath"> · 字段路径 <code>{{ stage.fieldPath }}</code></template>
              </p>
            </div>
          </li>
        </ol>

        <div v-if="section.node.exchanges.length > 0" class="exchange-list">
          <div v-for="exchange in section.node.exchanges" :key="exchange.id" class="exchange-row" :data-status="exchange.status">
            <div class="exchange-title">
              <strong>{{ exchange.label }}</strong>
              <StatusPill :status="exchange.status" />
            </div>
            <div class="exchange-pair">
              <div v-if="exchange.request" class="pair-cell">
                <span class="pair-direction">→ 请求</span>
                <p>{{ exchange.request.summary }}</p>
                <span v-if="exchange.request.artifact" class="artifact-line">
                  {{ exchange.request.artifact.label }}
                  <StatusPill :artifact="exchange.request.artifact.state" />
                  <code v-if="exchange.request.artifact.sizeLabel">{{ exchange.request.artifact.sizeLabel }}</code>
                </span>
              </div>
              <div v-if="exchange.response" class="pair-cell">
                <span class="pair-direction">← 返回</span>
                <p>{{ exchange.response.summary }}</p>
                <span v-if="exchange.response.artifact" class="artifact-line">
                  {{ exchange.response.artifact.label }}
                  <StatusPill :artifact="exchange.response.artifact.state" />
                  <code v-if="exchange.response.artifact.sizeLabel">{{ exchange.response.artifact.sizeLabel }}</code>
                </span>
              </div>
            </div>
            <p v-if="exchange.note" class="exchange-note">{{ exchange.note }}</p>
          </div>
        </div>
      </div>
    </section>

    <footer class="persistence-line">
      诊断持久化：事件 {{ scenario.turn.persistence.eventsSaved }}/{{ scenario.turn.persistence.eventsTotal }}
      <span v-if="scenario.turn.persistence.note"> · {{ scenario.turn.persistence.note }}</span>
    </footer>
  </div>
</template>

<style scoped>
.variant-c {
  display: flex;
  flex-direction: column;
  gap: 12px;
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

.gap-banner {
  padding: 8px 14px;
  border: 1px dashed var(--red);
  border-radius: 8px;
  color: var(--red);
  background: color-mix(in srgb, var(--red) 6%, white);
  font-size: 0.8rem;
  font-weight: 700;
}

.status-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--paper);
}

.strip-item {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 12px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--paper-strong);
  cursor: pointer;
  font-size: 0.75rem;
}

.strip-item:hover {
  border-color: var(--accent);
}

.strip-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--green);
}

.strip-item[data-status="failed"] .strip-dot {
  background: var(--red);
}

.strip-item[data-status="degraded"] .strip-dot {
  background: var(--amber);
}

.strip-item[data-status="skipped"] .strip-dot {
  background: transparent;
  border: 1.5px dashed var(--muted);
}

.strip-item[data-status="unavailable"] .strip-dot {
  background: repeating-linear-gradient(-45deg, var(--muted) 0 2px, transparent 2px 4px);
}

.strip-name {
  font-weight: 700;
}

.strip-duration {
  color: var(--muted);
  font-size: 0.7rem;
}

.node-section {
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--paper-strong);
  overflow: hidden;
}

.node-section[data-status="failed"] {
  border-color: var(--red);
}

.node-section[data-status="degraded"] {
  border-color: var(--amber);
}

.section-head {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.section-toggle {
  color: var(--muted);
}

.section-operation {
  padding: 1px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 10%, white);
  color: var(--accent-dark);
  font-size: 0.68rem;
  font-weight: 700;
}

.section-duration,
.section-seq {
  color: var(--muted);
  font-size: 0.72rem;
}

.section-seq {
  margin-left: auto;
}

.section-body {
  padding: 0 14px 14px 34px;
}

.section-summary {
  margin: 0 0 10px;
  color: var(--muted);
  font-size: 0.82rem;
}

.stage-steps {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin: 0 0 12px;
  padding: 0;
  list-style: none;
}

.stage-steps li {
  display: flex;
  gap: 10px;
  padding: 6px 0;
  border-left: 2px solid var(--line);
  padding-left: 12px;
  margin-left: 6px;
  position: relative;
}

.step-index {
  position: absolute;
  left: -8px;
  top: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--paper);
  border: 1px solid var(--line);
  font-size: 0.62rem;
  color: var(--muted);
}

.stage-steps li[data-status="failed"] {
  border-left-color: var(--red);
}

.stage-steps li[data-status="degraded"] {
  border-left-color: var(--amber);
}

.stage-steps li[data-status="skipped"] {
  opacity: 0.6;
}

.step-content {
  flex: 1;
}

.step-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.step-label {
  font-size: 0.8rem;
}

.step-duration {
  color: var(--muted);
  font-size: 0.72rem;
}

.step-detail {
  margin: 3px 0 0;
  color: var(--muted);
  font-size: 0.75rem;
}

.exchange-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.exchange-row {
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--paper);
}

.exchange-row[data-status="failed"] {
  border-color: var(--red);
}

.exchange-row[data-status="degraded"] {
  border-color: var(--amber);
}

.exchange-row[data-status="unavailable"] {
  border-style: dashed;
}

.exchange-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 0.8rem;
}

.exchange-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.pair-cell {
  font-size: 0.78rem;
}

.pair-cell p {
  margin: 3px 0 5px;
  line-height: 1.55;
}

.pair-direction {
  color: var(--muted);
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.1em;
}

.artifact-line {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.73rem;
}

.exchange-note {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 0.73rem;
}

.persistence-line {
  color: var(--muted);
  font-size: 0.78rem;
}
</style>
