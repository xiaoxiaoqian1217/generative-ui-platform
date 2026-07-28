import type { JsonValue } from "@generative-ui/shared-types";

export interface ResolvedJsonPointer {
  found: boolean;
  value?: JsonValue;
}

export function resolveJsonPointer(
  sourceData: JsonValue,
  pointer: string,
): ResolvedJsonPointer {
  let current: JsonValue = sourceData;

  for (const encodedSegment of pointer.slice(1).split("/")) {
    const segment = encodedSegment.replaceAll("~1", "/").replaceAll("~0", "~");
    if (Array.isArray(current)) {
      if (!/^(?:0|[1-9][0-9]*)$/.test(segment)) {
        return { found: false };
      }
      const index = Number(segment);
      if (!Object.hasOwn(current, index)) {
        return { found: false };
      }
      current = current[index] as JsonValue;
      continue;
    }

    if (
      current === null ||
      typeof current !== "object" ||
      !Object.hasOwn(current, segment)
    ) {
      return { found: false };
    }
    current = current[segment] as JsonValue;
  }

  return { found: true, value: current };
}
