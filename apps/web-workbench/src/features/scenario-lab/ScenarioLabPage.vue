<script setup lang="ts">
import type { ActivityMessage } from "@ag-ui/core";
import { CopilotKitProvider } from "@copilotkit/vue/v2";
import { computed, onMounted, ref } from "vue";
import ActivityMessagePresentation from "../../conversation/ActivityMessagePresentation.vue";
import { platformCatalog } from "../a2ui/catalog/platform-catalog.js";
import {
  listScenarioLabDocuments,
  runScenarioLabDocument,
  type ScenarioLabDocument,
  type ScenarioLabFactCheckEntry,
  saveScenarioLabDocument,
} from "./scenario-lab-client.js";

/**
 * Scenario Lab (Issue #213 场景编辑): the Workbench front-end for the
 * repository scenario JSON files. Edit the content contract and expected
 * facts, run the real Secondary LLM generation, inspect the rendered
 * surface and the fact checklist; saving writes the repository files back.
 * The editor never touches the expected UI tree - structure stays the
 * LLM's decision.
 */

const props = defineProps<{ runtimeUrl: string }>();

const labBaseUrl = computed(() => `${props.runtimeUrl}/dev/scenarios`);
const a2ui = { catalog: platformCatalog };

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

const documents = ref<readonly ScenarioLabDocument[]>([]);
const selectedName = ref("");
const contentDraft = ref("");
const factsDraft = ref("");
const newScenarioName = ref("");
const notice = ref("");
const running = ref(false);
const saving = ref(false);
const runError = ref("");
const runSurface = ref<Record<string, unknown> | undefined>(undefined);
const factCheck = ref<readonly ScenarioLabFactCheckEntry[]>([]);

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

function prettyJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function selectDocument(document: ScenarioLabDocument): void {
  selectedName.value = document.name;
  contentDraft.value = prettyJson(document.presentationInput);
  factsDraft.value = prettyJson(document.expectedFacts);
  notice.value = "";
  runError.value = "";
  runSurface.value = undefined;
  factCheck.value = [];
}

async function refreshList(preferName?: string): Promise<void> {
  documents.value = await listScenarioLabDocuments(labBaseUrl.value);
  const preferred =
    documents.value.find((document) => document.name === preferName) ??
    documents.value[0];
  if (preferred !== undefined) selectDocument(preferred);
}

function parseDrafts(): {
  expectedFacts: unknown;
  presentationInput: unknown;
} {
  const presentationInput = JSON.parse(contentDraft.value) as unknown;
  const expectedFacts = JSON.parse(factsDraft.value) as unknown;
  return { expectedFacts, presentationInput };
}

async function runCurrent(): Promise<void> {
  runError.value = "";
  notice.value = "";
  let drafts: ReturnType<typeof parseDrafts>;
  try {
    drafts = parseDrafts();
  } catch {
    runError.value = "JSON 解析失败：请检查内容契约与事实清单格式。";
    return;
  }
  running.value = true;
  try {
    const result = await runScenarioLabDocument(labBaseUrl.value, {
      expectedFacts:
        drafts.expectedFacts as ScenarioLabDocument["expectedFacts"],
      presentationInput: drafts.presentationInput,
    });
    if (result.ok) {
      runSurface.value = result.surface;
      factCheck.value = result.factCheck;
    } else {
      runSurface.value = undefined;
      factCheck.value = [];
      runError.value = [result.error.code, result.error.message]
        .filter(Boolean)
        .join(" · ");
    }
  } catch (error) {
    runError.value =
      error instanceof Error ? error.message : "SCENARIO_RUN_FAILED";
  } finally {
    running.value = false;
  }
}

async function saveCurrent(): Promise<void> {
  notice.value = "";
  runError.value = "";
  let drafts: ReturnType<typeof parseDrafts>;
  try {
    drafts = parseDrafts();
  } catch {
    runError.value = "JSON 解析失败：请检查内容契约与事实清单格式。";
    return;
  }
  saving.value = true;
  try {
    await saveScenarioLabDocument(labBaseUrl.value, {
      expectedFacts:
        drafts.expectedFacts as ScenarioLabDocument["expectedFacts"],
      name: selectedName.value,
      presentationInput: drafts.presentationInput,
    });
    notice.value = `场景 ${selectedName.value} 已保存到仓库场景文件。`;
    await refreshList(selectedName.value);
  } catch (error) {
    runError.value =
      error instanceof Error ? error.message : "SCENARIO_SAVE_FAILED";
  } finally {
    saving.value = false;
  }
}

