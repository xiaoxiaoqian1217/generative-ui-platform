<script setup lang="ts">
/**
 * PROTOTYPE - throwaway. Variant C: 评估主角 (Evaluation-centric).
 * 右栏上下分:上为渲染预览,下为常显评估面板(N 轮记录 + 汇总 + 证据导出)。
 * 对应 Issue #213 "真实模型重复 5 次并记录结果" 的手动评估工作流。
 */
import { computed, ref } from "vue";
import FactsTable from "./FactsTable.vue";
import MockSurface from "./MockSurface.vue";
import {
  STUB_SCENARIOS,
  runStub,
  type StubFactRow,
  type StubRound,
  type StubScenario,
} from "./stub-data";

const scenarios = STUB_SCENARIOS;
const selected = ref<StubScenario>(scenarios[0]);
const contentDraft = ref(selected.value.presentationInput);
const factRows = ref<StubFactRow[]>(
  selected.value.facts.map((fact) => ({ ...fact, status: "unchecked" })),
);
const editorTab = ref<"content" | "facts">("facts");
const dirty = ref(false);
const running = ref(false);
const hasRun = ref(false);
const rounds = ref<StubRound[]>([]);
const evidence = ref("");

const fullRounds = computed(
  () =>
    rounds.value.filter((round) => round.factsFound === round.factsTotal)
      .length,
);

function select(scenario: StubScenario): void {
  selected.value = scenario;
  contentDraft.value = scenario.presentationInput;
  factRows.value = scenario.facts.map((fact) => ({
    ...fact,
    status: "unchecked",
  }));
  dirty.value = false;
  hasRun.value = false;
  rounds.value = [];
  evidence.value = "";
}

function confirmFact(row: StubFactRow): void {
  row.status = "accepted";
}

async function run(times: number): Promise<void> {
  running.value = true;
  const result = await runStub(selected.value, times);
  factRows.value = factRows.value.map((row) => ({
    ...row,
    status: result.factStatus[row.pointer] ?? "review",
  }));
  rounds.value = result.rounds;
  hasRun.value = true;
  running.value = false;
}

function exportEvidence(): void {
  evidence.value = `${JSON.stringify(
    {
      generatedAt: "2026-08-20T10:00:00Z(stub)",
      model: "secondary-llm-stub",
      rounds: rounds.value,
      scenario: selected.value.name,
    },
    null,
    2,
  )}\n`;
}
</script>

