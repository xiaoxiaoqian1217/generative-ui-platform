import { Ajv } from "ajv";
import { describe, expect, expectTypeOf, it } from "vitest";
import {
  type ComponentCatalog,
  componentCatalogSchema,
  defaultCatalogSchemaLimits,
  validateActionPayload,
  validateComponentCatalog,
  validateComponentProps,
} from "../src/index.js";

const objectSchemaDialect = "http://json-schema.org/draft-07/schema#" as const;

const catalog = {
  schemaVersion: "1.0",
  catalogId: "default",
  catalogVersion: "1.0.0",
  components: [
    {
      componentType: "Card",
      displayName: "Card",
      description: "Groups related content.",
      category: "common",
      domainTags: [],
      propsSchema: {
        $schema: objectSchemaDialect,
        type: "object",
        properties: {
          title: {
            type: "string",
            minLength: 1,
          },
        },
        required: ["title"],
        additionalProperties: false,
      },
      allowedActions: [],
      nesting: {
        canHaveChildren: true,
        allowedChildTypes: ["AccountSummary"],
        maxChildren: 4,
      },
    },
    {
      componentType: "AccountSummary",
      displayName: "Account summary",
      description:
        "Displays account totals without implementing business logic.",
      category: "domain",
      domainTags: ["accounts"],
      propsSchema: {
        $schema: objectSchemaDialect,
        type: "object",
        properties: {
          balance: {
            type: "number",
            minimum: 0,
          },
        },
        required: ["balance"],
        additionalProperties: false,
      },
      allowedActions: ["refresh-account"],
      nesting: {
        canHaveChildren: false,
        allowedParentTypes: ["Card"],
      },
    },
  ],
  actions: [
    {
      actionType: "refresh-account",
      description: "Requests refreshed account data.",
      payloadSchema: {
        $schema: objectSchemaDialect,
        type: "object",
        properties: {
          accountId: {
            type: "string",
            minLength: 1,
          },
        },
        required: ["accountId"],
        additionalProperties: false,
      },
      destructive: false,
      requiresApproval: false,
    },
  ],
} as const satisfies ComponentCatalog;

describe("Component Catalog", () => {
  it("accepts components, Props, Actions, nesting, domain tags, and versions", () => {
    expect(
      validateComponentCatalog(catalog, defaultCatalogSchemaLimits),
    ).toEqual({
      success: true,
      value: catalog,
    });
  });

  it.each([
    {
      ...catalog,
      actions: [catalog.actions[0], catalog.actions[0]],
    },
    {
      ...catalog,
      components: [
        {
          ...catalog.components[1],
          allowedActions: ["missing-action"],
        },
      ],
    },
    {
      ...catalog,
      components: [
        {
          ...catalog.components[1],
          nesting: {
            canHaveChildren: false,
            allowedParentTypes: ["MissingParent"],
          },
        },
      ],
    },
  ])("rejects duplicate or unresolved Catalog references", (input) => {
    expect(
      validateComponentCatalog(input, defaultCatalogSchemaLimits),
    ).toMatchObject({
      success: false,
      error: {
        code: "COMPONENT_CATALOG_INVALID",
        constraint: "catalog-reference-integrity",
      },
    });
  });

  it.each([
    {
      ...catalog,
      components: [
        {
          ...catalog.components[0],
          propsSchema: {
            $schema: objectSchemaDialect,
            $ref: "https://example.com/remote-schema",
          },
        },
      ],
    },
    {
      ...catalog,
      actions: [
        {
          ...catalog.actions[0],
          payloadSchema: {
            $schema: "https://json-schema.org/draft/2020-12/schema",
            type: "object",
          },
        },
      ],
    },
  ])("rejects unsupported embedded Schema definitions", (input) => {
    expect(
      validateComponentCatalog(input, defaultCatalogSchemaLimits),
    ).toMatchObject({
      success: false,
      error: {
        code: "SCHEMA_DEFINITION_INVALID",
      },
    });
  });

  it("enforces injected embedded Schema resource limits before compilation", () => {
    expect(
      validateComponentCatalog(catalog, {
        ...defaultCatalogSchemaLimits,
        maxEmbeddedSchemaNodes: 1,
      }),
    ).toMatchObject({
      success: false,
      error: {
        code: "SCHEMA_LIMIT_EXCEEDED",
        constraint: "schema-node-limit",
      },
    });
  });

  it("reports stable errors without exposing Ajv messages or Schema data", () => {
    const result = validateComponentCatalog(
      {
        ...catalog,
        unexpected: "field",
      },
      defaultCatalogSchemaLimits,
    );

    expect(result).toMatchObject({
      success: false,
      error: {
        code: "COMPONENT_CATALOG_INVALID",
        constraint: "additional-properties",
        message: "Component Catalog does not match its contract.",
      },
    });
    expect(JSON.stringify(result)).not.toContain("must NOT have");
    expect(JSON.stringify(result)).not.toContain("unexpected");
  });

  it("derives its TypeScript type from the runtime Schema", () => {
    expectTypeOf(catalog).toMatchTypeOf<ComponentCatalog>();
  });
});

describe("Catalog-owned Props and Action payload Schemas", () => {
  it("validates component Props through the declared runtime Schema", () => {
    expect(
      validateComponentProps(
        catalog,
        "AccountSummary",
        {
          balance: 14,
        },
        defaultCatalogSchemaLimits,
      ),
    ).toEqual({
      success: true,
      value: {
        balance: 14,
      },
    });

    expect(
      validateComponentProps(
        catalog,
        "AccountSummary",
        {
          balance: "unknown",
        },
        defaultCatalogSchemaLimits,
      ),
    ).toMatchObject({
      success: false,
      error: {
        code: "COMPONENT_PROPS_INVALID",
      },
    });
  });

  it("validates Action payloads through the declared runtime Schema", () => {
    expect(
      validateActionPayload(
        catalog,
        "refresh-account",
        {
          accountId: "account-14",
        },
        defaultCatalogSchemaLimits,
      ),
    ).toEqual({
      success: true,
      value: {
        accountId: "account-14",
      },
    });

    expect(
      validateActionPayload(
        catalog,
        "refresh-account",
        {},
        defaultCatalogSchemaLimits,
      ),
    ).toMatchObject({
      success: false,
      error: {
        code: "ACTION_PAYLOAD_INVALID",
      },
    });
  });

  it.each([
    ["component", "MissingComponent"],
    ["action", "missing-action"],
  ] as const)("rejects an unknown %s definition", (kind, memberType) => {
    const result =
      kind === "component"
        ? validateComponentProps(
            catalog,
            memberType,
            {},
            defaultCatalogSchemaLimits,
          )
        : validateActionPayload(
            catalog,
            memberType,
            {},
            defaultCatalogSchemaLimits,
          );

    expect(result).toMatchObject({
      success: false,
      error: {
        code: "COMPONENT_CATALOG_INVALID",
        constraint: "catalog-member-reference",
      },
    });
  });
});

describe("serialized Component Catalog Schema", () => {
  it("is valid Draft 7 JSON Schema with a stable identifier", () => {
    const ajv = new Ajv({
      strict: true,
      validateSchema: true,
    });

    expect(componentCatalogSchema.$id).toBe(
      "https://generative-ui.dev/schemas/component-catalog/1.0",
    );
    expect(
      ajv.validateSchema(JSON.parse(JSON.stringify(componentCatalogSchema))),
    ).toBe(true);
  });
});
