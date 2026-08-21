<script setup lang="ts">
import type { ActivityMessage } from "@ag-ui/core";
import { CopilotKitProvider } from "@copilotkit/vue/v2";
import { computed, onMounted, onUnmounted, ref } from "vue";
import ActivityMessagePresentation from "../../conversation/ActivityMessagePresentation.vue";
import { platformCatalog } from "../a2ui/catalog/platform-catalog.js";
import ScenarioFactsEditor from "./ScenarioFactsEditor.vue";
import {
  evaluateScenarioLabSurface,
  generateScenarioLabSurface,
  listScenarioLabDocuments,
  requestScenarioDraft,
  saveScenarioLabDocument,
  type ScenarioLabDocument,
  type ScenarioLabFactCheckEntry,
} from "./scenario-lab-client.js";
import {
  applyFactCheck,
  editorRowsToFacts,
  evaluationSummary,
  factsToEditorRows,
  scenarioForm,
  usedComponentNames,
  type ScenarioEvaluationRound,
  type ScenarioFactEditorRow,
} from "./scenario-lab-model.js";

const props = defineProps<{
  runtimeUrl: string;
  scenarioLabUrl: string;
}>();
const a2ui = { catalog: platformCatalog };
const EVALUATION_ROUND_COUNT = 5;

const NEW_SCENARIO_TEMPLATE = {
  content: {
    kind: "structured",
    mediaType: "application/json",
    value: {},
  },
  context: { allowedActions: [] },
  lifecycle: "stable",
  provenance: [],
};

type PreviewTab = "a2ui" | "components" | "evaluation" | "render";

const documents = ref<readonly ScenarioLabDocument[]>([]);
const selectedName = ref("");
const contentDraft = ref("");
const factRows = ref<ScenarioFactEditorRow[]>([]);
const factEditorValid = ref(true);
const newScenarioName = ref("");
const draftDescription = ref("");
const draftingAvailable = ref(false);
const drafting = ref(false);
const draftingOpen = ref(false);
const evaluationOpen = ref(false);
const draftReviewRequired = ref(false);
const draftReviewed = ref(false);
const dirty = ref(false);
const notice = ref("");
const running = ref(false);
const saving = ref(false);
const runProgress = ref(0);
const runError = ref("");
const runSurface = ref<Record<string, unknown>>();
const latestFactCheck = ref<readonly ScenarioLabFactCheckEntry[]>([]);
const rounds = ref<readonly ScenarioEvaluationRound[]>([]);
const evaluationByScenario = ref<Record<string, string>>({});
const previewTab = ref<PreviewTab>("render");
const resultStale = ref(false);
const lastRunMode = ref<"evaluation" | "generation">();
let activeDraftController: AbortController | undefined;

const hasEvaluationOracle = computed(
  () => factRows.value.length > 0 && factEditorValid.value,
);
const canSave = computed(
  () =>
    dirty.value &&
    selectedName.value !== "" &&
    hasEvaluationOracle.value &&
    (!draftReviewRequired.value || draftReviewed.value),
);
const surfaceMessage = computed<ActivityMessage | undefined>(() =>
  runSurface.value === undefined
    ? undefined
    : {
        activityType: "a2ui-surface",
        content: runSurface.value,
        id: "scenario-lab-surface",
        role: "activity",
      },
);
const surfaceJson = computed(() =>
  runSurface.value === undefined
    ? ""
    : JSON.stringify(runSurface.value, null, 2),
);
const usedComponents = computed(() => usedComponentNames(runSurface.value));
const foundFactCount = computed(
  () =>
    factRows.value.filter(
      (row) => row.status === "found" || row.status === "accepted",
    ).length,
);
const reviewFactCount = computed(
  () => factRows.value.filter((row) => row.status === "review").length,
);

function prettyJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function resetRunResult(): void {
  runError.value = "";
  runSurface.value = undefined;
  latestFactCheck.value = [];
  rounds.value = [];
  previewTab.value = "render";
  resultStale.value = false;
  lastRunMode.value = undefined;
}