function createNew(): void {
  const name = newScenarioName.value.trim();
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    runError.value = "场景名只能包含小写字母、数字和连字符。";
    return;
  }
  newScenarioName.value = "";
  selectDocument({
    expectedFacts: { facts: [] },
    name,
    presentationInput: NEW_SCENARIO_TEMPLATE,
  });
  notice.value = `新场景 ${name} 尚未保存，编辑后点击保存写入仓库。`;
}

onMounted(async () => {
  try {
    await refreshList();
  } catch (error) {
    runError.value =
      error instanceof Error ? error.message : "SCENARIO_LIST_FAILED";
  }
});
</script>

<template>
  <CopilotKitProvider :a2ui="a2ui" :runtime-url="runtimeUrl">
    <div class="scenario-lab" data-testid="scenario-lab">
      <aside class="scenario-lab-sidebar">
        <h3>场景文件</h3>
        <ul class="scenario-lab-list" data-testid="scenario-lab-list">
          <li v-for="document in documents" :key="document.name">
            <button
              class="secondary-button"
              :class="{ active: document.name === selectedName }"
              type="button"
              @click="selectDocument(document)"
            >
              {{ document.name }}
            </button>
          </li>
        </ul>
        <form class="scenario-lab-new" @submit.prevent="createNew">
          <input
            v-model="newScenarioName"
            data-testid="scenario-lab-new-name"
            placeholder="new-scenario-name"
            type="text"
          />
          <button class="secondary-button" type="submit">新建</button>
        </form>
      </aside>

      <section class="scenario-lab-editor">
        <label>
          内容契约 presentation-input.json
          <textarea
            v-model="contentDraft"
            data-testid="scenario-lab-content"
            rows="14"
            spellcheck="false"
          ></textarea>
        </label>
        <label>
          事实清单 expected-facts.json
          <textarea
            v-model="factsDraft"
            data-testid="scenario-lab-facts"
            rows="8"
            spellcheck="false"
          ></textarea>
        </label>
        <div class="button-group">
          <button
            class="primary-button"
            data-testid="scenario-lab-run"
            :disabled="running || selectedName === ''"
            type="button"
            @click="runCurrent"
          >
            {{ running ? "生成中…" : "运行生成" }}
          </button>
          <button
            class="secondary-button"
            data-testid="scenario-lab-save"
            :disabled="saving || selectedName === ''"
            type="button"
            @click="saveCurrent"
          >
            保存
          </button>
        </div>
        <p v-if="notice" data-testid="scenario-lab-notice">{{ notice }}</p>
        <p v-if="runError" class="scenario-lab-error" data-testid="scenario-lab-error" role="alert">
          {{ runError }}
        </p>
      </section>

      <section class="scenario-lab-result">
        <h3>生成结果</h3>
        <div v-if="surfaceMessage" data-testid="scenario-lab-surface">
          <ActivityMessagePresentation :message="surfaceMessage" />
        </div>
        <ul v-if="factCheck.length > 0" class="scenario-lab-facts" data-testid="scenario-lab-fact-check">
          <li
            v-for="entry in factCheck"
            :key="entry.pointer"
            :data-status="entry.status"
          >
            <code>{{ entry.pointer }}</code> = <code>{{ JSON.stringify(entry.value) }}</code>
            <strong>{{ entry.status === "found" ? "已保留" : "待人工确认" }}</strong>
          </li>
        </ul>
        <p v-if="!surfaceMessage && !runError" class="scenario-lab-hint">
          选择场景后点击"运行生成"，此处展示真实 Secondary LLM 生成的 A2UI surface 与事实保留核对。
        </p>
      </section>
    </div>
  </CopilotKitProvider>
</template>

<style scoped>
.scenario-lab {
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(10rem, 14rem) minmax(20rem, 1fr) minmax(20rem, 1fr);
  text-align: left;
}

.scenario-lab-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.scenario-lab-list button {
  margin-block: 0.15rem;
  width: 100%;
}

.scenario-lab-list button.active {
  font-weight: 700;
}

.scenario-lab-new {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.8rem;
}

.scenario-lab-editor label {
  display: block;
  margin-bottom: 0.8rem;
}

.scenario-lab-editor textarea {
  box-sizing: border-box;
  font-family: monospace;
  margin-top: 0.3rem;
  width: 100%;
}

.scenario-lab-error {
  color: #b3261e;
}

.scenario-lab-facts {
  list-style: none;
  margin: 1rem 0 0;
  padding: 0;
}

.scenario-lab-facts li {
  margin-block: 0.25rem;
}

.scenario-lab-facts li[data-status="found"] strong {
  color: #146c2e;
}

.scenario-lab-facts li[data-status="review"] strong {
  color: #8a5a00;
}

.scenario-lab-hint {
  color: #666;
}

@media (max-width: 1100px) {
  .scenario-lab {
    grid-template-columns: 1fr;
  }
}
</style>
