import {
  catalogReferenceSchema,
  uiPlanSchema,
} from "@generative-ui/presentation-contract";
import {
  type JsonValue,
  jsonValueSchema,
  type ValidationResult,
} from "@generative-ui/shared-types";
import type { TSchema } from "@sinclair/typebox";
import { Ajv, type ErrorObject, type ValidateFunction } from "ajv";
import {
  type A2UIOperation,
  type A2UIOperationSequence,
  a2UIComponentSchema,
  a2UIDataBindingSchema,
  a2UIDataModelSchema,
  a2UIDynamicValueSchema,
  a2UIEventActionSchema,
  a2UIOperationSchema,
  a2UIOperationSequenceSchema,
  actionIRSchema,
  actionParameterIRSchema,
  type CatalogContentHash,
  type CompileError,
  catalogContentHashSchema,
  compileContextSchema,
  compileErrorCodeSchema,
  compileErrorSchema,
  compileMetadataSchema,
  compileStageSchema,
  componentActionBindingIRSchema,
  componentIRSchema,
  createSurfaceOperationSchema,
  layoutIRSchema,
  propBindingIRSchema,
  type SurfaceId,
  surfaceIdSchema,
  type UICompileRequest,
  type UICompileResult,
  type UISurfaceIR,
  uiCompileRequestSchema,
  uiCompileResultSchema,
  uiSurfaceIRSchema,
  updateComponentsOperationSchema,
  updateDataModelOperationSchema,
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

export type CompilerContractValidationCode =
  | "A2UI_INVALID"
  | "CATALOG_CONTENT_HASH_INVALID"
  | "COMPILE_ERROR_INVALID"
  | "SURFACE_ID_INVALID"
  | "UI_COMPILE_REQUEST_INVALID"
  | "UI_COMPILE_RESULT_INVALID"
  | "UI_IR_INVALID";

function failure<TCode extends CompilerContractValidationCode>(
  code: TCode,
  path: string,
  constraint: string,
  contractName: string,
): ValidationResult<never, TCode> {
  return {
    success: false,
    error: {
      code,
      path,
      constraint,
      message: `${contractName} does not match its contract.`,
    },
  };
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
    case "oneOf":
      return "union";
    case "const":
      return "constant";
    case "minLength":
      return "minimum-length";
    case "minItems":
      return "minimum-items";
    case "maxItems":
      return "maximum-items";
    case "uniqueItems":
      return "unique-items";
    case "pattern":
      return "format";
    default:
      return "contract";
  }
}

const referencedSchemas = [
  jsonValueSchema,
  catalogReferenceSchema,
  uiPlanSchema,
  surfaceIdSchema,
  catalogContentHashSchema,
  compileContextSchema,
  compileStageSchema,
  compileErrorCodeSchema,
  compileErrorSchema,
  propBindingIRSchema,
  layoutIRSchema,
  componentIRSchema,
  actionParameterIRSchema,
  actionIRSchema,
  componentActionBindingIRSchema,
  a2UIDataBindingSchema,
  a2UIDynamicValueSchema,
  a2UIEventActionSchema,
  a2UIComponentSchema,
  a2UIDataModelSchema,
  createSurfaceOperationSchema,
  updateComponentsOperationSchema,
  updateDataModelOperationSchema,
  a2UIOperationSchema,
  a2UIOperationSequenceSchema,
  compileMetadataSchema,
] as const;

function createAjv(): Ajv {
  const ajv = new Ajv(ajvOptions);
  for (const schema of referencedSchemas) {
    ajv.addSchema(schema);
  }
  return ajv;
}

function createValidator<T, TCode extends CompilerContractValidationCode>(
  schema: TSchema,
  code: TCode,
  contractName: string,
): (input: unknown) => ValidationResult<T, TCode> {
  const validate: ValidateFunction = createAjv().compile(schema);

  return (input) => {
    if (validate(input)) {
      return {
        success: true,
        value: input as T,
      };
    }

    const firstError = validate.errors?.[0];
    return failure(
      code,
      firstError?.instancePath ?? "",
      normalizeConstraint(firstError),
      contractName,
    );
  };
}

const validateSurfaceIdSchema = createValidator<
  SurfaceId,
  "SURFACE_ID_INVALID"
>(surfaceIdSchema, "SURFACE_ID_INVALID", "Surface ID");

