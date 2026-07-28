import { jsonValueSchema } from "@generative-ui/shared-types";
import { type Static, type TSchema, Type } from "@sinclair/typebox";

export const catalogSchemaDialect =
  "http://json-schema.org/draft-07/schema#" as const;

const schemaTypeSchema = Type.Union([
  Type.Literal("null"),
  Type.Literal("boolean"),
  Type.Literal("object"),
  Type.Literal("array"),
  Type.Literal("number"),
  Type.Literal("string"),
  Type.Literal("integer"),
]);

function optionalSchemaKeywords(schemaNode: TSchema) {
  const jsonValueReferenceSchema = Type.Ref(jsonValueSchema);
  return {
    enum: Type.Optional(Type.Array(jsonValueReferenceSchema, { minItems: 1 })),
    const: Type.Optional(jsonValueReferenceSchema),
    properties: Type.Optional(Type.Record(Type.String(), schemaNode)),
    required: Type.Optional(
      Type.Array(Type.String({ minLength: 1 }), { uniqueItems: true }),
    ),
    additionalProperties: Type.Optional(
      Type.Union([Type.Boolean(), schemaNode]),
    ),
    items: Type.Optional(
      Type.Union([schemaNode, Type.Array(schemaNode, { minItems: 1 })]),
    ),
    allOf: Type.Optional(Type.Array(schemaNode, { minItems: 1 })),
    anyOf: Type.Optional(Type.Array(schemaNode, { minItems: 1 })),
    oneOf: Type.Optional(Type.Array(schemaNode, { minItems: 1 })),
    not: Type.Optional(schemaNode),
    minLength: Type.Optional(Type.Integer({ minimum: 0 })),
    maxLength: Type.Optional(Type.Integer({ minimum: 0 })),
    minimum: Type.Optional(Type.Number()),
    maximum: Type.Optional(Type.Number()),
    exclusiveMinimum: Type.Optional(Type.Number()),
    exclusiveMaximum: Type.Optional(Type.Number()),
    multipleOf: Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
    minItems: Type.Optional(Type.Integer({ minimum: 0 })),
    maxItems: Type.Optional(Type.Integer({ minimum: 0 })),
    uniqueItems: Type.Optional(Type.Boolean()),
    minProperties: Type.Optional(Type.Integer({ minimum: 0 })),
    maxProperties: Type.Optional(Type.Integer({ minimum: 0 })),
    title: Type.Optional(Type.String()),
    description: Type.Optional(Type.String()),
    default: Type.Optional(jsonValueReferenceSchema),
    examples: Type.Optional(Type.Array(jsonValueReferenceSchema)),
  };
}

export const embeddedSchemaNodeSchema = Type.Recursive(
  (schemaNode) =>
    Type.Union([
      Type.Boolean(),
      Type.Object(
        {
          $schema: Type.Optional(Type.Literal(catalogSchemaDialect)),
          type: Type.Optional(
            Type.Union([
              schemaTypeSchema,
              Type.Array(schemaTypeSchema, {
                minItems: 1,
                uniqueItems: true,
              }),
            ]),
          ),
          ...optionalSchemaKeywords(schemaNode),
        },
        {
          additionalProperties: false,
        },
      ),
    ]),
  {
    $id: "https://generative-ui.dev/schemas/component-catalog/embedded-schema-node/1.0",
  },
);

export const catalogObjectValueSchema = Type.Object(
  {
    $schema: Type.Literal(catalogSchemaDialect),
    type: Type.Literal("object"),
    ...optionalSchemaKeywords(Type.Ref(embeddedSchemaNodeSchema)),
  },
  {
    $id: "https://generative-ui.dev/schemas/component-catalog/embedded-object-schema/1.0",
    additionalProperties: false,
  },
);

export type CatalogObjectValueSchema = Static<typeof catalogObjectValueSchema>;

