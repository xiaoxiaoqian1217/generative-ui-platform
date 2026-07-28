import {
  type JsonValue,
  jsonValueSchema,
  type ValidationResult,
} from "@generative-ui/shared-types";
import { Ajv, type ErrorObject, type ValidateFunction } from "ajv";
import {
  actionDefinitionSchema,
  type CatalogObjectValueSchema,
  type CatalogSchemaLimits,
  type ComponentCatalog,
  catalogObjectValueSchema,
  componentCatalogSchema,
  componentDefinitionSchema,
  componentNestingSchema,
  embeddedSchemaNodeSchema,
} from "./schemas.js";

const ajvOptions = {
  strict: true,
  allErrors: false,
  coerceTypes: false,
  removeAdditional: false,
  useDefaults: false,
  validateSchema: true,
  $data: false,
} as const;

const embeddedSchemaAjvOptions = {
  ...ajvOptions,
  allowUnionTypes: true,
} as const;

export type CatalogValidationCode =
  | "COMPONENT_CATALOG_INVALID"
  | "SCHEMA_COMPILATION_FAILED"
  | "SCHEMA_DEFINITION_INVALID"
  | "SCHEMA_LIMIT_EXCEEDED";

export type CatalogValueValidationCode =
  | CatalogValidationCode
  | "ACTION_PAYLOAD_INVALID"
  | "COMPONENT_PROPS_INVALID";

interface EmbeddedSchemaLocation {
  path: string;
  value: unknown;
}

function normalizeConstraint(error: ErrorObject | undefined): string {
  switch (error?.keyword) {
    case "additionalProperties":
      return "additional-properties";
    case "required":
      return "required";
    case "type":
      return "type";
    case "anyOf":
      return "union";
    case "minLength":
      return "minimum-length";
    case "minItems":
      return "minimum-items";
    default:
      return "contract";
  }
}

function failure<TCode extends CatalogValueValidationCode>(
  code: TCode,
  path: string,
  constraint: string,
  message: string,
): ValidationResult<never, TCode> {
  return {
    success: false,
    error: {
      code,
      path,
      constraint,
      message,
    },
  };
}

function createCatalogAjv(): Ajv {
  const ajv = new Ajv(ajvOptions);
  ajv.addSchema(jsonValueSchema);
  ajv.addSchema(embeddedSchemaNodeSchema);
  ajv.addSchema(catalogObjectValueSchema);
  ajv.addSchema(componentNestingSchema);
  ajv.addSchema(componentDefinitionSchema);
  ajv.addSchema(actionDefinitionSchema);
  return ajv;
}

function compileEmbeddedSchema(schema: object): ValidateFunction {
  return new Ajv(embeddedSchemaAjvOptions).compile(schema);
}

const componentCatalogValidator = createCatalogAjv().compile(
  componentCatalogSchema,
);
const embeddedSchemaAjv = new Ajv(ajvOptions);
embeddedSchemaAjv.addSchema(jsonValueSchema);
embeddedSchemaAjv.addSchema(embeddedSchemaNodeSchema);
const embeddedSchemaDefinitionValidator = embeddedSchemaAjv.compile(
  catalogObjectValueSchema,
);
const jsonValueValidator = new Ajv(ajvOptions).compile(jsonValueSchema);

function collectEmbeddedSchemas(input: unknown): EmbeddedSchemaLocation[] {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return [];
  }

  const candidate = input as {
    components?: unknown;
    actions?: unknown;
  };
  const locations: EmbeddedSchemaLocation[] = [];

  if (Array.isArray(candidate.components)) {
    candidate.components.forEach((component, index) => {
      if (
        typeof component === "object" &&
        component !== null &&
        !Array.isArray(component) &&
        "propsSchema" in component
      ) {
        locations.push({
          path: `/components/${index}/propsSchema`,
          value: (component as { propsSchema: unknown }).propsSchema,
        });
      }
    });
  }

  if (Array.isArray(candidate.actions)) {
    candidate.actions.forEach((action, index) => {
      if (
        typeof action === "object" &&
        action !== null &&
        !Array.isArray(action) &&
        "payloadSchema" in action
      ) {
        locations.push({
          path: `/actions/${index}/payloadSchema`,
          value: (action as { payloadSchema: unknown }).payloadSchema,
        });
      }
    });
  }

  return locations;
}

type SchemaMeasurement =
  | {
      success: true;
    }
  | {
      success: false;
      reason:
        | "invalid"
        | "schema-byte-limit"
        | "schema-depth-limit"
        | "schema-node-limit";
    };