function selectDocument(document: ScenarioLabDocument): void {
  cancelPendingDraft();
  selectedName.value = document.name;
  contentDraft.value = prettyJson(document.presentationInput);
  factRows.value = factsToEditorRows(document.evaluationOracle);
  factEditorValid.value = true;
  dirty.value = false;
  notice.value = "";
  draftReviewRequired.value = false;
  draftReviewed.value = false;
  draftingOpen.value = false;
  evaluationOpen.value = false;
  draftDescription.value = "";
  resetRunResult();
}

async function refreshList(preferName?: string): Promise<void> {
  const index = await listScenarioLabDocuments(props.scenarioLabUrl);
  documents.value = index.documents;
  draftingAvailable.value = index.draftingAvailable;
  const preferred =
    documents.value.find((document) => document.name === preferName) ??
    documents.value[0];
  if (preferred !== undefined) selectDocument(preferred);
}

function markDirty(): void {
  dirty.value = true;
  if (!draftReviewRequired.value) notice.value = "";
  if (rounds.value.length > 0) resultStale.value = true;
}

function parseDrafts(): {
  evaluationOracle: ReturnType<typeof editorRowsToFacts>;
  presentationInput: unknown;
} {
  if (!factEditorValid.value) throw new Error("EVALUATION_ORACLE_INVALID");
  return {
    evaluationOracle: editorRowsToFacts(factRows.value),
    presentationInput: JSON.parse(contentDraft.value) as unknown,
  };
}

function errorText(result: {
  readonly error: { readonly code?: string; readonly message?: string };
}): string {
  return [result.error.code, result.error.message].filter(Boolean).join(" · ");
}

async function generatePreview(): Promise<void> {
  runError.value = "";
  notice.value = "";
  let presentationInput: unknown;
  try {
    presentationInput = JSON.parse(contentDraft.value) as unknown;
  } catch {
    runError.value = "内容契约不是有效 JSON。";
    return;
  }

  running.value = true;
  runProgress.value = 0;
  rounds.value = [];
  latestFactCheck.value = [];
  factRows.value = factRows.value.map((row) => ({
    ...row,
    status: "unchecked",
  }));
  resultStale.value = false;
  lastRunMode.value = "generation";
  const startedAt = performance.now();
  try {
    const result = await generateScenarioLabSurface(props.scenarioLabUrl, {
      presentationInput,
    });
    const durationMs = Math.round(performance.now() - startedAt);
    if (result.ok) {
      runSurface.value = result.surface;
      rounds.value = [
        {
          durationMs,
          factsFound: 0,
          factsTotal: 0,
          number: 1,
          renderable: true,
          valid: true,
        },
      ];
      previewTab.value = "render";
    } else {
      runSurface.value = undefined;
      runError.value = errorText(result);
    }
  } catch (error) {
    runSurface.value = undefined;
    runError.value =
      error instanceof Error ? error.message : "SCENARIO_GENERATION_FAILED";
  } finally {
    running.value = false;
  }
}