export function validateSurfaceId(
  input: unknown,
): ValidationResult<SurfaceId, "SURFACE_ID_INVALID"> {
  return validateSurfaceIdSchema(input);
}

const validateCatalogContentHashSchema = createValidator<
  CatalogContentHash,
  "CATALOG_CONTENT_HASH_INVALID"
>(
  catalogContentHashSchema,
  "CATALOG_CONTENT_HASH_INVALID",
  "Catalog content hash",
);

export function validateCatalogContentHash(
  input: unknown,
): ValidationResult<CatalogContentHash, "CATALOG_CONTENT_HASH_INVALID"> {
  return validateCatalogContentHashSchema(input);
}

const validateCompileErrorSchema = createValidator<
  CompileError,
  "COMPILE_ERROR_INVALID"
>(compileErrorSchema, "COMPILE_ERROR_INVALID", "Compile Error");

export function validateCompileError(
  input: unknown,
): ValidationResult<CompileError, "COMPILE_ERROR_INVALID"> {
  return validateCompileErrorSchema(input);
}

const validateUICompileRequestSchema = createValidator<
  UICompileRequest,
  "UI_COMPILE_REQUEST_INVALID"
>(uiCompileRequestSchema, "UI_COMPILE_REQUEST_INVALID", "UI Compile Request");

export function validateUICompileRequest(
  input: unknown,
): ValidationResult<UICompileRequest, "UI_COMPILE_REQUEST_INVALID"> {
  const result = validateUICompileRequestSchema(input);
  if (!result.success || result.value.sourceKind !== "markdown") {
    return result;
  }

  if (result.value.sourceData.markdown !== result.value.fallbackMarkdown) {
    return failure(
      "UI_COMPILE_REQUEST_INVALID",
      "/fallbackMarkdown",
      "markdown-source-consistency",
      "UI Compile Request",
    );
  }

  return result;
}

const validateUISurfaceIRSchema = createValidator<UISurfaceIR, "UI_IR_INVALID">(
  uiSurfaceIRSchema,
  "UI_IR_INVALID",
  "UI IR",
);

function componentReferences(
  component: UISurfaceIR["components"][number],
): string[] {
  return [
    ...component.children,
    ...Object.values(component.slots ?? {}).flat(),
  ];
}

function resolvesJsonPointer(value: JsonValue, pointer: string): boolean {
  let current: JsonValue = value;
  const segments = pointer
    .slice(1)
    .split("/")
    .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"));

  for (const segment of segments) {
    if (Array.isArray(current)) {
      if (!/^(?:0|[1-9][0-9]*)$/.test(segment)) {
        return false;
      }
      const index = Number(segment);
      if (index >= current.length || !Object.hasOwn(current, index)) {
        return false;
      }
      current = current[index] as JsonValue;
      continue;
    }
    if (
      current === null ||
      typeof current !== "object" ||
      !Object.hasOwn(current, segment)
    ) {
      return false;
    }
    current = current[segment] as JsonValue;
  }

  return true;
}

