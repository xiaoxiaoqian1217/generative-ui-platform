import type {
  CompileError,
  UICompileRequest,
} from "@generative-ui/compiler-contract";
import { validateUICompileRequest } from "@generative-ui/compiler-contract";
import { validateUIPlan } from "@generative-ui/presentation-contract";
import { fail } from "./failure.js";
import type { CoreCompileLimits } from "./types.js";

type ValueLimitCheckResult =
  | {
      success: true;
    }
  | {
      success: false;
      reason: "depth" | "items" | "invalid";
    };

type TraversalFrame =
  | {
      depth: number;
      kind: "value";
      value: unknown;
    }
  | {
      depth: number;
      iterator: Iterator<unknown>;
      kind: "children";
    }
  | {
      kind: "exit";
      value: object;
    };

function* jsonChildValues(value: object): Generator<unknown> {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (Object.hasOwn(value, index)) {
        yield value[index];
      } else {
        if (index in value) {
          throw new TypeError(
            "JSON arrays must not expose inherited indexed values.",
          );
        }
        yield null;
      }
    }
    return;
  }
  for (const key in value) {
    if (!Object.hasOwn(value, key)) {
      throw new TypeError(
        "JSON objects must not expose inherited enumerable properties.",
      );
    }
    yield (value as Record<string, unknown>)[key];
  }
}

function checkValueLimits(
  value: unknown,
  limits: CoreCompileLimits,
): ValueLimitCheckResult {
  let items = 0;
  const stack: TraversalFrame[] = [{ depth: 1, kind: "value", value }];
  const ancestors = new WeakSet<object>();

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      break;
    }

    if (current.kind === "exit") {
      ancestors.delete(current.value);
      continue;
    }

    if (current.kind === "children") {
      let next: IteratorResult<unknown>;
      try {
        next = current.iterator.next();
      } catch {
        return { success: false, reason: "invalid" };
      }
      if (!next.done) {
        stack.push(current);
        stack.push({
          depth: current.depth + 1,
          kind: "value",
          value: next.value,
        });
      }
      continue;
    }

    if (current.depth > limits.maxDataDepth) {
      return { success: false, reason: "depth" };
    }

    items += 1;
    if (items > limits.maxDataItems) {
      return { success: false, reason: "items" };
    }

    if (current.value === null) {
      continue;
    }

    const valueType = typeof current.value;
    if (
      valueType === "string" ||
      valueType === "boolean" ||
      (valueType === "number" && Number.isFinite(current.value))
    ) {
      continue;
    }
    if (valueType !== "object") {
      return { success: false, reason: "invalid" };
    }

    const objectValue = current.value as object;
    let prototype: object | null;
    try {
      prototype = Object.getPrototypeOf(objectValue);
    } catch {
      return { success: false, reason: "invalid" };
    }
    if (Array.isArray(objectValue)) {
      if (prototype !== Array.prototype) {
        return { success: false, reason: "invalid" };
      }
    } else {
      if (prototype !== null && prototype !== Object.prototype) {
        return { success: false, reason: "invalid" };
      }
    }
    if (ancestors.has(objectValue)) {
      return { success: false, reason: "invalid" };
    }
    ancestors.add(objectValue);
    stack.push({ kind: "exit", value: objectValue });
    stack.push({
      depth: current.depth,
      iterator: jsonChildValues(objectValue),
      kind: "children",
    });
  }

  return { success: true };
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