function measureSchema(
  value: unknown,
  limits: CatalogSchemaLimits,
): SchemaMeasurement {
  let nodes = 0;
  const stack: Array<{
    depth: number;
    exiting: boolean;
    value: unknown;
  }> = [
    {
      depth: 1,
      exiting: false,
      value,
    },
  ];
  const ancestors = new WeakSet<object>();

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      break;
    }

    if (current.exiting) {
      ancestors.delete(current.value as object);
      continue;
    }

    if (current.depth > limits.maxEmbeddedSchemaDepth) {
      return {
        success: false,
        reason: "schema-depth-limit",
      };
    }

    nodes += 1;
    if (nodes > limits.maxEmbeddedSchemaNodes) {
      return {
        success: false,
        reason: "schema-node-limit",
      };
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
      return {
        success: false,
        reason: "invalid",
      };
    }

    if (ancestors.has(current.value as object)) {
      return {
        success: false,
        reason: "invalid",
      };
    }
    ancestors.add(current.value as object);
    stack.push({
      depth: current.depth,
      exiting: true,
      value: current.value,
    });

    let children: unknown[];
    try {
      children = Array.isArray(current.value)
        ? current.value
        : Object.values(current.value as object);
    } catch {
      return {
        success: false,
        reason: "invalid",
      };
    }

    for (let index = children.length - 1; index >= 0; index -= 1) {
      stack.push({
        depth: current.depth + 1,
        exiting: false,
        value: children[index],
      });
    }
  }

  let serialized: string | undefined;
  try {
    serialized = JSON.stringify(value);
  } catch {
    return {
      success: false,
      reason: "invalid",
    };
  }
  if (serialized === undefined) {
    return {
      success: false,
      reason: "invalid",
    };
  }

  const bytes = new TextEncoder().encode(serialized).byteLength;
  if (bytes > limits.maxEmbeddedSchemaBytes) {
    return {
      success: false,
      reason: "schema-byte-limit",
    };
  }

  return {
    success: true,
  };
}

function validateEmbeddedSchema(
  location: EmbeddedSchemaLocation,
  limits: CatalogSchemaLimits,
): ValidationResult<CatalogObjectValueSchema, CatalogValidationCode> {
  const measurement = measureSchema(location.value, limits);
  if (!measurement.success) {
    if (measurement.reason === "invalid") {
      return failure(
        "SCHEMA_DEFINITION_INVALID",
        location.path,
        "json-value",
        "Catalog embedded Schema must be a finite JSON value.",
      );
    }

    const limitMessages = {
      "schema-byte-limit":
        "Catalog embedded Schema exceeds its configured byte limit.",
      "schema-depth-limit":
        "Catalog embedded Schema exceeds its configured depth limit.",
      "schema-node-limit":
        "Catalog embedded Schema exceeds its configured node limit.",
    } as const;
    return failure(
      "SCHEMA_LIMIT_EXCEEDED",
      location.path,
      measurement.reason,
      limitMessages[measurement.reason],
    );
  }

  if (!embeddedSchemaDefinitionValidator(location.value)) {
    const firstError = embeddedSchemaDefinitionValidator.errors?.[0];
    return failure(
      "SCHEMA_DEFINITION_INVALID",
      `${location.path}${firstError?.instancePath ?? ""}`,
      normalizeConstraint(firstError),
      "Catalog embedded Schema does not match the supported Draft 7 profile.",
    );
  }

  try {
    compileEmbeddedSchema(location.value as object);
  } catch {
    return failure(
      "SCHEMA_COMPILATION_FAILED",
      location.path,
      "schema-compilation",
      "Catalog embedded Schema could not be compiled.",
    );
  }

  return {
    success: true,
    value: location.value as CatalogObjectValueSchema,
  };
}

function validateReferenceIntegrity(
  catalog: ComponentCatalog,
): ValidationResult<ComponentCatalog, "COMPONENT_CATALOG_INVALID"> {
  const componentTypes = new Set<string>();
  for (const component of catalog.components) {
    if (componentTypes.has(component.componentType)) {
      return failure(
        "COMPONENT_CATALOG_INVALID",
        "/components",
        "catalog-reference-integrity",
        "Component Catalog contains duplicate or unresolved references.",
      );
    }
    componentTypes.add(component.componentType);
  }

  const actionTypes = new Set<string>();
  for (const action of catalog.actions) {
    if (actionTypes.has(action.actionType)) {
      return failure(
        "COMPONENT_CATALOG_INVALID",
        "/actions",
        "catalog-reference-integrity",
        "Component Catalog contains duplicate or unresolved references.",
      );
    }
    actionTypes.add(action.actionType);
  }

  for (const component of catalog.components) {
    if (component.category === "domain" && component.domainTags.length === 0) {
      return failure(
        "COMPONENT_CATALOG_INVALID",
        "/components",
        "catalog-reference-integrity",
        "Component Catalog contains duplicate or unresolved references.",
      );
    }

    if (
      component.allowedActions.some(
        (actionType) => !actionTypes.has(actionType),
      )
    ) {
      return failure(
        "COMPONENT_CATALOG_INVALID",
        "/components",
        "catalog-reference-integrity",
        "Component Catalog contains duplicate or unresolved references.",
      );
    }

    const nestedReferences = [
      ...(component.nesting.allowedParentTypes ?? []),
      ...("allowedChildTypes" in component.nesting
        ? (component.nesting.allowedChildTypes ?? [])
        : []),
    ];
    if (
      nestedReferences.some(
        (componentType) => !componentTypes.has(componentType),
      )
    ) {
      return failure(
        "COMPONENT_CATALOG_INVALID",
        "/components",
        "catalog-reference-integrity",
        "Component Catalog contains duplicate or unresolved references.",
      );
    }
  }

  return {
    success: true,
    value: catalog,
  };
}

