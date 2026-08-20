<script setup lang="ts">
/**
 * PROTOTYPE - throwaway. Variant B: 预览主角 (Preview-centric).
 * 右栏最宽,渲染结果按接近真实对话的尺寸呈现,事实核对清单贴着 surface;
 * 中栏收窄为紧凑编辑(事实表格为主,内容契约折叠在下方)。
 */
import { computed, ref } from "vue";
import FactsTable from "./FactsTable.vue";
import MockSurface from "./MockSurface.vue";
import {
  STUB_SCENARIOS,
  runStub,
  type StubFactRow,
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
const hasRun = ref(false);
const lastDuration = ref("");

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
}

async function run(): Promise<void> {
  running.value = true;
  const result = await runStub(selected.value, 1);
  factRows.value = factRows.value.map((row) => ({
    ...row,
    status: result.factStatus[row.pointer] ?? "review",
  }));
  lastDuration.value = ((result.rounds.at(0)?.durationMs ?? 0) / 1000).toFixed(
    1,
  );
  hasRun.value = true;
  running.value = false;
}

function confirmRow(row: StubFactRow): void {
  row.status = "accepted";
}
</script>

<template>
  <div class="vb pp-page">
    <aside class="pp-panel">
      <div class="pp-panel-head">
        场景文件
        <span class="pp-count">{{ scenarios.length }}</span>
      </div>
      <div class="pp-panel-body vb-list-body">
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
      <div class="pp-panel-foot">
        <button class="secondary-button vb-new" type="button">+ 新建 / AI 起草</button>
      </div>
    </aside>

    <section class="vb-center">
      <div class="pp-panel vb-facts-panel">
        <div class="pp-panel-head">
          事实清单 <code>expected-facts.json</code>
          <span v-if="dirty" class="pp-dirty">● 未保存</span>
        </div>
        <div class="pp-panel-body pp-flush">
          <FactsTable v-model="factRows" bare @confirm="confirmRow" />
        </div>
        <div class="pp-panel-foot">
          <button class="primary-button" type="button" :disabled="running" @click="run">
            {{ running ? "生成中…" : "▶ 运行" }}
          </button>
          <button class="secondary-button" type="button" :disabled="!dirty" @click="dirty = false">保存</button>
        </div>
      </div>

      <details class="pp-panel vb-content">
        <summary>内容契约 <code>presentation-input.json</code></summary>
        <textarea v-model="contentDraft" class="pp-code" rows="8" spellcheck="false" @input="dirty = true" />
      </details>
    </section>

    <section class="pp-panel">
      <div class="pp-panel-head">
        预览
        <template v-if="hasRun">
          <span class="vb-model">Secondary LLM · gpt-x · {{ lastDuration }}s</span>
          <span class="vb-factchip" :class="{ warn: reviewCount > 0 }">
            事实 {{ foundCount }}/{{ factRows.length }} 已保留<template v-if="reviewCount > 0"> · {{ reviewCount }} 待确认</template>
          </span>
        </template>
      </div>
      <div class="pp-panel-body">
        <template v-if="hasRun">
          <div class="vb-stage">
            <MockSurface :scenario="selected.name" />
          </div>
          <ul class="vb-facts">
            <li v-for="row in factRows" :key="row.pointer" :data-status="row.status">
              <code>{{ row.pointer }}</code>
              <span class="vb-expect">期望 {{ row.value }}</span>
              <template v-if="row.status === 'found'"><b class="vb-ok">已保留</b></template>
              <template v-else-if="row.status === 'accepted'"><b class="vb-ok">已认可</b></template>
              <template v-else-if="row.status === 'review'">
                <b class="vb-review">表达改写,待确认</b>
                <button type="button" class="vb-confirm" @click="confirmRow(row)">确认无误</button>
              </template>
              <template v-else><b class="vb-muted">未核对</b></template>
            </li>
          </ul>
        </template>
        <div v-else class="pp-empty">
          <span class="pp-glyph">◈</span>
          <span>选择场景后点击"运行",此处按真实展示尺寸呈现生成的 surface</span>
          <small>事实核对清单会贴在 surface 下方,核对视线不离开结果</small>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.vb {
  grid-template-columns: 210px 330px minmax(0, 1fr);
}

.vb-list-body {
  display: grid;
  gap: 6px;
  align-content: start;
}

.vb-new {
  width: 100%;
}

.vb-center {
  display: grid;
  gap: 14px;
  align-content: start;
  grid-template-rows: minmax(0, 1fr) auto;
  min-height: 0;
}

.vb-facts-panel {
  min-height: 0;
}

.vb-content {
  flex: none;
}

.vb-content summary {
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  list-style-position: inside;
}

.vb-content summary code {
  color: var(--muted);
  font-weight: 400;
  font-size: 11px;
}

.vb-content .pp-code {
  border-top: 1px solid var(--line);
  min-height: 120px;
}

.vb-model {
  color: var(--muted);
  font-size: 12px;
  font-weight: 400;
}

.vb-factchip {
  margin-left: auto;
  padding: 3px 10px;
  border-radius: 999px;
  background: #e3f3e7;
  color: var(--success);
  font-size: 12px;
  font-weight: 600;
}

.vb-factchip.warn {
  background: #fdf0dc;
  color: var(--degraded);
}

.vb-stage {
  padding: 28px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background:
    radial-gradient(circle at 1px 1px, #e3e7ed 1px, transparent 0) 0 0 / 18px 18px,
    #f4f6f9;
}

.vb-stage :deep(.mock-surface) {
  max-width: 560px;
  margin: 0 auto;
  box-shadow: 0 2px 12px rgb(31 35 40 / 8%);
}

.vb-facts {
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
  font-size: 12px;
}

.vb-facts li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--paper);
}

.vb-facts li[data-status="review"] {
  border-color: #f0d9a8;
  background: #fffdf6;
}

.vb-expect {
  color: var(--muted);
}

.vb-ok { color: var(--success); }
.vb-review { color: var(--degraded); }
.vb-muted { color: var(--muted); font-weight: 400; }

.vb-confirm {
  margin-left: auto;
  padding: 2px 10px;
  border: 1px solid var(--degraded);
  border-radius: 5px;
  background: transparent;
  color: var(--degraded);
  font-size: 11px;
  cursor: pointer;
}
</style>
