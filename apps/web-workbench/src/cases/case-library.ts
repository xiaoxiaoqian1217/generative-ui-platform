export interface CaseObservation {
  readonly diagnostics?: {
    readonly degradationReasonCode?: string;
    readonly stages?: readonly { readonly name: string }[];
  };
  readonly error?: { readonly code: string };
  readonly output?:
    | {
        readonly errors?: readonly { readonly code: string }[];
        readonly mode: "markdown";
        readonly status: "completed" | "degraded";
      }
    | {
        readonly errors?: readonly { readonly code: string }[];
        readonly mode: "generative-ui";
        readonly operations: readonly unknown[];
        readonly status: "completed" | "degraded";
      };
  readonly status: "completed" | "degraded" | "failed";
}

export interface SemanticExpectation {
  readonly presentationMode?: "markdown" | "generative-ui";
  readonly componentTypes?: readonly string[];
  readonly actionTypes?: readonly string[];
  readonly errorStage?: string;
  readonly errorCode?: string;
  readonly degraded?: boolean;
  readonly degradationReasonCode?: string;
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

export interface CaseFailureDiagnosis {
  readonly caseId: string;
  readonly failures: readonly string[];
  readonly evaluatedAt: string;
}

export const WORKBENCH_CASE_LIBRARY_KEY = "generative-ui.workbench.cases.v1";
export const WORKBENCH_PENDING_CASE_KEY =
  "generative-ui.workbench.pending-case.v1";
export const WORKBENCH_CASE_FAILURE_KEY =
  "generative-ui.workbench.case-failure.v1";

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

function outputCapabilities(result: CaseObservation) {
  const componentTypes = new Set<string>();
  const actionTypes = new Set<string>();
  const output = result.output;
  if (output === undefined || output.mode !== "generative-ui")
    return { componentTypes, actionTypes };
  for (const operation of output.operations) {
    if (typeof operation !== "object" || operation === null) continue;
    const update = (operation as Record<string, unknown>).updateComponents;
    if (typeof update !== "object" || update === null) continue;
    const components = (update as Record<string, unknown>).components;
    if (!Array.isArray(components)) continue;
    for (const component of components) {
      if (typeof component !== "object" || component === null) continue;
      const value = component as Record<string, unknown>;
      if (typeof value.component === "string")
        componentTypes.add(value.component);
      const action = value.action as Record<string, unknown> | undefined;
      const event = action?.event as Record<string, unknown> | undefined;
      if (typeof event?.name === "string") actionTypes.add(event.name);
    }
  }
  return { componentTypes, actionTypes };
}

function resultErrorCode(result: CaseObservation): string | undefined {
  if (result.status === "failed") return result.error?.code;
  return result.output?.status === "degraded"
    ? result.output.errors?.[0]?.code
    : undefined;
}

export function evaluateCase(
  expectation: SemanticExpectation,
  result: CaseObservation,
): CaseEvaluation {
  const failures: string[] = [];
  const output = result.output;
  const capabilities = outputCapabilities(result);
  if (
    expectation.presentationMode !== undefined &&
    (output === undefined || output.mode !== expectation.presentationMode)
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
    !result.diagnostics?.stages?.some(
      (stage) => stage.name === expectation.errorStage,
    )
  )
    failures.push(`应包含错误阶段 ${expectation.errorStage}。`);
  for (const componentType of expectation.componentTypes ?? [])
    if (!capabilities.componentTypes.has(componentType))
      failures.push(`Expected component ${componentType}.`);
  for (const actionType of expectation.actionTypes ?? [])
    if (!capabilities.actionTypes.has(actionType))
      failures.push(`Expected action ${actionType}.`);
  if (
    expectation.degradationReasonCode !== undefined &&
    result.diagnostics?.degradationReasonCode !==
      expectation.degradationReasonCode
  )
    failures.push(
      `Expected degradation reason ${expectation.degradationReasonCode}.`,
    );
  return { passed: failures.length === 0, failures: Object.freeze(failures) };
}

export function saveCaseFailureDiagnosis(
  storage: Storage,
  caseId: string,
  evaluation: CaseEvaluation,
): void {
  if (evaluation.passed) return;
  storage.setItem(
    WORKBENCH_CASE_FAILURE_KEY,
    JSON.stringify({
      caseId,
      failures: evaluation.failures,
      evaluatedAt: new Date().toISOString(),
    } satisfies CaseFailureDiagnosis),
  );
}

export function loadCaseFailureDiagnosis(
  storage: Storage,
): CaseFailureDiagnosis | undefined {
  const raw = storage.getItem(WORKBENCH_CASE_FAILURE_KEY);
  if (raw === null) return undefined;
  try {
    const value = JSON.parse(raw) as Partial<CaseFailureDiagnosis>;
    if (
      typeof value.caseId !== "string" ||
      typeof value.evaluatedAt !== "string" ||
      !Array.isArray(value.failures) ||
      !value.failures.every((failure) => typeof failure === "string")
    )
      return undefined;
    return {
      caseId: value.caseId,
      evaluatedAt: value.evaluatedAt,
      failures: value.failures,
    };
  } catch {
    return undefined;
  }
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
