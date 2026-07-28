import type {
  CompileError,
  UICompileRequest,
} from "@generative-ui/compiler-contract";
import { validateUICompileRequest } from "@generative-ui/compiler-contract";
import { validateUIPlan } from "@generative-ui/presentation-contract";
import { fail } from "./failure.js";
import type { CoreCompileLimits } from "./types.js";

interface Measurement {
  depth: number;
  items: number;
}

function measureValue(value: unknown): Measurement | null {
  let depth = 0;
  let items = 0;
  const ancestors = new WeakSet<object>();

  function visit(current: unknown, currentDepth: number): boolean {
    items += 1;
    depth = Math.max(depth, currentDepth);
    if (typeof current !== "object" || current === null) {
      return typeof current !== "number" || Number.isFinite(current);
    }
    if (ancestors.has(current)) {
      return false;
    }

    ancestors.add(current);
    const children = Array.isArray(current) ? current : Object.values(current);
    for (const child of children) {
      if (!visit(child, currentDepth + 1)) {
        return false;
      }
    }
    ancestors.delete(current);
    return true;
  }

  return visit(value, 1) ? { depth, items } : null;
}

function inputError(
  code: CompileError["code"],
  message: string,
  path: string,
  constraint: string,
): never {
  return fail({
    code,
    message,
    stage: "input-validation",
    retryable: false,
    path,
    constraint,
  });
}

function validateLimits(limits: CoreCompileLimits): void {
  if (
    !Number.isInteger(limits.maxDataDepth) ||
    limits.maxDataDepth < 1 ||
    !Number.isInteger(limits.maxDataItems) ||
    limits.maxDataItems < 1
  ) {
    inputError(
      "UI_COMPILE_REQUEST_INVALID",
      "Core compile limits are invalid.",
      "/options/limits",
      "positive-integer-limits",
    );
  }
}

export function validateCompileInput(
  input: unknown,
  limits: CoreCompileLimits,
): UICompileRequest {
  validateLimits(limits);

  if (
    typeof input === "object" &&
    input !== null &&
    !Array.isArray(input) &&
    "plan" in input
  ) {
    let planResult: ReturnType<typeof validateUIPlan>;
    try {
      planResult = validateUIPlan((input as { plan: unknown }).plan);
    } catch {
      fail({
        code: "UI_PLAN_INVALID",
        message: "UI Plan Candidate does not match its contract.",
        stage: "ui-plan-validation",
        retryable: false,
        path: "/plan",
        constraint: "finite-acyclic-json",
      });
    }
    if (!planResult.success) {
      fail({
        code: "UI_PLAN_INVALID",
        message: planResult.error.message,
        stage: "ui-plan-validation",
        retryable: false,
        path: `/plan${planResult.error.path}`,
        constraint: planResult.error.constraint,
      });
    }
  }

  let requestResult: ReturnType<typeof validateUICompileRequest>;
  try {
    requestResult = validateUICompileRequest(input);
  } catch {
    inputError(
      "UI_COMPILE_REQUEST_INVALID",
      "UI Compile Request does not match its contract.",
      "",
      "finite-acyclic-json",
    );
  }
  if (!requestResult.success) {
    inputError(
      "UI_COMPILE_REQUEST_INVALID",
      requestResult.error.message,
      requestResult.error.path,
      requestResult.error.constraint,
    );
  }

  for (const [path, value] of [
    ["/sourceData", requestResult.value.sourceData],
    ["/plan", requestResult.value.plan],
  ] as const) {
    const measurement = measureValue(value);
    if (!measurement) {
      inputError(
        "UI_COMPILE_REQUEST_INVALID",
        "Compile input must be finite acyclic JSON.",
        path,
        "finite-acyclic-json",
      );
    }
    if (measurement.depth > limits.maxDataDepth) {
      inputError(
        "DATA_DEPTH_EXCEEDED",
        "Compile input exceeds its configured depth limit.",
        path,
        "data-depth-limit",
      );
    }
    if (measurement.items > limits.maxDataItems) {
      inputError(
        "DATA_ITEMS_EXCEEDED",
        "Compile input exceeds its configured item limit.",
        path,
        "data-item-limit",
      );
    }
  }

  return requestResult.value;
}