export function validateUISurfaceIR(
  input: unknown,
): ValidationResult<UISurfaceIR, "UI_IR_INVALID"> {
  const result = validateUISurfaceIRSchema(input);
  if (!result.success) {
    return result;
  }

  const surface = result.value;
  const componentIndexes = new Map<string, number>();
  for (const [index, component] of surface.components.entries()) {
    if (componentIndexes.has(component.componentId)) {
      return failure(
        "UI_IR_INVALID",
        `/components/${index}/componentId`,
        "unique-component-id",
        "UI IR",
      );
    }
    componentIndexes.set(component.componentId, index);

    const bindingProps = new Set<string>();
    for (const [bindingIndex, binding] of (
      component.bindings ?? []
    ).entries()) {
      if (bindingProps.has(binding.prop)) {
        return failure(
          "UI_IR_INVALID",
          `/components/${index}/bindings/${bindingIndex}/prop`,
          "unique-prop-binding",
          "UI IR",
        );
      }
      bindingProps.add(binding.prop);

      if (
        binding.source === "derivedData" &&
        surface.dataSources.derivedData === undefined
      ) {
        return failure(
          "UI_IR_INVALID",
          `/components/${index}/bindings/${bindingIndex}/source`,
          "derived-data-reference",
          "UI IR",
        );
      }

      const dataSource =
        binding.source === "sourceData"
          ? surface.dataSources.sourceData
          : surface.dataSources.derivedData;
      if (
        dataSource !== undefined &&
        !resolvesJsonPointer(dataSource, binding.path)
      ) {
        return failure(
          "UI_IR_INVALID",
          `/components/${index}/bindings/${bindingIndex}/path`,
          "data-binding-reference",
          "UI IR",
        );
      }
    }
  }

  if (!componentIndexes.has(surface.rootComponentId)) {
    return failure(
      "UI_IR_INVALID",
      "/rootComponentId",
      "root-component-reference",
      "UI IR",
    );
  }

  const parentCounts = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  for (const [index, component] of surface.components.entries()) {
    const references = componentReferences(component);
    const uniqueReferences = new Set(references);
    if (uniqueReferences.size !== references.length) {
      return failure(
        "UI_IR_INVALID",
        `/components/${index}`,
        "unique-child-reference",
        "UI IR",
      );
    }

    for (const reference of uniqueReferences) {
      if (!componentIndexes.has(reference)) {
        return failure(
          "UI_IR_INVALID",
          `/components/${index}`,
          "component-reference",
          "UI IR",
        );
      }
      parentCounts.set(reference, (parentCounts.get(reference) ?? 0) + 1);
      if ((parentCounts.get(reference) ?? 0) > 1) {
        return failure(
          "UI_IR_INVALID",
          `/components/${index}`,
          "single-component-parent",
          "UI IR",
        );
      }
    }
    adjacency.set(component.componentId, references);
  }

  if ((parentCounts.get(surface.rootComponentId) ?? 0) !== 0) {
    return failure(
      "UI_IR_INVALID",
      "/rootComponentId",
      "root-component-parent",
      "UI IR",
    );
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  function visit(componentId: string): boolean {
    if (visiting.has(componentId)) {
      return false;
    }
    if (visited.has(componentId)) {
      return true;
    }

    visiting.add(componentId);
    for (const childId of adjacency.get(componentId) ?? []) {
      if (!visit(childId)) {
        return false;
      }
    }
    visiting.delete(componentId);
    visited.add(componentId);
    return true;
  }

  if (!visit(surface.rootComponentId)) {
    return failure(
      "UI_IR_INVALID",
      "/components",
      "acyclic-component-graph",
      "UI IR",
    );
  }
  if (visited.size !== surface.components.length) {
    return failure(
      "UI_IR_INVALID",
      "/components",
      "reachable-component-graph",
      "UI IR",
    );
  }

  const actionIndexes = new Map<string, number>();
  for (const [index, action] of surface.actions.entries()) {
    if (actionIndexes.has(action.actionId)) {
      return failure(
        "UI_IR_INVALID",
        `/actions/${index}/actionId`,
        "unique-action-id",
        "UI IR",
      );
    }
    actionIndexes.set(action.actionId, index);

    for (const [parameterName, parameter] of Object.entries(
      action.payload ?? {},
    )) {
      if (
        parameter.kind === "source-binding" &&
        !resolvesJsonPointer(
          surface.dataSources.sourceData,
          parameter.sourcePointer,
        )
      ) {
        return failure(
          "UI_IR_INVALID",
          `/actions/${index}/payload/${parameterName}/sourcePointer`,
          "action-data-binding-reference",
          "UI IR",
        );
      }
    }
  }

  const boundActions = new Set<string>();
  const boundComponents = new Set<string>();
  const bindings = new Set<string>();
  for (const [index, binding] of surface.actionBindings.entries()) {
    if (!componentIndexes.has(binding.componentId)) {
      return failure(
        "UI_IR_INVALID",
        `/actionBindings/${index}/componentId`,
        "action-component-reference",
        "UI IR",
      );
    }
    if (!actionIndexes.has(binding.actionId)) {
      return failure(
        "UI_IR_INVALID",
        `/actionBindings/${index}/actionId`,
        "action-reference",
        "UI IR",
      );
    }

    const bindingKey = `${binding.componentId}\u0000${binding.actionId}`;
    if (bindings.has(bindingKey)) {
      return failure(
        "UI_IR_INVALID",
        `/actionBindings/${index}`,
        "unique-action-binding",
        "UI IR",
      );
    }
    bindings.add(bindingKey);

    if (boundComponents.has(binding.componentId)) {
      return failure(
        "UI_IR_INVALID",
        `/actionBindings/${index}/componentId`,
        "single-component-action",
        "UI IR",
      );
    }
    boundComponents.add(binding.componentId);
    boundActions.add(binding.actionId);
  }

  for (const [actionId, index] of actionIndexes) {
    if (!boundActions.has(actionId)) {
      return failure(
        "UI_IR_INVALID",
        `/actions/${index}/actionId`,
        "bound-action",
        "UI IR",
      );
    }
  }

  return result;
}

const validateA2UIOperationSchema = createValidator<
  A2UIOperation,
  "A2UI_INVALID"
>(a2UIOperationSchema, "A2UI_INVALID", "A2UI 0.9.1 Profile Operation");

export function validateA2UIOperation(
  input: unknown,
): ValidationResult<A2UIOperation, "A2UI_INVALID"> {
  return validateA2UIOperationSchema(input);
}

const validateA2UIOperationSequenceSchema = createValidator<
  A2UIOperationSequence,
  "A2UI_INVALID"
>(
  a2UIOperationSequenceSchema,
  "A2UI_INVALID",
  "A2UI 0.9.1 Profile Operation Sequence",
);

export function validateA2UIOperationSequence(
  input: unknown,
): ValidationResult<A2UIOperationSequence, "A2UI_INVALID"> {
  const result = validateA2UIOperationSequenceSchema(input);
  if (!result.success) {
    return result;
  }

  const [createSurface, updateComponents, updateDataModel] = result.value;
  const surfaceId = createSurface.createSurface.surfaceId;
  if (
    updateComponents.updateComponents.surfaceId !== surfaceId ||
    updateDataModel.updateDataModel.surfaceId !== surfaceId
  ) {
    return failure(
      "A2UI_INVALID",
      "",
      "surface-id-consistency",
      "A2UI 0.9.1 Profile Operation Sequence",
    );
  }

  const componentIds = new Set<string>();
  for (const [
    index,
    component,
  ] of updateComponents.updateComponents.components.entries()) {
    if (componentIds.has(component.id)) {
      return failure(
        "A2UI_INVALID",
        `/1/updateComponents/components/${index}/id`,
        "unique-component-id",
        "A2UI 0.9.1 Profile Operation Sequence",
      );
    }
    componentIds.add(component.id);
  }
  if (!componentIds.has("root")) {
    return failure(
      "A2UI_INVALID",
      "/1/updateComponents/components",
      "root-component",
      "A2UI 0.9.1 Profile Operation Sequence",
    );
  }

  return result;
}

const validateUICompileResultSchema = createValidator<
  UICompileResult,
  "UI_COMPILE_RESULT_INVALID"
>(uiCompileResultSchema, "UI_COMPILE_RESULT_INVALID", "UI Compile Result");

export function validateUICompileResult(
  input: unknown,
): ValidationResult<UICompileResult, "UI_COMPILE_RESULT_INVALID"> {
  const result = validateUICompileResultSchema(input);
  if (!result.success || !result.value.success || result.value.degraded) {
    return result;
  }

  const operationResult = validateA2UIOperationSequence(
    result.value.operations,
  );
  if (!operationResult.success) {
    return failure(
      "UI_COMPILE_RESULT_INVALID",
      operationResult.error.path,
      operationResult.error.constraint,
      "UI Compile Result",
    );
  }

  const createSurface = operationResult.value[0].createSurface;
  if (result.value.surfaceId !== createSurface.surfaceId) {
    return failure(
      "UI_COMPILE_RESULT_INVALID",
      "/surfaceId",
      "surface-id-consistency",
      "UI Compile Result",
    );
  }
  if (result.value.metadata.catalog.catalogId !== createSurface.catalogId) {
    return failure(
      "UI_COMPILE_RESULT_INVALID",
      "/metadata/catalog/catalogId",
      "catalog-id-consistency",
      "UI Compile Result",
    );
  }
  if (!result.value.metadata.completedStages.includes("a2ui-validation")) {
    return failure(
      "UI_COMPILE_RESULT_INVALID",
      "/metadata/completedStages",
      "completed-a2ui-validation",
      "UI Compile Result",
    );
  }

  return result;
}
