import {
  type A2UIComponent,
  type A2UIDataModel,
  validateA2UIOperation,
} from "@generative-ui/compiler-contract";
import type { RuntimeActionEnvelope } from "@generative-ui/runtime-contract";
import type { JsonValue } from "@generative-ui/shared-types";

export const registeredComponentTypes = [
  "Badge",
  "Button",
  "Card",
  "Column",
  "List",
  "Row",
  "Table",
  "Text",
  "Timeline",
] as const;

export type RegisteredComponentType = (typeof registeredComponentTypes)[number];

/** Catalog capabilities are a local, verified deployment configuration, never model input. */
export const catalogComponentRegistry: Readonly<
  Record<string, readonly RegisteredComponentType[]>
> = {
  fixture: ["Card", "Text"],
};

export function isRenderableComponent(
  catalogId: string,
  componentType: string,
): componentType is RegisteredComponentType {
  return (
    registeredComponentTypes.includes(
      componentType as RegisteredComponentType,
    ) &&
    (catalogComponentRegistry[catalogId] ?? []).includes(
      componentType as RegisteredComponentType,
    )
  );
}

export interface A2UISurface {
  readonly catalogId: string;
  readonly components: ReadonlyMap<string, A2UIComponent>;
  readonly dataModel?: A2UIDataModel;
  readonly surfaceId: string;
  readonly theme: Readonly<Record<string, string>>;
}

export type A2UIApplyResult =
  | {
      readonly success: true;
      readonly surfaces: ReadonlyMap<string, A2UISurface>;
    }
  | {
      readonly success: false;
      readonly error: {
        readonly code: "A2UI_OPERATION_INVALID" | "A2UI_SURFACE_NOT_FOUND";
        readonly message: string;
        readonly operationIndex: number;
      };
    };

const MAX_COMPONENTS_PER_SURFACE = 500;

function hasValidComponentGraph(components: readonly A2UIComponent[]): boolean {
  if (components.length > MAX_COMPONENTS_PER_SURFACE) return false;
  const ids = new Set(components.map((component) => component.id));
  if (ids.size !== components.length || !ids.has("root")) return false;
  const adjacency = new Map<string, string[]>();
  const parentCounts = new Map<string, number>();
  for (const component of components) {
    const children = component.children;
    if (
      children !== undefined &&
      (!Array.isArray(children) ||
        !children.every((child) => typeof child === "string"))
    )
      return false;
    const childIds = (children ?? []) as string[];
    if (
      new Set(childIds).size !== childIds.length ||
      childIds.some((childId) => !ids.has(childId))
    )
      return false;
    adjacency.set(component.id, childIds);
    for (const childId of childIds) {
      parentCounts.set(childId, (parentCounts.get(childId) ?? 0) + 1);
    }
  }
  if ([...parentCounts.values()].some((count) => count > 1)) return false;
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const visit = (componentId: string): boolean => {
    if (visiting.has(componentId)) return false;
    if (visited.has(componentId)) return true;
    visiting.add(componentId);
    const valid = (adjacency.get(componentId) ?? []).every(visit);
    visiting.delete(componentId);
    if (valid) visited.add(componentId);
    return valid;
  };
  return visit("root") && visited.size === components.length;
}

function cloneSurfaces(
  surfaces: ReadonlyMap<string, A2UISurface>,
): Map<string, A2UISurface> {
  return new Map(
    [...surfaces].map(([id, surface]) => [
      id,
      {
        ...surface,
        components: new Map(surface.components),
        theme: { ...surface.theme },
      },
    ]),
  );
}

