<script setup lang="ts">
/**
 * PROTOTYPE - throwaway. Variant A: 编辑主角 (Editor-centric).
 * 中栏最宽,编辑是主要活动;预览收窄为带 tabs 的侧栏面板。
 * AI 起草 + 审定流只在此变体展开。
 */
import { computed, ref } from "vue";
import FactsTable from "./FactsTable.vue";
import MockSurface from "./MockSurface.vue";
import {
  STUB_SCENARIOS,
  STUB_USED_COMPONENTS,
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
const dirty = ref(false);
const running = ref(false);
const runTimes = ref(1);
const hasRun = ref(false);
const rounds = ref<StubRound[]>([]);
const previewTab = ref<"render" | "a2ui" | "components" | "eval">("render");
const draftPending = ref(false);
const draftReviewed = ref(false);
const draftDescription = ref("");
const draftingOpen = ref(false);
const notice = ref("");

const foundCount = computed(
  () => factRows.value.filter((row) => row.status === "found").length,
);
const reviewCount = computed(
  () => factRows.value.filter((row) => row.status === "review").length,
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
  draftPending.value = false;
  draftReviewed.value = false;
  draftingOpen.value = false;
  notice.value = "";
}

function confirmFact(row: StubFactRow): void {
  row.status = "accepted";
}

async function run(): Promise<void> {
  running.value = true;
  const result = await runStub(selected.value, runTimes.value);
  factRows.value = factRows.value.map((row) => ({
    ...row,
    status: result.factStatus[row.pointer] ?? "review",
  }));
  rounds.value = result.rounds;
  hasRun.value = true;
  previewTab.value = runTimes.value > 1 ? "eval" : "render";
  running.value = false;
}

function save(): void {
  dirty.value = false;
  draftPending.value = false;
  notice.value = `场景 ${selected.value.name} 已保存到仓库场景文件。`;
}

function draft(): void {
  if (draftDescription.value.trim() === "") return;
  contentDraft.value = `${contentDraft.value.trimEnd().replace(/}\s*$/, "")}\n  "_draftNote": "AI 草稿: ${draftDescription.value.trim()}"\n}\n`;
  draftPending.value = true;
  draftReviewed.value = false;
  draftingOpen.value = false;
  dirty.value = true;
  notice.value = "AI 草稿已填入内容契约(尚未保存)。请审定后再保存。";
}
</script>

<template>
  <div class="va pp-page">
    <aside class="pp-panel">
      <div class="pp-panel-head">
        场景文件
        <span class="pp-count">{{ scenarios.length }}</span>
      </div>
      <div class="pp-panel-body va-list-body">
        <button
          v-for="scenario in scenarios"
          :key="scenario.name"
          type="button"
          class="pp-item"
          :class="{ active: scenario.name === selected.name }"
          @click="select(scenario)"
        >
          <span class="pp-item-name">{{ scenario.name }}</span>
          <span class="pp-tag" :data-form="scenario.form">{{ scenario.form }}</span>
          <span class="pp-item-meta">{{ scenario.evaluation }}</span>
        </button>
      </div>
      <div class="pp-panel-foot va-list-foot">
        <div class="va-new">
          <input placeholder="new-scenario-name" />
          <button class="secondary-button" type="button">新建</button>
        </div>
        <button class="secondary-button va-draft-entry" type="button" @click="draftingOpen = true">
          ✦ AI 起草
        </button>
      </div>
    </aside>

    <section class="pp-panel">
      <div class="pp-panel-head">
        内容契约 <code>presentation-input.json</code>
        <span v-if="dirty" class="pp-dirty">● 未保存</span>
      </div>
      <div v-if="draftingOpen" class="va-draft-card">
        <div class="va-draft-card-head">
          ✦ AI 起草
          <span>只生成内容契约草稿,不生成事实清单</span>
        </div>
        <textarea v-model="draftDescription" rows="2" placeholder="例如:一个包含 5 台设备、其中 1 台异常的巡检摘要" />
        <div class="va-draft-card-actions">
          <button class="secondary-button" type="button" @click="draftingOpen = false">取消</button>
          <button class="primary-button" type="button" @click="draft">生成草稿</button>
        </div>
      </div>
      <div v-if="draftPending" class="va-draft-banner">
        <span>AI 草稿待审定 —— 与保存版的差异已在编辑器中高亮</span>
        <label><input v-model="draftReviewed" type="checkbox" /> 我已核对草稿中的业务事实</label>
      </div>
      <textarea
        v-model="contentDraft"
        class="pp-code va-code"
        rows="10"
        spellcheck="false"
        @input="dirty = true"
      />
      <div class="pp-subhead">
        事实清单 <code>expected-facts.json</code>
      </div>
      <div class="va-facts">
        <FactsTable v-model="factRows" bare @confirm="confirmFact" />
      </div>
      <div class="pp-panel-foot">
        <div class="va-run">
          <button class="primary-button" type="button" :disabled="running" @click="run">
            {{ running ? "生成中…" : `▶ 运行 ${runTimes} 次` }}
          </button>
          <select v-model.number="runTimes" :disabled="running">
            <option :value="1">1 次</option>
            <option :value="5">5 次(评估)</option>
          </select>
        </div>
        <button
          class="secondary-button"
          type="button"
          :disabled="!dirty || (draftPending && !draftReviewed)"
          @click="save"
        >
          保存
        </button>
        <span v-if="notice" class="va-notice">{{ notice }}</span>
      </div>
    </section>

    <section class="pp-panel">
      <div class="pp-tabs">
        <button type="button" :class="{ on: previewTab === 'render' }" @click="previewTab = 'render'">渲染</button>
        <button type="button" :class="{ on: previewTab === 'a2ui' }" @click="previewTab = 'a2ui'">A2UI</button>
        <button type="button" :class="{ on: previewTab === 'components' }" @click="previewTab = 'components'">组件</button>
        <button type="button" :class="{ on: previewTab === 'eval' }" @click="previewTab = 'eval'">评估</button>
      </div>

      <div class="pp-panel-body">
        <template v-if="hasRun">
          <MockSurface v-if="previewTab === 'render'" :scenario="selected.name" />
          <pre v-else-if="previewTab === 'a2ui'" class="va-json">{ "surface": "a2ui-json-stub", "scenario": "{{ selected.name }}" }</pre>
          <ul v-else-if="previewTab === 'components'" class="va-components">
            <li v-for="component in STUB_USED_COMPONENTS[selected.name] ?? []" :key="component">
              <code>{{ component }}</code> <span class="va-ok">catalog 内</span>
            </li>
          </ul>
          <div v-else class="va-eval">
            <table>
              <thead><tr><th>#</th><th>合法</th><th>可渲染</th><th>事实</th><th>耗时</th></tr></thead>
              <tbody>
                <tr v-for="round in rounds" :key="round.n">
                  <td>{{ round.n }}</td>
                  <td>{{ round.valid ? "✓" : "✗" }}</td>
                  <td>{{ round.renderable ? "✓" : "✗" }}</td>
                  <td>{{ round.factsFound }}/{{ round.factsTotal }}</td>
                  <td>{{ (round.durationMs / 1000).toFixed(1) }}s</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
        <div v-else class="pp-empty">
          <span class="pp-glyph">◈</span>
          <span>运行后此处展示生成的 surface</span>
          <small>A2UI JSON · 所用组件 · 评估结果</small>
        </div>
      </div>

      <div v-if="hasRun && previewTab !== 'eval'" class="pp-panel-foot">
        <span class="pp-factsum">
          事实保留 <b>{{ foundCount }}/{{ factRows.length }}</b>
          <em v-if="reviewCount > 0"> · {{ reviewCount }} 待确认,请在事实清单中处理</em>
        </span>
      </div>
      <div v-else-if="hasRun" class="pp-panel-foot">
        <span class="pp-factsum">
          {{ rounds.length }} 轮 · 全部合法可渲染 · 事实完整
          <b>{{ rounds.filter((r) => r.factsFound === r.factsTotal).length }}/{{ rounds.length }}</b> 轮
        </span>
      </div>
    </section>
  </div>
</template>

<style scoped>
.va {
  grid-template-columns: 240px minmax(0, 1fr) minmax(0, 1.35fr);
}

.va-list-body {
  display: grid;
  gap: 6px;
  align-content: start;
}

.va-list-foot {
  display: grid;
  gap: 8px;
}

.va-new {
  display: flex;
  gap: 6px;
}

.va-new input {
  min-width: 0;
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--line);
  border-radius: 6px;
  font-size: 12px;
}