async function runEvaluation(): Promise<void> {
  runError.value = "";
  notice.value = "";
  let drafts: ReturnType<typeof parseDrafts>;
  try {
    drafts = parseDrafts();
  } catch {
    runError.value = "请检查内容契约和评估断言的 JSON 格式。";
    evaluationOpen.value = true;
    return;
  }
  if (drafts.evaluationOracle.facts.length === 0) {
    runError.value = "运行评估前至少需要一条评估断言。";
    evaluationOpen.value = true;
    return;
  }

  running.value = true;
  runProgress.value = 0;
  rounds.value = [];
  latestFactCheck.value = [];
  factRows.value = factRows.value.map((row) => ({
    ...row,
    status: "unchecked",
  }));
  resultStale.value = false;
  lastRunMode.value = "evaluation";
  let latestSurface: Record<string, unknown> | undefined;
  let latestSuccessfulFactCheck: readonly ScenarioLabFactCheckEntry[] = [];

  for (let index = 0; index < EVALUATION_ROUND_COUNT; index += 1) {
    const startedAt = performance.now();
    try {
      const result = await evaluateScenarioLabSurface(
        props.scenarioLabUrl,
        drafts,
      );
      const durationMs = Math.round(performance.now() - startedAt);
      if (result.ok) {
        latestSurface = result.surface;
        latestSuccessfulFactCheck = result.factCheck;
        rounds.value = [
          ...rounds.value,
          {
            durationMs,
            factsFound: result.factCheck.filter(
              (entry) => entry.status === "found",
            ).length,
            factsTotal: result.factCheck.length,
            number: index + 1,
            renderable: true,
            valid: true,
          },
        ];
      } else {
        rounds.value = [
          ...rounds.value,
          {
            durationMs,
            error: errorText(result),
            factsFound: 0,
            factsTotal: drafts.evaluationOracle.facts.length,
            number: index + 1,
            renderable: false,
            valid: false,
          },
        ];
      }
    } catch (error) {
      rounds.value = [
        ...rounds.value,
        {
          durationMs: Math.round(performance.now() - startedAt),
          error:
            error instanceof Error
              ? error.message
              : "SCENARIO_EVALUATION_FAILED",
          factsFound: 0,
          factsTotal: drafts.evaluationOracle.facts.length,
          number: index + 1,
          renderable: false,
          valid: false,
        },
      ];
    }
    runProgress.value = index + 1;
  }

  runSurface.value = latestSurface;
  latestFactCheck.value = latestSuccessfulFactCheck;
  if (latestSuccessfulFactCheck.length > 0) {
    factRows.value = applyFactCheck(factRows.value, latestSuccessfulFactCheck);
  }
  evaluationByScenario.value = {
    ...evaluationByScenario.value,
    [selectedName.value]: evaluationSummary(rounds.value),
  };
  previewTab.value = "evaluation";
  if (latestSurface === undefined) {
    runError.value = rounds.value.at(-1)?.error ?? "SCENARIO_RUN_FAILED";
  }
  running.value = false;
}

async function saveCurrent(): Promise<void> {
  notice.value = "";
  runError.value = "";
  let drafts: ReturnType<typeof parseDrafts>;
  try {
    drafts = parseDrafts();
  } catch {
    runError.value = "JSON 解析失败，请检查内容契约与评估断言格式。";
    return;
  }
  if (drafts.evaluationOracle.facts.length === 0) {
    runError.value = "保存为评估场景前至少需要一条评估断言。";
    evaluationOpen.value = true;
    return;
  }
  if (draftReviewRequired.value && !draftReviewed.value) {
    runError.value = "请先确认已核对 AI 草稿中的业务事实。";
    return;
  }

  const savedName = selectedName.value;
  saving.value = true;
  try {
    await saveScenarioLabDocument(props.scenarioLabUrl, {
      evaluationOracle: drafts.evaluationOracle,
      name: savedName,
      presentationInput: drafts.presentationInput,
    });
    await refreshList(savedName);
    dirty.value = false;
    notice.value = `场景 ${savedName} 已保存到仓库场景文件。`;
  } catch (error) {
    runError.value =
      error instanceof Error ? error.message : "SCENARIO_SAVE_FAILED";
  } finally {
    saving.value = false;
  }
}

function cancelPendingDraft(): void {
  activeDraftController?.abort();
  activeDraftController = undefined;
  drafting.value = false;
}

function createNew(): void {
  const name = newScenarioName.value.trim();
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    runError.value = "场景名只能包含小写字母、数字和连字符。";
    return;
  }
  if (documents.value.some((document) => document.name === name)) {
    runError.value = `场景 ${name} 已存在。`;
    return;
  }
  const document: ScenarioLabDocument = {
    evaluationOracle: { facts: [] },
    name,
    presentationInput: NEW_SCENARIO_TEMPLATE,
  };
  documents.value = [...documents.value, document];
  selectDocument(document);
  newScenarioName.value = "";
  dirty.value = true;
  notice.value = `新场景 ${name} 尚未保存，编辑后点击保存写入仓库。`;
}

