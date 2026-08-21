import type {
  ScenarioLabEvaluationOracle,
  ScenarioLabFactCheckEntry,
} from "./scenario-lab-client.js";

export type ScenarioFactStatus = "accepted" | "found" | "review" | "unchecked";

export interface ScenarioFactEditorRow {
  pointer: string;
  status: ScenarioFactStatus;
  valueText: string;
}

export interface ScenarioEvaluationRound {
  readonly durationMs: number;
  readonly error?: string;
  readonly factsFound: number;
  readonly factsTotal: number;
  readonly number: number;
  readonly renderable: boolean;
  readonly valid: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function formatFactValue(value: unknown): string {
  return JSON.stringify(value) ?? "null";
}

export function factsToEditorRows(
  evaluationOracle: ScenarioLabEvaluationOracle,
): ScenarioFactEditorRow[] {
  return evaluationOracle.facts.map((fact) => ({
    pointer: fact.pointer,
    status: "unchecked",
    valueText: formatFactValue(fact.value),
  }));
}

export function editorRowsToFacts(
  rows: readonly ScenarioFactEditorRow[],
): ScenarioLabEvaluationOracle {
  return {
    facts: rows.map((row) => ({
      pointer: row.pointer,
      value: JSON.parse(row.valueText) as unknown,
    })),
  };
}

export function evaluationOracleJson(
  rows: readonly ScenarioFactEditorRow[],
): string {
  return `${JSON.stringify(editorRowsToFacts(rows), null, 2)}\n`;
}

export function parseEvaluationOracleJson(
  source: string,
): ScenarioFactEditorRow[] {
  const parsed = JSON.parse(source) as unknown;
  if (!isRecord(parsed) || !Array.isArray(parsed.facts)) {
    throw new Error("EVALUATION_ORACLE_INVALID");
  }
  return parsed.facts.map((fact) => {
    if (!isRecord(fact) || typeof fact.pointer !== "string") {
      throw new Error("EVALUATION_ORACLE_INVALID");
    }
    return {
      pointer: fact.pointer,
      status: "unchecked",
      valueText: formatFactValue(fact.value),
    };
  });
}

export function applyFactCheck(
  rows: readonly ScenarioFactEditorRow[],
  factCheck: readonly ScenarioLabFactCheckEntry[],
): ScenarioFactEditorRow[] {
  return rows.map((row, index) => ({
    ...row,
    status: factCheck[index]?.status ?? "review",
  }));
}

function presentationContent(input: unknown): Record<string, unknown> {
  if (!isRecord(input) || !isRecord(input.content)) return {};
  return isRecord(input.content.value) ? input.content.value : {};
}

export function scenarioForm(input: unknown): string {
  const content = presentationContent(input);
  if (Array.isArray(content.events)) return "时间线";
  if (Array.isArray(content.options)) return "对比";
  if (Array.isArray(content.items)) return "集合";
  if ("result" in content || "message" in content) return "结果";
  if ("total" in content || "success" in content || "failed" in content)
    return "摘要";
  if ("id" in content || "owner" in content) return "明细";
  return "结构化";
}

export function usedComponentNames(surface: unknown): string[] {
  const names = new Set<string>();

  function visit(node: unknown): void {
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (!isRecord(node)) return;
    if (typeof node.component === "string") names.add(node.component);
    for (const value of Object.values(node)) visit(value);
  }

  visit(surface);
  return [...names].sort((left, right) => left.localeCompare(right));
}

export function evaluationSummary(
  rounds: readonly ScenarioEvaluationRound[],
): string {
  if (rounds.length === 0) return "未评估";
  const complete = rounds.filter(
    (round) =>
      round.valid && round.renderable && round.factsFound === round.factsTotal,
  ).length;
  return `${rounds.length} 轮 · ${complete}/${rounds.length}`;
}
