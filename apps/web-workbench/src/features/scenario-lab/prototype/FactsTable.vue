<script setup lang="ts">
/**
 * PROTOTYPE - throwaway. Facts checklist as a structured table with a JSON
 * source toggle. Runs annotate rows in place; review rows carry a confirm
 * action. File format unchanged ({ facts: [{pointer, value}] }).
 */
import { computed, ref } from "vue";
import type { StubFactRow } from "./stub-data";

const rows = defineModel<StubFactRow[]>({ required: true });

/** bare: drop the outer card chrome when nested inside a .pp-panel. */
defineProps<{ bare?: boolean }>();

/**
 * 确认是有后果的动作:由父级处理(认可表达改写、记录 alias、
 * 影响保存门控与判定),表格本身不私自改状态。
 */
const emit = defineEmits<{ confirm: [row: StubFactRow] }>();

const mode = ref<"table" | "json">("table");
const jsonDraft = ref("");
const jsonError = ref("");

const foundCount = computed(
  () =>
    rows.value.filter(
      (row) => row.status === "found" || row.status === "accepted",
    ).length,
);
const reviewCount = computed(
  () => rows.value.filter((row) => row.status === "review").length,
);

function addRow(): void {
  rows.value = [
    ...rows.value,
    { pointer: "/", status: "unchecked", value: "" },
  ];
}

function removeRow(index: number): void {
  rows.value = rows.value.filter((_, i) => i !== index);
}

function toJson(): void {
  jsonDraft.value = `${JSON.stringify(
    { facts: rows.value.map(({ pointer, value }) => ({ pointer, value })) },
    null,
    2,
  )}\n`;
  jsonError.value = "";
  mode.value = "json";
}

function toTable(): void {
  try {
    const parsed = JSON.parse(jsonDraft.value) as {
      facts?: { pointer: string; value: unknown }[];
    };
    if (!Array.isArray(parsed.facts)) throw new Error("missing facts");
    rows.value = parsed.facts.map((fact) => ({
      pointer: String(fact.pointer),
      status: "unchecked",
      value:
        typeof fact.value === "string"
          ? fact.value
          : JSON.stringify(fact.value),
    }));
    mode.value = "table";
  } catch {
    jsonError.value = "JSON 无效,未切回表格。";
  }
}
</script>

<template>
  <div class="facts-editor" :class="{ bare }">
    <div class="facts-head">
      <span class="facts-summary">
        <template v-if="reviewCount > 0 || foundCount > 0">
          <b>{{ foundCount }}/{{ rows.length }}</b> 已保留
          <em v-if="reviewCount > 0"> · {{ reviewCount }} 待确认</em>
        </template>
        <template v-else>未核对</template>
      </span>
      <span class="facts-toggle">
        <button type="button" :class="{ on: mode === 'table' }" @click="toTable">表格</button>
        <button type="button" :class="{ on: mode === 'json' }" @click="toJson">JSON</button>
      </span>
    </div>

    <table v-if="mode === 'table'" class="facts-table">
      <thead>
        <tr><th>Pointer</th><th>期望值</th><th>核对</th><th /></tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in rows" :key="index" :data-status="row.status">
          <td><input v-model="row.pointer" spellcheck="false" @input="row.status = 'unchecked'" /></td>
          <td><input v-model="row.value" spellcheck="false" @input="row.status = 'unchecked'" /></td>
          <td>
            <span v-if="row.status === 'found'" class="chip chip-ok">已保留</span>
            <span v-else-if="row.status === 'accepted'" class="chip chip-accepted">
              已认可<template v-if="row.acceptedAs !== undefined"> · {{ row.acceptedAs }}</template>
            </span>
            <span v-else-if="row.status === 'review'" class="chip chip-review">
              待确认
              <button type="button" class="chip-action" @click="emit('confirm', row)">确认</button>
            </span>
            <span v-else class="chip">未核对</span>
          </td>
          <td><button type="button" class="row-del" title="删除" @click="removeRow(index)">×</button></td>
        </tr>
      </tbody>
    </table>
    <button v-if="mode === 'table'" type="button" class="add-row" @click="addRow">+ 添加事实</button>

    <template v-else>
      <textarea v-model="jsonDraft" class="facts-json" rows="8" spellcheck="false" />
      <p v-if="jsonError" class="facts-error">{{ jsonError }}</p>
    </template>
  </div>
</template>

<style scoped>
.facts-editor {
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--paper);
  overflow: hidden;
}

.facts-editor.bare {
  border: 0;
  border-radius: 0;
}

.facts-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-bottom: 1px solid var(--line);
  background: #fafbfc;
  font-size: 12px;
}

.facts-summary { color: var(--muted); }
.facts-summary b { color: var(--success); }
.facts-summary em { color: var(--degraded); font-style: normal; }

.facts-toggle button {
  padding: 2px 8px;
  border: 1px solid var(--line);
  background: #fff;
  font-size: 11px;
  cursor: pointer;
}

.facts-toggle button:first-child { border-radius: 5px 0 0 5px; }
.facts-toggle button:last-child { border-radius: 0 5px 5px 0; border-left: 0; }
.facts-toggle button.on { background: var(--accent); border-color: var(--accent); color: #fff; }

.facts-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.facts-table th {
  padding: 4px 8px;
  color: var(--muted);
  font-weight: 600;
  text-align: left;
}

.facts-table td {
  padding: 3px 8px;
  border-top: 1px solid #f0f2f5;
}

.facts-table input {
  width: 100%;
  padding: 4px 7px;
  border: 1px solid #e8ebef;
  border-radius: 5px;
  background: #fbfcfd;
  font-family: ui-monospace, monospace;
  font-size: 12px;
}

.facts-table input:hover {
  border-color: #c6cdd8;
  background: #fff;
}

.facts-table input:focus {
  border-color: var(--accent);
  background: #fff;
  outline: none;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 8px;
  border-radius: 999px;
  background: #eceff3;
  color: var(--muted);
  font-size: 11px;
  white-space: nowrap;
}

.chip-ok { background: #e3f3e7; color: var(--success); }
.chip-accepted { background: #e0f2f1; color: #0f766e; }
.chip-review { background: #fdf0dc; color: var(--degraded); }

.chip-action {
  padding: 0 6px;
  border: 1px solid currentColor;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  font-size: 10px;
  cursor: pointer;
}

.row-del {
  border: 0;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
}

.row-del:hover { color: var(--danger); }

.add-row {
  margin: 6px 10px 8px;
  padding: 3px 10px;
  border: 1px dashed var(--line);
  border-radius: 5px;
  background: transparent;
  color: var(--muted);
  font-size: 12px;
  cursor: pointer;
}

.add-row:hover { color: var(--accent); border-color: var(--accent); }

.facts-json {
  width: 100%;
  padding: 8px;
  border: 0;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  resize: vertical;
}

.facts-error {
  margin: 4px 10px 8px;
  color: var(--danger);
  font-size: 12px;
}
</style>