export const componentNestingSchema = Type.Union(
  [
    Type.Object(
      {
        canHaveChildren: Type.Literal(false),
        allowedParentTypes: Type.Optional(
          Type.Array(Type.String({ minLength: 1 }), { uniqueItems: true }),
        ),
      },
      {
        additionalProperties: false,
      },
    ),
    Type.Object(
      {
        canHaveChildren: Type.Literal(true),
        allowedChildTypes: Type.Optional(
          Type.Array(Type.String({ minLength: 1 }), { uniqueItems: true }),
        ),
        allowedParentTypes: Type.Optional(
          Type.Array(Type.String({ minLength: 1 }), { uniqueItems: true }),
        ),
        maxChildren: Type.Optional(Type.Integer({ minimum: 1 })),
      },
      {
        additionalProperties: false,
      },
    ),
  ],
  {
    $id: "https://generative-ui.dev/schemas/component-catalog/nesting/1.0",
  },
);

export type ComponentNesting = Static<typeof componentNestingSchema>;

export const componentDefinitionSchema = Type.Object(
  {
    componentType: Type.String({ minLength: 1 }),
    displayName: Type.String({ minLength: 1 }),
    description: Type.String({ minLength: 1 }),
    category: Type.Union([Type.Literal("common"), Type.Literal("domain")]),
    domainTags: Type.Array(Type.String({ minLength: 1 }), {
      uniqueItems: true,
    }),
    propsSchema: Type.Ref(catalogObjectValueSchema),
    allowedActions: Type.Array(Type.String({ minLength: 1 }), {
      uniqueItems: true,
    }),
    nesting: Type.Ref(componentNestingSchema),
  },
  {
    $id: "https://generative-ui.dev/schemas/component-catalog/component-definition/1.0",
    additionalProperties: false,
  },
);

export type ComponentDefinition = Static<typeof componentDefinitionSchema>;

export const actionDefinitionSchema = Type.Object(
  {
    actionType: Type.String({ minLength: 1 }),
    description: Type.String({ minLength: 1 }),
    payloadSchema: Type.Ref(catalogObjectValueSchema),
    destructive: Type.Boolean(),
    requiresApproval: Type.Boolean(),
  },
  {
    $id: "https://generative-ui.dev/schemas/component-catalog/action-definition/1.0",
    additionalProperties: false,
  },
);

export type ActionDefinition = Static<typeof actionDefinitionSchema>;

export const componentCatalogSchema = Type.Object(
  {
    schemaVersion: Type.Literal("1.0"),
    catalogId: Type.String({ minLength: 1 }),
    catalogVersion: Type.String({ minLength: 1 }),
    components: Type.Array(Type.Ref(componentDefinitionSchema), {
      minItems: 1,
    }),
    actions: Type.Array(Type.Ref(actionDefinitionSchema)),
  },
  {
    $id: "https://generative-ui.dev/schemas/component-catalog/1.0",
    additionalProperties: false,
  },
);

export type ComponentCatalog = Static<typeof componentCatalogSchema>;

export const catalogSchemaLimitsSchema = Type.Object(
  {
    maxCatalogBytes: Type.Integer({ minimum: 1 }),
    maxEmbeddedSchemaBytes: Type.Integer({ minimum: 1 }),
    maxEmbeddedSchemaDepth: Type.Integer({ minimum: 1 }),
    maxEmbeddedSchemaNodes: Type.Integer({ minimum: 1 }),
  },
  {
    $id: "https://generative-ui.dev/schemas/component-catalog/limits/1.0",
    additionalProperties: false,
  },
);

export type CatalogSchemaLimits = Static<typeof catalogSchemaLimitsSchema>;

export const defaultCatalogSchemaLimits = {
  maxCatalogBytes: 1_048_576,
  maxEmbeddedSchemaBytes: 65_536,
  maxEmbeddedSchemaDepth: 32,
  maxEmbeddedSchemaNodes: 4_096,
} as const satisfies CatalogSchemaLimits;