async function draftFromDescription(): Promise<void> {
  const description = draftDescription.value.trim();
  if (description === "") {
    runError.value = "请先输入场景描述。";
    return;
  }
  if (selectedName.value === "") {
    runError.value = "请先选择或新建一个场景。";
    return;
  }
  if (!draftingAvailable.value) {
    runError.value = "Scenario fixture authoring 尚未配置。";
    return;
  }

  cancelPendingDraft();
  const targetName = selectedName.value;
  const controller = new AbortController();
  activeDraftController = controller;
  runError.value = "";
  notice.value = "";
  drafting.value = true;
  try {
    const result = await requestScenarioDraft(
      props.scenarioLabUrl,
      description,
      controller.signal,
    );
    if (
      activeDraftController !== controller ||
      selectedName.value !== targetName
    )
      return;
    if (!result.ok) {
      runError.value = errorText(result);
      return;
    }
    contentDraft.value = prettyJson({
      ...NEW_SCENARIO_TEMPLATE,
      content: {
        kind: "structured",
        mediaType: "application/json",
        value: result.content,
      },
    });
    draftReviewRequired.value = true;
    draftReviewed.value = false;
    draftingOpen.value = false;
    dirty.value = true;
    resultStale.value = rounds.value.length > 0;
    notice.value = "AI 草稿已填入内容契约，尚未保存。现在可以直接生成预览。";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    runError.value =
      error instanceof Error ? error.message : "SCENARIO_DRAFT_FAILED";
  } finally {
    if (activeDraftController === controller) {
      activeDraftController = undefined;
      drafting.value = false;
    }
  }
}

function confirmFact(index: number): void {
  factRows.value = factRows.value.map((row, rowIndex) =>
    rowIndex === index ? { ...row, status: "accepted" } : row,
  );
}

function scenarioEvaluation(name: string): string {
  return evaluationByScenario.value[name] ?? "未评估";
}

onMounted(async () => {
  try {
    await refreshList();
  } catch (error) {
    runError.value =
      error instanceof Error ? error.message : "SCENARIO_LIST_FAILED";
  }
});

onUnmounted(cancelPendingDraft);
</script>

