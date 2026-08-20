<script setup lang="ts">
/**
 * PROTOTYPE - throwaway. Variant D: 合成版.
 * 吸收对方设计的页头全局动作、分组可搜索列表、AI 起草 staging 流、
 * 深色编辑器 chrome、结果来源行;保留 FactsTable 结构化核对、
 * 事实判定贴 surface、评估轮次明细与证据导出。
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
const search = ref("");
const contentDraft = ref(selected.value.presentationInput);
const factRows = ref<StubFactRow[]>(
  selected.value.facts.map((fact) => ({ ...fact, status: "unchecked" })),
);
const editorTab = ref<"input" | "facts">("input");
const resultTab = ref<"render" | "eval" | "a2ui">("render");
const dirty = ref(false);
const running = ref<0 | 1 | 5>(0);
const hasRun = ref(false);
const rounds = ref<StubRound[]>([]);
const lastDuration = ref("");
const evidence = ref("");

const authorOpen = ref(false);
const draftDescription = ref("");
/** 人工认可的表达等价(pointer 级),跨运行保持;真实实现中会写回 expected-facts.json */
const acceptedPointers = ref<ReadonlySet<string>>(new Set());
interface StagedDraft {
  description: string;
  fields: { key: string; value: string }[];
  value: Record<string, unknown>;
}
const staged = ref<StagedDraft | undefined>(undefined);
const draftApplied = ref(false);
const draftReviewed = ref(false);

const groups = computed(() => {
  const term = search.value.trim().toLowerCase();
  const visible = scenarios.filter(
    (scenario) => term === "" || scenario.name.toLowerCase().includes(term),
  );
  return [
    { label: "CORE SHAPES", items: visible.filter((s) => s.form !== "结果") },
    { label: "STATES", items: visible.filter((s) => s.form === "结果") },
  ].filter((group) => group.items.length > 0);
});

const jsonValid = computed(() => {
  try {
    JSON.parse(contentDraft.value);
    return true;
  } catch {
    return false;
  }
});

const lineCount = computed(() => contentDraft.value.split("\n").length);

const foundCount = computed(
  () =>
    factRows.value.filter(
      (row) => row.status === "found" || row.status === "accepted",
    ).length,
);
const acceptedCount = computed(
  () => factRows.value.filter((row) => row.status === "accepted").length,
);
const reviewCount = computed(
  () => factRows.value.filter((row) => row.status === "review").length,
);
const fullRounds = computed(
  () =>
    rounds.value.filter((round) => round.factsFound === round.factsTotal)
      .length,
);

const verdict = computed(() => {
  if (!hasRun.value) return "";
  if (reviewCount.value > 0)
    return `事实 ${foundCount.value}/${factRows.value.length} · ${reviewCount.value} 待确认`;
  if (rounds.value.length > 1)
    return `${rounds.value.length} 轮 · 事实完整 ${fullRounds.value}/${rounds.value.length}`;
  return acceptedCount.value > 0
    ? `事实 ${foundCount.value}/${factRows.value.length} 全部保留 · ${acceptedCount.value} 条经人工认可`
    : `事实 ${foundCount.value}/${factRows.value.length} 全部保留`;
});

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
  staged.value = undefined;
  draftApplied.value = false;
  draftReviewed.value = false;
  acceptedPointers.value = new Set();
}

function confirmFact(row: StubFactRow): void {
  // 确认的后果:alias 沉淀,后续运行同一表达改写自动视为已认可
  acceptedPointers.value = new Set([...acceptedPointers.value, row.pointer]);
  row.status = "accepted";
  row.acceptedAs = selected.value.reviewAliases[row.pointer];
}

async function run(times: 1 | 5): Promise<void> {
  running.value = times;
  const result = await runStub(selected.value, times);
  factRows.value = factRows.value.map((row) => {
    if (acceptedPointers.value.has(row.pointer))
      return {
        ...row,
        acceptedAs: selected.value.reviewAliases[row.pointer],
        status: "accepted",
      };
    return { ...row, status: result.factStatus[row.pointer] ?? "review" };
  });
  rounds.value = result.rounds;
  lastDuration.value = ((result.rounds.at(0)?.durationMs ?? 0) / 1000).toFixed(
    2,
  );
  hasRun.value = true;
  resultTab.value = times > 1 ? "eval" : "render";
  running.value = 0;
}

