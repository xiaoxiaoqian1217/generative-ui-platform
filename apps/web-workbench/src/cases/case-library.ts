import type { RuntimeRunResult } from "@generative-ui/runtime-contract";

export interface SemanticExpectation {
  readonly presentationMode?: "markdown" | "generative-ui";
  readonly errorStage?: string;
  readonly errorCode?: string;
  readonly degraded?: boolean;
}

export interface WorkbenchCase {
  readonly id: string;
  readonly title: string;
  readonly input: string;
  readonly expectation: SemanticExpectation;
  readonly builtin: boolean;
}

export interface CaseEvaluation {
  readonly passed: boolean;
  readonly failures: readonly string[];
}

export const WORKBENCH_CASE_LIBRARY_KEY = "generative-ui.workbench.cases.v1";
export const WORKBENCH_PENDING_CASE_KEY =
  "generative-ui.workbench.pending-case.v1";

const builtin = (
  id: string,
  title: string,
  input: string,
  expectation: SemanticExpectation,
): WorkbenchCase =>
  Object.freeze({
    id,
    title,
    input,
    expectation: Object.freeze(expectation),
    builtin: true,
  });

export const BUILTIN_CASES: readonly WorkbenchCase[] = Object.freeze([
  builtin(
    "markdown-direct",
    "Markdown 直出",
    "请用 Markdown 总结当前平台状态。",
    { presentationMode: "markdown" },
  ),
  builtin("device-status", "设备状态 UI", "查看当前可用的无人机和无人车。", {
    presentationMode: "generative-ui",
  }),
  builtin("multi-option", "多方案 UI", "给出三个巡防方案。", {
    presentationMode: "generative-ui",
  }),
  builtin("map-action", "地图 Action", "在地图上标记巡防区域。", {
    presentationMode: "generative-ui",
  }),
  builtin(
    "task-confirmation",
    "任务确认",
    "使用一架无人机和两台无人车巡查 A 区域。",
    { presentationMode: "generative-ui" },
  ),
  builtin("user-cancel", "用户取消", "准备一个可取消的巡防任务。", {
    presentationMode: "generative-ui",
  }),
  builtin("invalid-component", "非法组件", "返回一个非法组件。", {
    presentationMode: "markdown",
    degraded: true,
  }),
  builtin("invalid-props", "非法 Props", "返回非法组件属性。", {
    presentationMode: "markdown",
    degraded: true,
  }),
  builtin("invalid-action", "非法 Action", "返回非法组件动作。", {
    presentationMode: "markdown",
    degraded: true,
  }),
  builtin(
    "compiler-fallback",
    "Compiler 失败安全降级",
    "返回一个需要安全降级的展示结果。",
    { presentationMode: "markdown", degraded: true },
  ),
  builtin("backend-tool-failure", "后端工具失败", "模拟后端工具失败。", {
    errorCode: "BUSINESS_AGENT_ERROR",
  }),
]);

function resultErrorCode(result: RuntimeRunResult): string | undefined {
  if (result.status === "failed") return result.error.code;
  return result.presentation?.status === "failed"
    ? result.presentation.errors[0]?.code
    : result.presentation?.status === "degraded"
      ? result.presentation.errors[0]?.code
      : undefined;
}

export function evaluateCase(
  expectation: SemanticExpectation,
  result: RuntimeRunResult,
): CaseEvaluation {
  const failures: string[] = [];
  const presentation = result.presentation;
  if (
    expectation.presentationMode !== undefined &&
    (presentation === undefined ||
      presentation.status === "failed" ||
      presentation.mode !== expectation.presentationMode)
  )
    failures.push(`展示模式应为 ${expectation.presentationMode}。`);
  if (
    expectation.degraded !== undefined &&
    (result.status === "degraded") !== expectation.degraded
  )
    failures.push(
      expectation.degraded ? "结果应安全降级。" : "结果不应安全降级。",
    );
  if (
    expectation.errorCode !== undefined &&
    resultErrorCode(result) !== expectation.errorCode
  )
    failures.push(`错误码应为 ${expectation.errorCode}。`);
  if (
    expectation.errorStage !== undefined &&
    !result.diagnostics?.stages.some(
      (stage) => stage.name === expectation.errorStage,
    )
  )
    failures.push(`应包含错误阶段 ${expectation.errorStage}。`);
  return { passed: failures.length === 0, failures: Object.freeze(failures) };
}

export function loadCustomCases(storage: Storage): readonly WorkbenchCase[] {
  const raw = storage.getItem(WORKBENCH_CASE_LIBRARY_KEY);
  if (raw === null) return [];
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (candidate): candidate is WorkbenchCase =>
          typeof candidate === "object" &&
          candidate !== null &&
          typeof (candidate as WorkbenchCase).id === "string" &&
          typeof (candidate as WorkbenchCase).title === "string" &&
          typeof (candidate as WorkbenchCase).input === "string" &&
          typeof (candidate as WorkbenchCase).expectation === "object",
      )
      .map((candidate) => ({ ...candidate, builtin: false }));
  } catch {
    return [];
  }
}

export function saveCustomCases(
  storage: Storage,
  cases: readonly WorkbenchCase[],
): void {
  storage.setItem(
    WORKBENCH_CASE_LIBRARY_KEY,
    JSON.stringify(cases.filter((item) => !item.builtin)),
  );
}

export function exportCustomCases(cases: readonly WorkbenchCase[]): string {
  return JSON.stringify(
    cases.filter((item) => !item.builtin),
    null,
    2,
  );
}

export function importCustomCases(input: string): readonly WorkbenchCase[] {
  try {
    const value = JSON.parse(input) as unknown;
    if (!Array.isArray(value)) throw new Error("invalid-case-library");
    return value.map((candidate): WorkbenchCase => {
      if (typeof candidate !== "object" || candidate === null)
        throw new Error("invalid-case-library");
      const record = candidate as Record<string, unknown>;
      if (
        typeof record.id !== "string" ||
        typeof record.title !== "string" ||
        typeof record.input !== "string" ||
        typeof record.expectation !== "object" ||
        record.expectation === null ||
        Array.isArray(record.expectation)
      )
        throw new Error("invalid-case-library");
      return {
        id: record.id,
        title: record.title,
        input: record.input,
        expectation: record.expectation as SemanticExpectation,
        builtin: false,
      };
    });
  } catch {
    throw new Error("WORKBENCH_CASE_IMPORT_INVALID");
  }
}

export function savePendingCase(storage: Storage, item: WorkbenchCase): void {
  storage.setItem(WORKBENCH_PENDING_CASE_KEY, JSON.stringify(item));
}

export function consumePendingCase(
  storage: Storage,
): WorkbenchCase | undefined {
  const raw = storage.getItem(WORKBENCH_PENDING_CASE_KEY);
  storage.removeItem(WORKBENCH_PENDING_CASE_KEY);
  if (raw === null) return undefined;
  try {
    const [item] = importCustomCases(`[${raw}]`);
    return item;
  } catch {
    return undefined;
  }
}
