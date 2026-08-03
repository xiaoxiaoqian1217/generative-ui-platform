import type { JsonValue } from "@generative-ui/shared-types";

export interface StructuredDataLimits {
  maxDataDepth: number;
  maxDataItems: number;
  maxSerializedBytes: number;
}

export const DEFAULT_STRUCTURED_DATA_LIMITS: Readonly<StructuredDataLimits> =
  Object.freeze({
    maxDataDepth: 32,
    maxDataItems: 10_000,
    maxSerializedBytes: 65_536,
  });

const MAX_CONFIGURED_DATA_DEPTH = 128;
const MAX_CONFIGURED_DATA_ITEMS = 1_000_000;
const MAX_CONFIGURED_SERIALIZED_BYTES = 67_108_864;

export type StructuredDataValidationFailureReason =
  | "non-json-value"
  | "non-finite-number"
  | "non-plain-object"
  | "sparse-array"
  | "symbol-key"
  | "unsafe-property"
  | "circular-reference"
  | "serialization-failed";

export type StructuredDataValidationErrorCode =
  | "STRUCTURED_DATA_INVALID"
  | "DATA_DEPTH_EXCEEDED"
  | "DATA_ITEMS_EXCEEDED"
  | "DATA_SERIALIZED_BYTES_EXCEEDED";

const validatedStructuredDataBrand = Symbol("ValidatedStructuredData");

export interface ValidatedStructuredData {
  readonly [validatedStructuredDataBrand]: true;
  readonly data: JsonValue;
  readonly canonicalJson: string;
  readonly itemCount: number;
  readonly dataDepth: number;
  readonly serializedBytes: number;
}

export type StructuredDataValidationResult =
  | {
      success: true;
      value: ValidatedStructuredData;
    }
  | {
      success: false;
      error: {
        code: StructuredDataValidationErrorCode;
        reason?: StructuredDataValidationFailureReason;
        retryable: false;
      };
    };

export interface StructuredDataValidator {
  validate(
    input: unknown,
    limits: StructuredDataLimits,
  ): StructuredDataValidationResult;
}

export function areStructuredDataLimitsValid(
  limits: StructuredDataLimits,
): boolean {
  return (
    Number.isSafeInteger(limits.maxDataDepth) &&
    limits.maxDataDepth > 0 &&
    limits.maxDataDepth <= MAX_CONFIGURED_DATA_DEPTH &&
    Number.isSafeInteger(limits.maxDataItems) &&
    limits.maxDataItems > 0 &&
    limits.maxDataItems <= MAX_CONFIGURED_DATA_ITEMS &&
    Number.isSafeInteger(limits.maxSerializedBytes) &&
    limits.maxSerializedBytes > 0 &&
    limits.maxSerializedBytes <= MAX_CONFIGURED_SERIALIZED_BYTES
  );
}

function invalid(
  reason: StructuredDataValidationFailureReason,
): StructuredDataValidationResult {
  return {
    success: false,
    error: {
      code: "STRUCTURED_DATA_INVALID",
      reason,
      retryable: false,
    },
  };
}

function limitExceeded(
  code: Exclude<StructuredDataValidationErrorCode, "STRUCTURED_DATA_INVALID">,
): StructuredDataValidationResult {
  return {
    success: false,
    error: {
      code,
      retryable: false,
    },
  };
}

type CloneResult =
  | {
      success: true;
      value: JsonValue;
    }
  | {
      success: false;
      result: StructuredDataValidationResult;
    };

interface CloneState {
  itemCount: number;
  dataDepth: number;
}

