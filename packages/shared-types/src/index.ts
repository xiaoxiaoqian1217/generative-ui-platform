import { type Static, Type } from "@sinclair/typebox";

export const jsonValueSchema = Type.Recursive(
  (jsonValue) =>
    Type.Union([
      Type.String(),
      Type.Number(),
      Type.Boolean(),
      Type.Null(),
      Type.Array(jsonValue),
      Type.Record(Type.String(), jsonValue),
    ]),
  {
    $id: "https://generative-ui.dev/schemas/shared/json-value/1.0",
  },
);

export type JsonValue = Static<typeof jsonValueSchema>;

export const validationErrorSchema = Type.Object(
  {
    code: Type.String({ minLength: 1 }),
    path: Type.String(),
    constraint: Type.String({ minLength: 1 }),
    message: Type.String({ minLength: 1 }),
  },
  {
    $id: "https://generative-ui.dev/schemas/shared/validation-error/1.0",
    additionalProperties: false,
  },
);

export type ValidationError = Static<typeof validationErrorSchema>;

export type ValidationResult<T, TCode extends string = string> =
  | {
      success: true;
      value: T;
    }
  | {
      success: false;
      error: ValidationError & {
        code: TCode;
      };
    };
