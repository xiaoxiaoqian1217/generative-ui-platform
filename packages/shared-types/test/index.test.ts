import { Ajv } from "ajv";
import { describe, expect, expectTypeOf, it } from "vitest";
import {
  type JsonValue,
  jsonValueSchema,
  type ValidationResult,
  validationErrorSchema,
} from "../src/index.js";

describe("shared JSON types", () => {
  it("accepts the complete JSON value domain", () => {
    const validate = new Ajv({
      strict: true,
      validateSchema: true,
    }).compile(jsonValueSchema);
    const value = {
      string: "value",
      number: 14,
      boolean: true,
      nullable: null,
      array: [1, "two", false],
      object: {
        nested: "value",
      },
    } satisfies JsonValue;

    expect(validate(value)).toBe(true);
  });

  it("rejects values outside the JSON domain", () => {
    const validate = new Ajv({
      strict: true,
      validateSchema: true,
    }).compile(jsonValueSchema);

    expect(validate({ invalid: undefined })).toBe(false);
    expect(validate({ invalid: () => undefined })).toBe(false);
    expect(validate(Number.NaN)).toBe(false);
    expect(validate(Number.POSITIVE_INFINITY)).toBe(false);
  });

  it("owns the reusable validation result shape", () => {
    const result: ValidationResult<JsonValue, "EXAMPLE_INVALID"> = {
      success: false,
      error: {
        code: "EXAMPLE_INVALID",
        path: "/example",
        constraint: "type",
        message: "Example does not match its contract.",
      },
    };

    expectTypeOf(result.error.code).toEqualTypeOf<"EXAMPLE_INVALID">();
  });

  it.each([jsonValueSchema, validationErrorSchema])(
    "serializes to valid Draft 7 JSON Schema",
    (schema) => {
      const ajv = new Ajv({
        strict: true,
        validateSchema: true,
      });

      expect(ajv.validateSchema(JSON.parse(JSON.stringify(schema)))).toBe(true);
    },
  );
});