function formatJson(): void {
  try {
    contentDraft.value = `${JSON.stringify(JSON.parse(contentDraft.value), null, 2)}\n`;
    dirty.value = true;
  } catch {
    /* invalid JSON: indicator already shows it */
  }
}

function syncGutter(event: Event): void {
  const textarea = event.target as HTMLTextAreaElement;
  const gutter = textarea.previousElementSibling as HTMLElement | null;
  if (gutter !== null) gutter.scrollTop = textarea.scrollTop;
}

function generateDraft(): void {
  const description = draftDescription.value.trim();
  if (description === "") return;
  const value = {
    abnormal: 1,
    normal: 4,
    status: "attention_required",
    total: 5,
  };
  staged.value = {
    description,
    fields: Object.entries(value).map(([key, v]) => ({
      key,
      value: String(v),
    })),
    value,
  };
}

function discardDraft(): void {
  staged.value = undefined;
}

function applyDraft(): void {
  if (staged.value === undefined) return;
  contentDraft.value = `${JSON.stringify(
    {
      content: {
        kind: "structured",
        mediaType: "application/json",
        value: staged.value.value,
      },
      context: { allowedActions: [] },
      lifecycle: "stable",
      provenance: [],
    },
    null,
    2,
  )}\n`;
  staged.value = undefined;
  draftApplied.value = true;
  draftReviewed.value = false;
  dirty.value = true;
  editorTab.value = "input";
}

function save(): void {
  dirty.value = false;
  draftApplied.value = false;
}

function exportEvidence(): void {
  evidence.value = `${JSON.stringify(
    {
      generatedAt: "2026-08-20T10:00:00Z(stub)",
      model: "openai/gpt-4.1-mini",
      rounds: rounds.value,
      scenario: selected.value.name,
    },
    null,
    2,
  )}\n`;
}
</script>

