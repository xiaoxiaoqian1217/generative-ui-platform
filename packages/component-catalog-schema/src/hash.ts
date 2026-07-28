import { createHash } from "node:crypto";
import type { JsonValue } from "@generative-ui/shared-types";
import {
  type ComponentCatalog,
  defaultCatalogSchemaLimits,
} from "./schemas.js";
import { validateComponentCatalog } from "./validation.js";

function assertValidUnicode(value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const nextCodeUnit = value.charCodeAt(index + 1);
      if (nextCodeUnit < 0xdc00 || nextCodeUnit > 0xdfff) {
        throw new TypeError("Catalog strings must contain valid Unicode.");
      }
      index += 1;
      continue;
    }
    if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      throw new TypeError("Catalog strings must contain valid Unicode.");
    }
  }
}

function canonicalize(value: JsonValue, ancestors: WeakSet<object>): string {
  if (value === null) {
    return "null";
  }
  if (typeof value === "boolean" || typeof value === "number") {
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new TypeError("Catalog numbers must be finite.");
    }
    return JSON.stringify(value);
  }
  if (typeof value === "string") {
    assertValidUnicode(value);
    return JSON.stringify(value);
  }

  if (ancestors.has(value)) {
    throw new TypeError("Catalog values must not contain cycles.");
  }
  ancestors.add(value);

  let result: string;
  if (Array.isArray(value)) {
    result = `[${value
      .map((entry) => canonicalize(entry, ancestors))
      .join(",")}]`;
  } else {
    const members = Object.keys(value)
      .sort()
      .map((key) => {
        assertValidUnicode(key);
        return `${JSON.stringify(key)}:${canonicalize(value[key] as JsonValue, ancestors)}`;
      });
    result = `{${members.join(",")}}`;
  }

  ancestors.delete(value);
  return result;
}

export function computeCatalogContentHash(
  catalog: ComponentCatalog,
): `sha256:${string}` {
  const validation = validateComponentCatalog(
    catalog,
    defaultCatalogSchemaLimits,
  );
  if (!validation.success) {
    throw new TypeError("Component Catalog must be valid before hashing.");
  }

  const canonicalCatalog = canonicalize(
    validation.value as JsonValue,
    new WeakSet(),
  );
  const digest = createHash("sha256")
    .update(canonicalCatalog, "utf8")
    .digest("hex");
  return `sha256:${digest}`;
}