<template>
  <CopilotKitProvider :a2ui="a2ui" :runtime-url="runtimeUrl">
    <div class="scenario-lab" data-testid="scenario-lab">
      <aside class="scenario-panel scenario-list-panel">
        <header class="panel-heading">
          评估场景
          <span class="count-badge">{{ documents.length }}</span>
        </header>
        <div class="scenario-list" data-testid="scenario-lab-list">
          <button
            v-for="document in documents"
            :key="document.name"
            class="scenario-list-item"
            :class="{ active: document.name === selectedName }"
            type="button"
            @click="selectDocument(document)"
          >
            <span class="scenario-name">{{ document.name }}</span>
            <span class="form-badge" :data-form="scenarioForm(document.presentationInput)">
              {{ scenarioForm(document.presentationInput) }}
            </span>
            <span class="scenario-meta">{{ scenarioEvaluation(document.name) }}</span>
            <span v-if="document.name === selectedName && dirty" class="dirty-dot">●</span>
          </button>
          <div v-if="documents.length === 0 && !runError" class="list-empty">
            仓库中暂无场景文件
          </div>
        </div>
        <footer class="list-footer">
          <form class="new-scenario" @submit.prevent="createNew">
            <input
              v-model="newScenarioName"
              data-testid="scenario-lab-new-name"
              placeholder="new-scenario-name"
              type="text"
            />
            <button class="secondary-button compact" type="submit">新建</button>
          </form>
          <button
            class="secondary-button draft-entry"
            data-testid="scenario-lab-draft-entry"
            :disabled="!draftingAvailable || selectedName === ''"
            type="button"
            @click="draftingOpen = true"
          >
            <span aria-hidden="true">✦</span> AI 起草
          </button>
          <small v-if="!draftingAvailable" class="draft-unavailable">
            需要单独配置 Scenario fixture authoring 模型
          </small>
        </footer>
      </aside>

      <section class="scenario-panel editor-panel">
        <header class="panel-heading">
          内容草稿 <code>presentation-input.json</code>
          <span v-if="dirty" class="dirty-label">● 未保存</span>
        </header>
        <form v-if="draftingOpen" class="draft-card" @submit.prevent="draftFromDescription">
          <div class="draft-card-heading">
            <strong><span aria-hidden="true">✦</span> AI 起草</strong>
            <span>只生成内容草稿，不参与 A2UI 布局决策</span>
          </div>
          <textarea
            v-model="draftDescription"
            data-testid="scenario-lab-draft-description"
            placeholder="例如：一个包含 5 台设备、其中 1 台异常的巡检摘要"
            rows="2"
          />
          <div class="draft-card-actions">
            <button class="secondary-button compact" type="button" @click="draftingOpen = false">
              取消
            </button>
            <button
              class="primary-button compact"
              data-testid="scenario-lab-draft"
              :disabled="drafting"
              type="submit"
            >
              {{ drafting ? "起草中…" : "生成草稿" }}
            </button>
          </div>
        </form>
        <div v-if="draftReviewRequired" class="draft-review-banner">
          <span>AI 草稿待审定 - 保存为评估场景前需要核对业务事实</span>
          <label>
            <input
              v-model="draftReviewed"
              data-testid="scenario-lab-draft-reviewed"
              type="checkbox"
            />
            我已核对草稿中的业务事实
          </label>
        </div>
        <textarea
          v-model="contentDraft"
          class="content-editor"
          data-testid="scenario-lab-content"
          rows="12"
          spellcheck="false"
          @input="markDirty"
        />
        <button
          :aria-expanded="evaluationOpen"
          class="editor-subheading evaluation-disclosure"
          data-testid="scenario-lab-evaluation-toggle"
          type="button"
          @click="evaluationOpen = !evaluationOpen"
        >
          <span>{{ evaluationOpen ? "▾" : "▸" }} 高级评估</span>
          <code>expected-facts.json</code>
          <span class="evaluation-count">{{ factRows.length }} 条断言</span>
        </button>
        <div v-if="evaluationOpen" class="facts-region">
          <p class="evaluation-help">
            评估断言只用于检查生成结果是否保留业务事实，不会发送给 Dynamic A2UI 生成模型。
          </p>
          <ScenarioFactsEditor
            :key="selectedName"
            v-model="factRows"
            @changed="markDirty"
            @confirm="confirmFact"
            @validity="factEditorValid = $event"
          />
        </div>
        <div
          v-if="runError"
          class="editor-message error"
          data-testid="scenario-lab-error"
          role="alert"
        >
          {{ runError }}
        </div>
        <div
          v-else-if="notice"
          class="editor-message notice"
          data-testid="scenario-lab-notice"
        >
          {{ notice }}
        </div>
        <footer class="editor-footer">
          <button
            class="primary-button compact"
            data-testid="scenario-lab-run"
            :disabled="running || selectedName === ''"
            type="button"
            @click="generatePreview"
          >
            {{ running && lastRunMode === "generation" ? "生成中…" : "▶ 生成预览" }}
          </button>
          <button
            class="secondary-button compact"
            data-testid="scenario-lab-evaluate"
            :disabled="running || selectedName === '' || !hasEvaluationOracle"
            type="button"
            @click="runEvaluation"
          >
            {{
              running && lastRunMode === "evaluation"
                ? `评估中 ${runProgress}/${EVALUATION_ROUND_COUNT}`
                : `评估 ${EVALUATION_ROUND_COUNT} 轮`
            }}
          </button>
          <button
            class="secondary-button compact"
            data-testid="scenario-lab-save"
            :disabled="saving || !canSave"
            type="button"
            @click="saveCurrent"
          >
            {{ saving ? "保存中…" : "保存为评估场景" }}
          </button>
        </footer>
      </section>

      <section class="scenario-panel preview-panel">
        <nav class="preview-tabs" aria-label="生成结果">
          <button type="button" :class="{ active: previewTab === 'render' }" @click="previewTab = 'render'">渲染</button>
          <button type="button" :class="{ active: previewTab === 'a2ui' }" @click="previewTab = 'a2ui'">A2UI</button>
          <button type="button" :class="{ active: previewTab === 'components' }" @click="previewTab = 'components'">组件</button>
          <button type="button" :class="{ active: previewTab === 'evaluation' }" @click="previewTab = 'evaluation'">评估</button>
          <span v-if="resultStale" class="stale-badge">输入已变更</span>
        </nav>
        <div class="preview-body">
          <template v-if="rounds.length > 0">
            <div
              v-if="previewTab === 'render' && surfaceMessage"
              class="surface-preview"
              data-testid="scenario-lab-surface"
            >
              <ActivityMessagePresentation :message="surfaceMessage" />
            </div>
            <div v-else-if="previewTab === 'render'" class="preview-empty compact-empty">
              <span class="empty-glyph">!</span>
              <span>本次运行没有可渲染的 surface</span>
            </div>
            <pre v-else-if="previewTab === 'a2ui'" class="a2ui-json">{{ surfaceJson || "暂无 A2UI 输出" }}</pre>
            <ul v-else-if="previewTab === 'components'" class="component-list">
              <li v-for="component in usedComponents" :key="component">
                <code>{{ component }}</code>
                <span :class="platformCatalog.components.has(component) ? 'in-catalog' : 'unknown-component'">
                  {{ platformCatalog.components.has(component) ? "catalog 内" : "catalog 外" }}
                </span>
              </li>
              <li v-if="usedComponents.length === 0" class="components-empty">
                当前输出中没有可识别的组件
              </li>
            </ul>
            <div v-else class="evaluation-table-wrap">
              <table class="evaluation-table" data-testid="scenario-lab-evaluation">
                <thead><tr><th>#</th><th>合法</th><th>可渲染</th><th>事实</th><th>耗时</th></tr></thead>
                <tbody>
                  <tr v-for="round in rounds" :key="round.number">
                    <td>{{ round.number }}</td>
                    <td>{{ round.valid ? "✓" : "✗" }}</td>
                    <td>{{ round.renderable ? "✓" : "✗" }}</td>
                    <td>{{ round.factsFound }}/{{ round.factsTotal }}</td>
                    <td>{{ (round.durationMs / 1000).toFixed(1) }}s</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
          <div v-else class="preview-empty">
            <span class="empty-glyph">◈</span>
            <span>生成预览后此处展示 Dynamic A2UI surface</span>
            <small>A2UI JSON · 所用组件 · 评估结果</small>
          </div>
        </div>
        <footer v-if="rounds.length > 0" class="preview-footer">
          <template v-if="lastRunMode === 'generation'">
            <span>自由生成预览 · 未执行事实评估</span>
          </template>
          <template v-else-if="previewTab === 'evaluation'">
            <span>
              {{ rounds.length }} 轮 · 合法可渲染
              <b>{{ rounds.filter((round) => round.valid && round.renderable).length }}/{{ rounds.length }}</b>
              · 事实完整
              <b>{{ rounds.filter((round) => round.factsFound === round.factsTotal).length }}/{{ rounds.length }}</b>
            </span>
          </template>
          <template v-else>
            <span>
              事实保留 <b>{{ foundFactCount }}/{{ factRows.length }}</b>
              <em v-if="reviewFactCount > 0">· {{ reviewFactCount }} 待确认，请在评估断言中处理</em>
            </span>
            <details
              v-if="latestFactCheck.length > 0"
              class="fact-check-detail"
              data-testid="scenario-lab-fact-check"
            >
              <summary>查看明细</summary>
              <ul>
                <li v-for="entry in latestFactCheck" :key="entry.pointer">
                  <code>{{ entry.pointer }}</code> = <code>{{ JSON.stringify(entry.value) }}</code>
                </li>
              </ul>
            </details>
          </template>
        </footer>
      </section>
    </div>
  </CopilotKitProvider>
</template>

<style scoped src="./scenario-lab.css"></style>
