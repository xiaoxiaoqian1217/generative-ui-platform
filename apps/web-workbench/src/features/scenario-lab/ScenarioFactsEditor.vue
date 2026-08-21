<script setup lang="ts">
import { ref } from "vue";
import {
  editorRowsToFacts,
  evaluationOracleJson,
  parseEvaluationOracleJson,
  type ScenarioFactEditorRow,
} from "./scenario-lab-model.js";

const rows = defineModel<ScenarioFactEditorRow[]>({ required: true });
const emit = defineEmits<{
  changed: [];
  confirm: [index: number];
  validity: [valid: boolean];
}>();

const mode = ref<"json" | "table">("table");
const jsonDraft = ref("");
const jsonError = ref("");

function reportTableValidity(): void {
  try {
    editorRowsToFacts(rows.value);
    jsonError.value = "";
    emit("validity", true);
  } catch {
    jsonError.value = '期望值必须是有效 JSON，例如 128、true 或 "running"。';
    emit("validity", false);
  }
}

function replaceRow(
  index: number,
  patch: Partial<ScenarioFactEditorRow>,
): void {
  rows.value = rows.value.map((row, rowIndex) =>
    rowIndex === index ? { ...row, ...patch, status: "unchecked" } : row,
  );
  emit("changed");
  reportTableValidity();
}

function addRow(): void {
  rows.value = [
    ...rows.value,
    { pointer: "/", status: "unchecked", valueText: "null" },
  ];
  emit("changed");
  reportTableValidity();
}

function removeRow(index: number): void {
  rows.value = rows.value.filter((_, rowIndex) => rowIndex !== index);
  emit("changed");
  reportTableValidity();
}

function showJson(): void {
  try {
    jsonDraft.value = evaluationOracleJson(rows.value);
    jsonError.value = "";
    mode.value = "json";
    emit("validity", true);
  } catch {
    jsonError.value = '期望值必须是有效 JSON，例如 128、true 或 "running"。';
    emit("validity", false);
  }
}

function showTable(): void {
  if (mode.value === "table") return;
  try {
    rows.value = parseEvaluationOracleJson(jsonDraft.value);
    jsonError.value = "";
    mode.value = "table";
    emit("changed");
    emit("validity", true);
  } catch {
    jsonError.value = "JSON 无效，未切回表格。";
    emit("validity", false);
  }
}

function updateJsonDraft(value: string): void {
  jsonDraft.value = value;
  jsonError.value = "";
  try {
    editorRowsToFacts(parseEvaluationOracleJson(value));
    rows.value = parseEvaluationOracleJson(value);
    emit("changed");
    emit("validity", true);
  } catch {
    // Keep the invalid buffer in the editor until the user finishes editing.
    emit("validity", false);
  }
}
</script>

<template>
  <div class="facts-editor" data-testid="scenario-lab-facts-editor">
    <div class="facts-toolbar">
      <span>
        {{ rows.length === 0 ? "尚未添加断言" : `${rows.length} 条断言` }}
      </span>
      <div class="facts-toggle" aria-label="评估断言编辑模式">
        <button
          type="button"
          :class="{ active: mode === 'table' }"
          @click="showTable"
        >
          表格
        </button>
        <button
          type="button"
          :class="{ active: mode === 'json' }"
          data-testid="scenario-lab-facts-json-tab"
          @click="showJson"
        >
          JSON
        </button>
      </div>
    </div>

    <template v-if="mode === 'table'">
      <div class="facts-table-wrap">
        <table class="facts-table" data-testid="scenario-lab-facts-table">
          <thead>
            <tr>
              <th>Pointer</th>
              <th>期望值 (JSON)</th>
              <th>核对</th>
              <th><span class="visually-hidden">操作</span></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, index) in rows"
              :key="index"
              :data-status="row.status"
              data-testid="scenario-lab-fact-row"
            >
              <td>
                <input
                  :value="row.pointer"
                  aria-label="断言 pointer"
                  spellcheck="false"
                  @input="replaceRow(index, { pointer: ($event.target as HTMLInputElement).value })"
                />
              </td>
              <td>
                <input
                  :value="row.valueText"
                  aria-label="断言期望值"
                  spellcheck="false"
                  @input="replaceRow(index, { valueText: ($event.target as HTMLInputElement).value })"
                />
              </td>
              <td>
                <span v-if="row.status === 'found'" class="fact-chip found">
                  已保留
                </span>
                <span
                  v-else-if="row.status === 'accepted'"
                  class="fact-chip accepted"
                >
                  已复核
                </span>
                <span
                  v-else-if="row.status === 'review'"
                  class="fact-chip review"
                >
                  待确认
                  <button type="button" @click="emit('confirm', index)">
                    确认
                  </button>
                </span>
                <span v-else class="fact-chip">未核对</span>
              </td>
              <td>
                <button
                  class="row-delete"
                  type="button"
                  title="删除断言"
                  @click="removeRow(index)"
                >
                  ×
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <button class="add-fact" type="button" @click="addRow">
        + 添加断言
      </button>
    </template>

    <template v-else>
      <textarea
        :value="jsonDraft"
        class="facts-json"
        data-testid="scenario-lab-facts"
        rows="10"
        spellcheck="false"
        @input="updateJsonDraft(($event.target as HTMLTextAreaElement).value)"
      />
    </template>
    <p v-if="jsonError" class="facts-error" role="alert">{{ jsonError }}</p>
  </div>