function validateWith(
  validator: ValidateFunction,
  input: unknown,
): ValidationResult<ComponentCatalog, "COMPONENT_CATALOG_INVALID"> {
  if (validator(input)) {
    return {
      success: true,
      value: input as ComponentCatalog,
    };
  }

  const firstError = validator.errors?.[0];
  return failure(
    "COMPONENT_CATALOG_INVALID",
    firstError?.instancePath ?? "",
    normalizeConstraint(firstError),
    "Component Catalog does not match its contract.",
  );
}

export function validateComponentCatalog(
  input: unknown,
  limits: CatalogSchemaLimits,
): ValidationResult<ComponentCatalog, CatalogValidationCode> {
  for (const location of collectEmbeddedSchemas(input)) {
    const schemaResult = validateEmbeddedSchema(location, limits);
    if (!schemaResult.success) {
      return schemaResult;
    }
  }

  const catalogResult = validateWith(componentCatalogValidator, input);
  if (!catalogResult.success) {
    return catalogResult;
  }

  return validateReferenceIntegrity(catalogResult.value);
}

function validateCatalogBoundValue(
  inputCatalog: unknown,
  memberType: string,
  value: unknown,
  limits: CatalogSchemaLimits,
  kind: "action" | "component",
): ValidationResult<JsonValue, CatalogValueValidationCode> {
  const catalogResult = validateComponentCatalog(inputCatalog, limits);
  if (!catalogResult.success) {
    return catalogResult;
  }

  const definition =
    kind === "component"
      ? catalogResult.value.components.find(
          (component) => component.componentType === memberType,
        )
      : catalogResult.value.actions.find(
          (action) => action.actionType === memberType,
        );
  if (!definition) {
    return failure(
      "COMPONENT_CATALOG_INVALID",
      kind === "component" ? "/components" : "/actions",
      "catalog-member-reference",
      "The requested Catalog member is not declared.",
    );
  }

  const validationCode =
    kind === "component"
      ? ("COMPONENT_PROPS_INVALID" as const)
      : ("ACTION_PAYLOAD_INVALID" as const);
  const contractName =
    kind === "component" ? "Component Props" : "Action payload";

  if (!jsonValueValidator(value)) {
    return failure(
      validationCode,
      "",
      "json-value",
      `${contractName} does not match its contract.`,
    );
  }

  const schema =
    "propsSchema" in definition
      ? definition.propsSchema
      : definition.payloadSchema;
  let validator: ValidateFunction;
  try {
    validator = compileEmbeddedSchema(schema);
  } catch {
    return failure(
      "SCHEMA_COMPILATION_FAILED",
      "",
      "schema-compilation",
      "Catalog embedded Schema could not be compiled.",
    );
  }

  if (!validator(value)) {
    const firstError = validator.errors?.[0];
    return failure(
      validationCode,
      firstError?.instancePath ?? "",
      normalizeConstraint(firstError),
      `${contractName} does not match its contract.`,
    );
  }

  return {
    success: true,
    value: value as JsonValue,
  };
}

export function validateComponentProps(
  catalog: unknown,
  componentType: string,
  props: unknown,
  limits: CatalogSchemaLimits,
): ValidationResult<JsonValue, CatalogValueValidationCode> {
  return validateCatalogBoundValue(
    catalog,
    componentType,
    props,
    limits,
    "component",
  );
}

export function validateActionPayload(
  catalog: unknown,
  actionType: string,
  payload: unknown,
  limits: CatalogSchemaLimits,
): ValidationResult<JsonValue, CatalogValueValidationCode> {
  return validateCatalogBoundValue(
    catalog,
    actionType,
    payload,
    limits,
    "action",
  );
}