function uiPlanError(
  message: string,
  constraint: string,
): never {
  return fail({
    code: "UI_PLAN_INVALID",
    message,
    stage: "ui-plan-validation",
    retryable: false,
    path: "/plan",
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

function propertyPath(key: string): string {
  return `/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`;
}

function prioritizeCompileFields(keys: PropertyKey[]): PropertyKey[] {
  const priority = new Map<PropertyKey, number>([
    ["plan", 0],
    ["sourceData", 1],
  ]);
  return keys
    .map((key, index) => ({ index, key }))
    .sort((left, right) => {
      const leftPriority = priority.get(left.key) ?? 2;
      const rightPriority = priority.get(right.key) ?? 2;
      return leftPriority - rightPriority || left.index - right.index;
    })
    .map(({ key }) => key);
}

function snapshotCompileInput(input: unknown): unknown {
  if (typeof input !== "object" || input === null) {
    return input;
  }

  let isArray: boolean;
  try {
    isArray = Array.isArray(input);
  } catch {
    inputError(
      "UI_COMPILE_REQUEST_INVALID",
      "UI Compile Request could not be inspected.",
      "",
      "readable-object",
    );
  }
  if (isArray) {
    return input;
  }

  let keys: PropertyKey[];
  try {
    keys = prioritizeCompileFields(Reflect.ownKeys(input));
  } catch {
    inputError(
      "UI_COMPILE_REQUEST_INVALID",
      "UI Compile Request properties could not be inspected.",
      "",
      "readable-properties",
    );
  }

  const snapshot: Record<string, unknown> = {};
  for (const key of keys) {
    if (typeof key !== "string") {
      inputError(
        "UI_COMPILE_REQUEST_INVALID",
        "UI Compile Request property names must be strings.",
        "",
        "string-property-key",
      );
    }

    let value: unknown;
    try {
      value = Reflect.get(input, key);
    } catch {
      if (key === "plan") {
        uiPlanError("UI Plan Candidate could not be read.", "readable-property");
      }
      inputError(
        "UI_COMPILE_REQUEST_INVALID",
        "UI Compile Request property could not be read.",
        propertyPath(key),
        "readable-property",
      );
    }

    Object.defineProperty(snapshot, key, {
      configurable: true,
      enumerable: true,
      value,
      writable: true,
    });
  }

  return snapshot;
}

function enforceValueLimits(
  value: unknown,
  path: "/plan" | "/sourceData",
  limits: CoreCompileLimits,
): void {
  const result = checkValueLimits(value, limits);
  if (result.success) {
    return;
  }
  if (result.reason === "depth") {
    inputError(
      "DATA_DEPTH_EXCEEDED",
      "Compile input exceeds its configured depth limit.",
      path,
      "data-depth-limit",
    );
  }
  if (result.reason === "items") {
    inputError(
      "DATA_ITEMS_EXCEEDED",
      "Compile input exceeds its configured item limit.",
      path,
      "data-item-limit",
    );
  }
  if (path === "/plan") {
    uiPlanError(
      "UI Plan Candidate must be finite acyclic JSON.",
      "finite-acyclic-json",
    );
  }
  inputError(
    "UI_COMPILE_REQUEST_INVALID",
    "Compile input must be finite acyclic JSON.",
    path,
    "finite-acyclic-json",
  );
}

export function validateCompileInput(
  input: unknown,
  limits: CoreCompileLimits,
): UICompileRequest {
  validateLimits(limits);
  const snapshot = snapshotCompileInput(input);

  if (
    typeof snapshot === "object" &&
    snapshot !== null &&
    !Array.isArray(snapshot) &&
    Object.hasOwn(snapshot, "plan")
  ) {
    const plan = (snapshot as { plan: unknown }).plan;
    enforceValueLimits(plan, "/plan", limits);
    let planResult: ReturnType<typeof validateUIPlan>;
    try {
      planResult = validateUIPlan(plan);
    } catch {
      uiPlanError(
        "UI Plan Candidate does not match its contract.",
        "finite-acyclic-json",
      );
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

  if (
    typeof snapshot === "object" &&
    snapshot !== null &&
    !Array.isArray(snapshot) &&
    Object.hasOwn(snapshot, "sourceData")
  ) {
    enforceValueLimits(
      (snapshot as { sourceData: unknown }).sourceData,
      "/sourceData",
      limits,
    );
  }

  let requestResult: ReturnType<typeof validateUICompileRequest>;
  try {
    requestResult = validateUICompileRequest(snapshot);
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

  return requestResult.value;
}