/** Applies only the compiler v0.9 profile, atomically. */
export function applyA2UIOperations(
  previous: ReadonlyMap<string, A2UISurface>,
  operations: readonly unknown[],
): A2UIApplyResult {
  const next = cloneSurfaces(previous);
  for (const [operationIndex, candidate] of operations.entries()) {
    const validation = validateA2UIOperation(candidate);
    if (!validation.success)
      return {
        success: false,
        error: {
          code: "A2UI_OPERATION_INVALID",
          message: validation.error.message,
          operationIndex,
        },
      };
    const operation = validation.value;
    if ("createSurface" in operation) {
      const { surfaceId, catalogId, theme } = operation.createSurface;
      const safeTheme: Record<string, string> = {};
      for (const [key, value] of Object.entries(theme ?? {})) {
        if (typeof value === "string") safeTheme[key] = value;
      }
      next.set(surfaceId, {
        catalogId,
        components: new Map(),
        surfaceId,
        theme: safeTheme,
      });
    } else if ("updateComponents" in operation) {
      const surface = next.get(operation.updateComponents.surfaceId);
      if (!surface)
        return {
          success: false,
          error: {
            code: "A2UI_SURFACE_NOT_FOUND",
            message: "A2UI component update references an unknown Surface.",
            operationIndex,
          },
        };
      if (!hasValidComponentGraph(operation.updateComponents.components))
        return {
          success: false,
          error: {
            code: "A2UI_OPERATION_INVALID",
            message: "A2UI components must form a bounded rooted tree.",
            operationIndex,
          },
        };
      next.set(surface.surfaceId, {
        ...surface,
        components: new Map(
          operation.updateComponents.components.map((component) => [
            component.id,
            component,
          ]),
        ),
      });
    } else if ("updateDataModel" in operation) {
      const surface = next.get(operation.updateDataModel.surfaceId);
      if (!surface)
        return {
          success: false,
          error: {
            code: "A2UI_SURFACE_NOT_FOUND",
            message: "A2UI data update references an unknown Surface.",
            operationIndex,
          },
        };
      next.set(surface.surfaceId, {
        ...surface,
        dataModel: operation.updateDataModel.value,
      });
    }
  }
  return { success: true, surfaces: next };
}

export function destroySurface(
  surfaces: ReadonlyMap<string, A2UISurface>,
  surfaceId: string,
): ReadonlyMap<string, A2UISurface> {
  const next = cloneSurfaces(surfaces);
  next.delete(surfaceId);
  return next;
}

export function resolveJsonPointer(
  dataModel: A2UIDataModel | undefined,
  pointer: string,
): JsonValue | undefined {
  if (!dataModel || !pointer.startsWith("/")) return undefined;
  let current: JsonValue = dataModel as JsonValue;
  for (const encoded of pointer.slice(1).split("/")) {
    const segment = encoded.replaceAll("~1", "/").replaceAll("~0", "~");
    if (Array.isArray(current) && /^(?:0|[1-9][0-9]*)$/.test(segment))
      current = current[Number(segment)] as JsonValue;
    else if (
      current !== null &&
      typeof current === "object" &&
      Object.hasOwn(current, segment)
    )
      current = (current as Record<string, JsonValue>)[segment] as JsonValue;
    else return undefined;
  }
  return current;
}

export function resolveDynamicValue(
  value: JsonValue,
  dataModel: A2UIDataModel | undefined,
): JsonValue | undefined {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === 1 &&
    typeof value.path === "string"
    ? resolveJsonPointer(dataModel, value.path)
    : value;
}

export function createRuntimeAction(
  surfaceId: string,
  component: A2UIComponent,
  dataModel: A2UIDataModel | undefined,
): RuntimeActionEnvelope | undefined {
  const event = component.action?.event;
  if (!event) return undefined;
  const {
    actionId,
    destructive: _destructive,
    requiresApproval: _requiresApproval,
    ...payload
  } = event.context;
  const resolvedPayload: Record<string, JsonValue> = {};
  for (const [key, value] of Object.entries(payload)) {
    const resolved = resolveDynamicValue(value, dataModel);
    if (resolved === undefined) return undefined;
    resolvedPayload[key] = resolved;
  }
  return {
    actionId,
    actionType: event.name,
    surfaceId,
    ...(Object.keys(payload).length === 0 ? {} : { payload: resolvedPayload }),
  };
}