<template>
  <div class="vd">
    <header class="vd-header">
      <div class="vd-title">
        <span class="vd-kicker">Generative UI Evaluation</span>
        <h2>Scenarios</h2>
      </div>
      <div class="vd-actions">
        <span class="vd-cap">● Lab 就绪</span>
        <span v-if="dirty" class="pp-dirty">● 未保存</span>
        <button class="secondary-button" type="button" :disabled="running !== 0" @click="run(1)">
          单次试跑
        </button>
        <button
          class="secondary-button"
          type="button"
          :disabled="!dirty || reviewCount > 0 || (draftApplied && !draftReviewed)"
          :title="reviewCount > 0 ? '有待确认的事实:请先逐条确认表达改写' : ''"
          @click="save"
        >
          保存
        </button>
        <button class="primary-button" type="button" :disabled="running !== 0" @click="run(5)">
          {{ running === 5 ? "评估中…" : "▶ 运行评估" }}
        </button>
      </div>
    </header>

    <div class="vd-grid">
      <aside class="pp-panel">
        <div class="vd-search">
          <input v-model="search" placeholder="搜索场景" spellcheck="false" />
        </div>
        <div class="pp-panel-body vd-list-body">
          <template v-for="group in groups" :key="group.label">
            <div class="vd-group">{{ group.label }}</div>
            <button
              v-for="scenario in group.items"
              :key="scenario.name"
              type="button"
              class="pp-item"
              :class="{ active: scenario.name === selected.name }"
              @click="select(scenario)"
            >
              <span class="pp-item-name">{{ scenario.name }}</span>
              <span class="pp-tag" :data-form="scenario.form">{{ scenario.form }}</span>
              <span class="pp-item-meta">{{ scenario.facts.length }} facts · {{ scenario.evaluation }}</span>
            </button>
          </template>
        </div>
        <div class="pp-panel-foot vd-foot">
          <button class="secondary-button" type="button">+ 新建场景</button>
          <button class="secondary-button vd-draft-entry" type="button" @click="authorOpen = true">
            ✦ AI 起草
          </button>
        </div>
      </aside>

      <section class="pp-panel">
        <details class="vd-author" :open="authorOpen" @toggle="authorOpen = ($event.target as HTMLDetailsElement).open">
          <summary>
            <span class="vd-author-title">✦ AI 辅助起草</span>
            <span class="vd-author-note">Scenario fixture authoring · 不生成 Expected Facts</span>
          </summary>
          <div class="vd-author-body">
            <textarea
              v-model="draftDescription"
              rows="2"
              placeholder="例如:5 台设备的巡检摘要,其中 1 台异常,需要人工复核"
            />
            <button class="secondary-button" type="button" :disabled="staged !== undefined" @click="generateDraft">
              生成内容草稿
            </button>
          </div>
          <div v-if="staged" class="vd-staged">
            <div class="vd-staged-head">
              草稿预览
              <span class="vd-staged-badge">AI 生成 · 未审定</span>
            </div>
            <p class="vd-staged-meta">{{ staged.fields.length }} 个字段将写入 content.value</p>
            <ul class="vd-staged-fields">
              <li v-for="field in staged.fields" :key="field.key">
                <code>{{ field.key }}</code>
                <span>{{ field.value }}</span>
              </li>
            </ul>
            <div class="vd-staged-actions">
              <button class="secondary-button" type="button" @click="discardDraft">放弃</button>
              <button class="primary-button" type="button" @click="applyDraft">应用到 PresentationInput</button>
            </div>
          </div>
        </details>

        <div v-if="draftApplied && !draftReviewed" class="vd-review-banner">
          <span>草稿已应用,待审定</span>
          <label><input v-model="draftReviewed" type="checkbox" /> 我已核对草稿中的业务事实</label>
        </div>

        <div class="pp-tabs">
          <button type="button" :class="{ on: editorTab === 'input' }" @click="editorTab = 'input'">PresentationInput</button>
          <button type="button" :class="{ on: editorTab === 'facts' }" @click="editorTab = 'facts'">
            Expected Facts <span class="vd-tab-count">{{ factRows.length }}</span>
          </button>
          <template v-if="editorTab === 'input'">
            <span class="vd-schema" :class="{ invalid: !jsonValid }">
              {{ jsonValid ? "● Schema valid" : "● JSON 无效" }}
            </span>
            <button type="button" class="vd-format" @click="formatJson">格式化</button>
          </template>
        </div>

        <div v-if="editorTab === 'input'" class="vd-editor">
          <div class="vd-gutter" aria-hidden="true">
            <span v-for="n in lineCount" :key="n">{{ n }}</span>
          </div>
          <textarea v-model="contentDraft" spellcheck="false" @input="dirty = true" @scroll="syncGutter" />
        </div>
        <div v-else class="pp-panel-body pp-flush">
          <FactsTable v-model="factRows" bare @confirm="confirmFact" />
        </div>
      </section>

      <section class="pp-panel">
        <div class="pp-panel-head">
          生成结果
          <span class="vd-latestrun">Latest run</span>
          <span v-if="verdict" class="vd-verdict" :class="{ warn: reviewCount > 0 || fullRounds < rounds.length }">
            {{ verdict }}
          </span>
        </div>
        <div class="pp-tabs">
          <button type="button" :class="{ on: resultTab === 'render' }" @click="resultTab = 'render'">Rendered UI</button>
          <button type="button" :class="{ on: resultTab === 'eval' }" @click="resultTab = 'eval'">Evaluation</button>
          <button type="button" :class="{ on: resultTab === 'a2ui' }" @click="resultTab = 'a2ui'">A2UI</button>
        </div>

        <div class="pp-panel-body">
          <template v-if="hasRun">
            <template v-if="resultTab === 'render'">
              <div class="vd-viewport">Desktop preview</div>
              <MockSurface :scenario="selected.name" />
              <p class="vd-provenance">openai/gpt-4.1-mini · {{ lastDuration }}s · {{ (STUB_USED_COMPONENTS[selected.name] ?? []).length }} components</p>
              <ul class="vd-facts">
                <li v-for="row in factRows" :key="row.pointer" :data-status="row.status">
                  <code>{{ row.pointer }}</code>
                  <span class="vd-expect">
                    期望 {{ row.value }}
                    <template v-if="row.acceptedAs !== undefined"> · 认可表达 {{ row.acceptedAs }}</template>
                  </span>
                  <b v-if="row.status === 'found'" class="vd-ok">已保留</b>
                  <b v-else-if="row.status === 'accepted'" class="vd-accepted">已认可</b>
                  <template v-else-if="row.status === 'review'">
                    <b class="vd-review">表达改写,待确认</b>
                    <button type="button" class="vd-confirm" @click="confirmFact(row)">确认无误</button>
                  </template>
                  <b v-else class="vd-muted">未核对</b>
                </li>
              </ul>
            </template>

            <template v-else-if="resultTab === 'eval'">
              <p class="vd-sum">
                {{ rounds.length }} 轮 · 合法 {{ rounds.filter((r) => r.valid).length }}/{{ rounds.length }}
                · 可渲染 {{ rounds.filter((r) => r.renderable).length }}/{{ rounds.length }}
                · 事实完整 <b>{{ fullRounds }}/{{ rounds.length }}</b> 轮
              </p>
              <table class="vd-rounds">
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
              <div class="vd-eval-actions">
                <button class="secondary-button" type="button" @click="exportEvidence">导出证据 JSON</button>
              </div>
              <pre v-if="evidence" class="vd-evidence">{{ evidence }}</pre>
            </template>

            <pre v-else class="vd-a2ui">{ "surface": "a2ui-json-stub", "scenario": "{{ selected.name }}" }</pre>
          </template>
          <div v-else class="pp-empty">
            <span class="pp-glyph">◈</span>
            <span>运行后此处展示生成的 surface</span>
            <small>Rendered UI · Evaluation · A2UI</small>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.vd {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 14px;
  height: 100%;
  min-height: 0;
}