function compareUnicodeCodePoints(left: string, right: string): number {
  const leftPoints = Array.from(left, (character) => character.codePointAt(0));
  const rightPoints = Array.from(right, (character) =>
    character.codePointAt(0),
  );
  const length = Math.min(leftPoints.length, rightPoints.length);

  for (let index = 0; index < length; index += 1) {
    const difference = (leftPoints[index] ?? 0) - (rightPoints[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }

  return leftPoints.length - rightPoints.length;
}

function cloneJsonValue(
  input: unknown,
  containerDepth: number,
  limits: StructuredDataLimits,
  state: CloneState,
  ancestors: Set<object>,
): CloneResult {
  state.itemCount += 1;
  if (state.itemCount > limits.maxDataItems) {
    return {
      success: false,
      result: limitExceeded("DATA_ITEMS_EXCEEDED"),
    };
  }

  if (
    input === null ||
    typeof input === "string" ||
    typeof input === "boolean"
  ) {
    return { success: true, value: input };
  }

  if (typeof input === "number") {
    if (!Number.isFinite(input)) {
      return {
        success: false,
        result: invalid("non-finite-number"),
      };
    }
    return { success: true, value: input };
  }

  if (typeof input !== "object") {
    return {
      success: false,
      result: invalid("non-json-value"),
    };
  }

  const nextDepth = containerDepth + 1;
  if (nextDepth > limits.maxDataDepth) {
    return {
      success: false,
      result: limitExceeded("DATA_DEPTH_EXCEEDED"),
    };
  }
  state.dataDepth = Math.max(state.dataDepth, nextDepth);

  if (ancestors.has(input)) {
    return {
      success: false,
      result: invalid("circular-reference"),
    };
  }

  ancestors.add(input);
  try {
    if (Array.isArray(input)) {
      if (Object.getPrototypeOf(input) !== Array.prototype) {
        return {
          success: false,
          result: invalid("non-plain-object"),
        };
      }

      if (input.length > limits.maxDataItems - state.itemCount) {
        return {
          success: false,
          result: limitExceeded("DATA_ITEMS_EXCEEDED"),
        };
      }

      const ownKeys = Reflect.ownKeys(input);
      if (ownKeys.some((key) => typeof key === "symbol")) {
        return {
          success: false,
          result: invalid("symbol-key"),
        };
      }

      if (ownKeys.length !== input.length + 1) {
        return {
          success: false,
          result:
            ownKeys.length < input.length + 1
              ? invalid("sparse-array")
              : invalid("unsafe-property"),
        };
      }

      const clone: JsonValue[] = [];
      for (let index = 0; index < input.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(
          input,
          String(index),
        );
        if (
          descriptor === undefined ||
          !descriptor.enumerable ||
          !("value" in descriptor)
        ) {
          return {
            success: false,
            result:
              descriptor === undefined
                ? invalid("sparse-array")
                : invalid("unsafe-property"),
          };
        }

        const child = cloneJsonValue(
          descriptor.value,
          nextDepth,
          limits,
          state,
          ancestors,
        );
        if (!child.success) {
          return child;
        }
        clone.push(child.value);
      }
      Object.freeze(clone);
      return { success: true, value: clone };
    }

    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) {
      return {
        success: false,
        result: invalid("non-plain-object"),
      };
    }

    const ownKeys = Reflect.ownKeys(input);
    if (ownKeys.some((key) => typeof key === "symbol")) {
      return {
        success: false,
        result: invalid("symbol-key"),
      };
    }

    const clone: Record<string, JsonValue> = Object.create(null) as Record<
      string,
      JsonValue
    >;
    const keys = (ownKeys as string[]).sort(compareUnicodeCodePoints);
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (
        descriptor === undefined ||
        !descriptor.enumerable ||
        !("value" in descriptor)
      ) {
        return {
          success: false,
          result: invalid("unsafe-property"),
        };
      }

      const child = cloneJsonValue(
        descriptor.value,
        nextDepth,
        limits,
        state,
        ancestors,
      );
      if (!child.success) {
        return child;
      }
      clone[key] = child.value;
    }

    Object.freeze(clone);
    return { success: true, value: clone };
  } catch {
    return {
      success: false,
      result: invalid("unsafe-property"),
    };
  } finally {
    ancestors.delete(input);
  }
}

export function createStructuredDataValidator(): StructuredDataValidator {
  return {
    validate(input, limits) {
      const state: CloneState = {
        itemCount: 0,
        dataDepth: 0,
      };
      const cloned = cloneJsonValue(input, 0, limits, state, new Set<object>());
      if (!cloned.success) {
        return cloned.result;
      }

      let canonicalJson: string;
      try {
        canonicalJson = JSON.stringify(cloned.value, null, 2);
      } catch {
        return invalid("serialization-failed");
      }

      const serializedBytes = new TextEncoder().encode(canonicalJson).length;
      if (serializedBytes > limits.maxSerializedBytes) {
        return limitExceeded("DATA_SERIALIZED_BYTES_EXCEEDED");
      }

      const value: ValidatedStructuredData = {
        [validatedStructuredDataBrand]: true,
        data: cloned.value,
        canonicalJson,
        itemCount: state.itemCount,
        dataDepth: state.dataDepth,
        serializedBytes,
      };

      return {
        success: true,
        value: Object.freeze(value),
      };
    },
  };
}