</template>

<style scoped>
.facts-editor {
  min-height: 0;
  background: var(--paper);
}

.facts-toolbar {
  display: flex;
  min-height: 36px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 5px 12px;
  border-bottom: 1px solid var(--line);
  color: var(--muted);
  background: #fafbfc;
  font-size: 12px;
}

.facts-toggle {
  display: flex;
}

.facts-toggle button {
  padding: 3px 9px;
  border: 1px solid var(--line);
  color: var(--muted);
  background: #fff;
  cursor: pointer;
  font-size: 11px;
}

.facts-toggle button:first-child {
  border-radius: 5px 0 0 5px;
}

.facts-toggle button:last-child {
  border-left: 0;
  border-radius: 0 5px 5px 0;
}

.facts-toggle button.active {
  border-color: var(--accent);
  color: #fff;
  background: var(--accent);
}

.facts-table-wrap {
  overflow: auto;
}

.facts-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.facts-table th {
  padding: 6px 9px;
  color: var(--muted);
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
}

.facts-table td {
  padding: 4px 9px;
  border-top: 1px solid #f0f2f5;
}

.facts-table th:first-child,
.facts-table td:first-child {
  width: 35%;
}

.facts-table th:nth-child(2),
.facts-table td:nth-child(2) {
  width: 38%;
}

.facts-table input {
  width: 100%;
  min-width: 92px;
  padding: 5px 7px;
  border: 1px solid #e6e9ee;
  border-radius: 5px;
  color: #334155;
  background: #fbfcfd;
  font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
  font-size: 11px;
}

.facts-table input:focus {
  border-color: var(--accent);
  background: #fff;
  outline: none;
}

.fact-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  color: var(--muted);
  background: #eceff3;
  font-size: 11px;
  white-space: nowrap;
}

.fact-chip.found {
  color: var(--success);
  background: #e3f3e7;
}

.fact-chip.accepted {
  color: #0f766e;
  background: #e0f2f1;
}

.fact-chip.review {
  color: var(--degraded);
  background: #fdf0dc;
}

.fact-chip button {
  padding: 0 5px;
  border: 1px solid currentColor;
  border-radius: 4px;
  color: inherit;
  background: transparent;
  cursor: pointer;
  font-size: 10px;
}

.row-delete {
  border: 0;
  color: var(--muted);
  background: transparent;
  cursor: pointer;
  font-size: 15px;
}

.row-delete:hover {
  color: var(--danger);
}

.add-fact {
  margin: 7px 10px 9px;
  padding: 4px 10px;
  border: 1px dashed var(--line);
  border-radius: 5px;
  color: var(--muted);
  background: transparent;
  cursor: pointer;
  font-size: 12px;
}

.add-fact:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.facts-json {
  display: block;
  width: 100%;
  min-height: 180px;
  padding: 12px 14px;
  border: 0;
  color: #334155;
  background: #f8fafc;
  font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
  font-size: 12px;
  line-height: 1.65;
  resize: vertical;
}

.facts-json:focus {
  outline: none;
}

.facts-error {
  margin: 0;
  padding: 7px 12px;
  border-top: 1px solid #f1caca;
  color: var(--danger);
  background: #fff4f4;
  font-size: 12px;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