.vd-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.vd-kicker {
  display: block;
  color: var(--muted);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.vd-title h2 {
  margin: 0;
  font-size: 20px;
}

.vd-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.vd-cap {
  padding: 3px 10px;
  border-radius: 999px;
  background: #e6f4ea;
  color: var(--success);
  font-size: 12px;
  font-weight: 600;
}

.vd-grid {
  display: grid;
  grid-template-columns: 230px minmax(0, 1.1fr) minmax(0, 1fr);
  gap: 14px;
  min-height: 0;
}

.vd-search {
  padding: 10px 12px;
  border-bottom: 1px solid var(--line);
}

.vd-search input {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #f8fafc;
  font-size: 12px;
}

.vd-list-body {
  display: grid;
  gap: 6px;
  align-content: start;
}

.vd-group {
  margin-top: 6px;
  color: var(--muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.vd-new {
  width: 100%;
}

.vd-foot {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.vd-draft-entry {
  border-color: #c7d2f6;
  color: var(--accent);
}

/* AI 起草 staging */
.vd-author {
  flex: none;
  border-bottom: 1px solid var(--line);
}

.vd-author summary {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 10px 14px;
  background: #f6f8ff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  list-style-position: inside;
  transition: background 0.12s;
}

.vd-author summary:hover {
  background: #eef2ff;
}

.vd-author[open] summary {
  border-bottom: 1px solid #e3e9fb;
}

.vd-author-title {
  color: var(--accent);
}

.vd-author-note {
  color: var(--muted);
  font-size: 11px;
  font-weight: 400;
}

.vd-author-body {
  display: grid;
  gap: 8px;
  padding: 0 14px 12px;
}

.vd-author-body textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  font-size: 12px;
  resize: vertical;
}

.vd-author-body button {
  justify-self: end;
}

.vd-staged {
  margin: 0 14px 12px;
  padding: 12px;
  border: 1px solid #f0d9a8;
  border-radius: 10px;
  background: #fffdf6;
}

.vd-staged-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
}

.vd-staged-badge {
  padding: 1px 8px;
  border-radius: 999px;
  background: #fdf0dc;
  color: var(--degraded);
  font-size: 11px;
}

.vd-staged-meta {
  margin: 6px 0;
  color: var(--muted);
  font-size: 12px;
}

.vd-staged-fields {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.vd-staged-fields li {
  display: inline-flex;
  gap: 6px;
  padding: 3px 10px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #fff;
  font-size: 12px;
}

.vd-staged-fields code {
  color: var(--accent);
}

.vd-staged-fields span {
  color: var(--muted);
}

.vd-staged-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
}

.vd-review-banner {
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

.vd-review-banner label {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.vd-tab-count {
  padding: 0 6px;
  border-radius: 999px;
  background: #eef0f3;
  color: var(--muted);
  font-size: 11px;
}

.vd-schema {
  margin-left: auto;
  margin-right: 4px;
  color: var(--success);
  font-size: 11px;
}

.vd-schema.invalid {
  color: var(--danger);
}

.vd-format {
  margin-right: 10px;
  padding: 2px 10px;
  border: 1px solid var(--line);
  border-radius: 5px;
  background: #fff;
  color: var(--muted);
  font-size: 11px;
  cursor: pointer;
}

/* 深色编辑器 */
.vd-editor {
  display: flex;
  flex: 1;
  min-height: 0;
  background: var(--ink);
}

.vd-gutter {
  display: grid;
  gap: 0;
  align-content: start;
  padding: 12px 8px 12px 14px;
  border-right: 1px solid #33383f;
  color: #6b7280;
  font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
  font-size: 12px;
  line-height: 1.7;
  text-align: right;
  overflow: hidden;
  user-select: none;
}

.vd-editor textarea {
  flex: 1;
  padding: 12px 14px;
  border: 0;
  background: transparent;
  color: #e6edf3;
  font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
  font-size: 12px;
  line-height: 1.7;
  resize: none;
  white-space: pre;
}

.vd-editor textarea:focus {
  outline: none;
}

/* 结果列 */
.vd-latestrun {
  color: var(--muted);
  font-size: 11px;
  font-weight: 400;
}

.vd-verdict {
  margin-left: auto;
  padding: 2px 10px;
  border-radius: 999px;
  background: #e3f3e7;
  color: var(--success);
  font-size: 12px;
  font-weight: 600;
}

.vd-verdict.warn {
  background: #fdf0dc;
  color: var(--degraded);
}

.vd-viewport {
  margin-bottom: 8px;
  color: var(--muted);
  font-size: 11px;
}

.vd-provenance {
  margin: 8px 0 0;
  color: var(--muted);
  font-size: 11px;
}

.vd-facts {
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
  font-size: 12px;
}

.vd-facts li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--paper);
}

.vd-facts li[data-status="review"] {
  border-color: #f0d9a8;
  background: #fffdf6;
}

.vd-expect { color: var(--muted); }
.vd-ok { color: var(--success); }
.vd-accepted { color: #0f766e; }
.vd-review { color: var(--degraded); }
.vd-muted { color: var(--muted); font-weight: 400; }

.vd-confirm {
  margin-left: auto;
  padding: 2px 10px;
  border: 1px solid var(--degraded);
  border-radius: 5px;
  background: transparent;
  color: var(--degraded);
  font-size: 11px;
  cursor: pointer;
}

.vd-sum {
  margin: 0 0 8px;
  color: var(--muted);
  font-size: 12px;
}

.vd-sum b {
  color: var(--success);
}

.vd-rounds {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.vd-rounds th,
.vd-rounds td {
  padding: 5px 8px;
  border-bottom: 1px solid var(--line);
  text-align: left;
}

.vd-rounds th {
  color: var(--muted);
}

.vd-rounds tr[data-full="false"] td {
  color: var(--degraded);
}

.vd-eval-actions {
  margin-top: 10px;
}

.vd-evidence,
.vd-a2ui {
  margin: 10px 0 0;
  padding: 12px;
  border-radius: 8px;
  background: var(--ink);
  color: #e0e8e3;
  font-size: 11px;
  max-height: 180px;
  overflow: auto;
}
</style>
