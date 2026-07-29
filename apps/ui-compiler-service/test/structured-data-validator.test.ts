import { describe, expect, it, vi } from "vitest";
import {
  areStructuredDataLimitsValid,
  createStructuredDataSerializer,
  createStructuredDataValidator,
  DEFAULT_STRUCTURED_DATA_LIMITS,
} from "../src/main.js";

describe("StructuredDataValidator", () => {
  const validator = createStructuredDataValidator();

  it("creates a stable, immutable snapshot with sorted object keys", () => {
    const source = {
      zeta: [1, 2],
      alpha: {
        zeta: true,
        alpha: null,
      },
    };

    const result = validator.validate(source, DEFAULT_STRUCTURED_DATA_LIMITS);

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }
    expect(result.value.canonicalJson).toBe(`{
  "alpha": {
    "alpha": null,
    "zeta": true
  },
  "zeta": [
    1,
    2
  ]
}`);
    expect(result.value.itemCount).toBe(7);
    expect(result.value.dataDepth).toBe(2);
    expect(Object.isFrozen(result.value.data)).toBe(true);
    expect(result.value.data).not.toBe(source);
  });

  it("accepts shared references without treating them as a cycle", () => {
    const shared = { value: "preserved twice" };

    const result = validator.validate(
      { first: shared, second: shared },
      DEFAULT_STRUCTURED_DATA_LIMITS,
    );

    expect(result).toMatchObject({ success: true });
    if (result.success) {
      expect(
        result.value.canonicalJson.match(/preserved twice/gu),
      ).toHaveLength(2);
    }
  });

  it("rejects accessors without executing them", () => {
    const getter = vi.fn(() => "secret");
    const source = {};
    Object.defineProperty(source, "value", {
      enumerable: true,
      get: getter,
    });

    const result = validator.validate(source, DEFAULT_STRUCTURED_DATA_LIMITS);

    expect(result).toMatchObject({
      success: false,
      error: {
        code: "STRUCTURED_DATA_INVALID",
        reason: "unsafe-property",
      },
    });
    expect(getter).not.toHaveBeenCalled();
  });

  it("rejects symbol keys that JSON serialization would silently omit", () => {
    const source = {
      visible: true,
      [Symbol("hidden")]: "must not be dropped",
    };

    const result = validator.validate(source, DEFAULT_STRUCTURED_DATA_LIMITS);

    expect(result).toMatchObject({
      success: false,
      error: {
        code: "STRUCTURED_DATA_INVALID",
        reason: "symbol-key",
      },
    });
  });

  it("rejects an oversized sparse array before allocating by its length", () => {
    const source: unknown[] = [];
    source.length = 4_294_967_295;

    const result = validator.validate(source, DEFAULT_STRUCTURED_DATA_LIMITS);

    expect(result).toMatchObject({
      success: false,
      error: {
        code: "DATA_ITEMS_EXCEEDED",
      },
    });
  });

  it("rejects an oversized dense array before enumerating its keys", () => {
    const ownKeys = vi.fn((target: number[]) => Reflect.ownKeys(target));
    const source = new Proxy([1, 2, 3], {
      ownKeys,
    });

    const result = validator.validate(source, {
      ...DEFAULT_STRUCTURED_DATA_LIMITS,
      maxDataItems: 3,
    });

    expect(result).toMatchObject({
      success: false,
      error: {
        code: "DATA_ITEMS_EXCEEDED",
      },
    });
    expect(ownKeys).not.toHaveBeenCalled();
  });

  it.each([
    { maxDataDepth: 0 },
    { maxDataDepth: 129 },
    { maxDataItems: 1.5 },
    { maxSerializedBytes: Number.POSITIVE_INFINITY },
  ])("rejects invalid resource configuration", (limit) => {
    expect(
      areStructuredDataLimitsValid({
        ...DEFAULT_STRUCTURED_DATA_LIMITS,
        ...limit,
      }),
    ).toBe(false);
  });
});

describe("StructuredDataSerializer", () => {
  it("uses a fence longer than backtick runs in the JSON payload", () => {
    const validated = createStructuredDataValidator().validate(
      { value: "``` remains inert" },
      DEFAULT_STRUCTURED_DATA_LIMITS,
    );
    expect(validated.success).toBe(true);
    if (!validated.success) {
      return;
    }

    const markdown = createStructuredDataSerializer().serialize(
      validated.value,
    );

    expect(markdown).toMatch(/^````json\n/u);
    expect(markdown).toContain('"``` remains inert"');
    expect(markdown).toMatch(/\n````\n$/u);
  });
});