.va-draft-entry {
  width: 100%;
  border-color: #c7d2f6;
  color: var(--accent);
}

.va-draft-card {
  display: grid;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid #c7d2f6;
  background: #f6f8ff;
  flex: none;
}

.va-draft-card-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  color: var(--accent);
  font-size: 13px;
  font-weight: 600;
}

.va-draft-card-head span {
  color: var(--muted);
  font-size: 11px;
  font-weight: 400;
}

.va-draft-card textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  font-size: 12px;
  resize: vertical;
}

.va-draft-card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.va-draft-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 8px 14px;
  border-bottom: 1px solid #f0d9a8;
  background: #fdf6e5;
  color: var(--degraded);
  font-size: 12px;
  flex: none;
}

.va-draft-banner label {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.va-code {
  flex: 1 1 40%;
}

.va-facts {
  flex: 1 1 60%;
  min-height: 0;
  overflow-y: auto;
}

.va-run {
  display: flex;
}

.va-run .primary-button {
  border-radius: 6px 0 0 6px;
}

.va-run select {
  border: 1px solid var(--accent);
  border-left: 0;
  border-radius: 0 6px 6px 0;
  background: #eef2ff;
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
}

.va-notice {
  margin: 0 0 0 auto;
  color: var(--success);
  font-size: 12px;
}

.va-json {
  margin: 0;
  padding: 12px;
  border-radius: 8px;
  background: var(--ink);
  color: #e0e8e3;
  font-size: 11px;
  overflow: auto;
}

.va-components {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
  font-size: 12px;
}

.va-ok {
  color: var(--success);
  font-size: 11px;
}

.va-eval table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.va-eval th,
.va-eval td {
  padding: 5px 8px;
  border-bottom: 1px solid var(--line);
  text-align: left;
}

.va-eval th {
  color: var(--muted);
}
</style>