<template>
  <div class="vc pp-page">
    <aside class="pp-panel">
      <div class="pp-panel-head">
        场景 × 评估状态
        <span class="pp-count">4/6 已评估</span>
      </div>
      <div class="pp-panel-body vc-list-body">
        <button
          v-for="scenario in scenarios"
          :key="scenario.name"
          type="button"
          class="pp-item"
          :class="{ active: scenario.name === selected.name }"
          @click="select(scenario)"
        >
          <span class="pp-item-name">{{ scenario.name }}</span>
          <span class="vc-badge" :data-state="scenario.evaluation === '未评估' ? 'none' : 'done'">
            {{ scenario.evaluation }}
          </span>
          <span class="pp-item-meta">{{ scenario.form }}</span>
        </button>
      </div>
      <div class="pp-panel-foot">
        <span class="vc-progress">首批 6 形态:4 已评估 / 2 未评估</span>
      </div>
    </aside>

    <section class="pp-panel">
      <div class="pp-tabs">
        <button type="button" :class="{ on: editorTab === 'content' }" @click="editorTab = 'content'">内容契约</button>
        <button type="button" :class="{ on: editorTab === 'facts' }" @click="editorTab = 'facts'">事实清单</button>
        <span v-if="dirty" class="pp-dirty vc-dirty">● 未保存</span>
      </div>
      <textarea
        v-if="editorTab === 'content'"
        v-model="contentDraft"
        class="pp-code"
        rows="14"
        spellcheck="false"
        @input="dirty = true"
      />
      <div v-else class="pp-panel-body pp-flush">
        <FactsTable v-model="factRows" bare @confirm="confirmFact" />
      </div>
      <div class="pp-panel-foot">
        <button class="secondary-button" type="button" :disabled="running" @click="run(1)">单次试跑</button>
        <button class="secondary-button" type="button" :disabled="!dirty" @click="dirty = false">保存</button>
      </div>
    </section>

    <section class="vc-right">
      <div class="pp-panel vc-preview">
        <div class="pp-panel-head">预览</div>
        <div class="pp-panel-body">
          <MockSurface v-if="hasRun" :scenario="selected.name" />
          <div v-else class="pp-empty">
            <span class="pp-glyph">◈</span>
            <span>单次试跑后此处展示渲染结果</span>
          </div>
        </div>
      </div>

      <div class="pp-panel vc-eval">
        <div class="pp-panel-head">
          评估
          <span class="vc-eval-actions">
            <button class="secondary-button" type="button" :disabled="rounds.length === 0" @click="exportEvidence">
              导出证据 JSON
            </button>
            <button class="primary-button" type="button" :disabled="running" @click="run(5)">
              {{ running ? "评估中…" : "▶ 运行 5 次" }}
            </button>
          </span>
        </div>
        <div class="pp-panel-body">
          <template v-if="rounds.length > 0">
            <p class="vc-sum">
              {{ rounds.length }} 轮 · 合法 {{ rounds.filter((r) => r.valid).length }}/{{ rounds.length }}
              · 可渲染 {{ rounds.filter((r) => r.renderable).length }}/{{ rounds.length }}
              · 事实完整 <b>{{ fullRounds }}/{{ rounds.length }}</b> 轮
            </p>
            <table class="vc-rounds">
              <thead><tr><th>#</th><th>合法</th><th>可渲染</th><th>事实</th><th>耗时</th></tr></thead>
              <tbody>
                <tr v-for="round in rounds" :key="round.n" :data-full="round.factsFound === round.factsTotal">
                  <td>{{ round.n }}</td>
                  <td>{{ round.valid ? "✓" : "✗" }}</td>
                  <td>{{ round.renderable ? "✓" : "✗" }}</td>
                  <td>{{ round.factsFound }}/{{ round.factsTotal }}</td>
                  <td>{{ (round.durationMs / 1000).toFixed(1) }}s</td>
                </tr>
              </tbody>
            </table>
            <pre v-if="evidence" class="vc-evidence">{{ evidence }}</pre>
          </template>
          <div v-else class="pp-empty vc-eval-empty">
            <span>尚未评估。点击"运行 5 次"开始一轮真实模型重复生成评估。</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.vc {
  grid-template-columns: 230px 360px minmax(0, 1fr);
}

.vc-list-body {
  display: grid;
  gap: 6px;
  align-content: start;
}

.vc-badge {
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  background: #e3f3e7;
  color: var(--success);
  white-space: nowrap;
}

.vc-badge[data-state="none"] {
  background: #eceff3;
  color: var(--muted);
}

.vc-progress {
  color: var(--muted);
  font-size: 11px;
}

.vc-dirty {
  margin-left: auto;
  margin-right: 10px;
}

.vc-right {
  display: grid;
  grid-template-rows: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: 14px;
  min-height: 0;
}

.vc-preview :deep(.mock-surface) {
  max-width: 520px;
}

.vc-eval-actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
}

.vc-sum {
  margin: 0 0 8px;
  color: var(--muted);
  font-size: 12px;
}

.vc-sum b {
  color: var(--success);
}

.vc-rounds {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.vc-rounds th,
.vc-rounds td {
  padding: 5px 8px;
  border-bottom: 1px solid var(--line);
  text-align: left;
}

.vc-rounds th {
  color: var(--muted);
}

.vc-rounds tr[data-full="false"] td {
  color: var(--degraded);
}

.vc-evidence {
  margin: 10px 0 0;
  padding: 10px;
  border-radius: 8px;
  background: var(--ink);
  color: #e0e8e3;
  font-size: 11px;
  max-height: 160px;
  overflow: auto;
}

.vc-eval-empty {
  min-height: 120px;
}
</style>
