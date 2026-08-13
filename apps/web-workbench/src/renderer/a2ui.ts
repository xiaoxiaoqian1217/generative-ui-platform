import type { JsonValue } from "@generative-ui/shared-types";
import { z } from "zod";

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ]),
);

const actionContextSchema = z
  .object({
    actionId: z.string().min(1),
    destructive: z.boolean(),
    requiresApproval: z.boolean(),
  })
  .catchall(jsonValueSchema);

const componentSchema = z
  .object({
    id: z.string().min(1),
    component: z.string().min(1),
    children: z.array(z.string()).optional(),
    action: z
      .object({
        event: z.object({
          name: z.string().min(1),
          context: actionContextSchema,
        }),
      })
      .optional(),
  })
  .catchall(jsonValueSchema);

export type A2UIComponent = z.infer<typeof componentSchema>;
export type A2UIDataModel = JsonValue;

const operationSchema = z.union([
  z.object({
    version: z.literal("v0.9"),
    createSurface: z.object({
      surfaceId: z.string().min(1),
      catalogId: z.string().min(1),
      theme: z.record(z.string()).optional(),
    }),
  }),
  z.object({
    version: z.literal("v0.9"),
    updateComponents: z.object({
      surfaceId: z.string().min(1),
      components: z.array(componentSchema),
    }),
  }),
  z.object({
    version: z.literal("v0.9"),
    updateDataModel: z.object({
      surfaceId: z.string().min(1),
      path: z.string(),
      value: jsonValueSchema,
    }),
  }),
]);

export interface A2UIAction {
  readonly actionId: string;
  readonly actionType: string;
  readonly payload?: Readonly<Record<string, JsonValue>>;
  readonly surfaceId: string;
}

export interface A2UIContent {
  readonly operations: readonly unknown[];
  readonly surfaceId: string;
}

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
  fixture: ["Button", "Card", "Text"],
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
    const validation = operationSchema.safeParse(candidate);
    if (!validation.success)
      return {
        success: false,
        error: {
          code: "A2UI_OPERATION_INVALID",
          message:
            validation.error.issues[0]?.message ?? "Invalid A2UI operation.",
          operationIndex,
        },
      };
    const operation = validation.data;
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

export function createA2UIAction(
  surfaceId: string,
  component: A2UIComponent,
  dataModel: A2UIDataModel | undefined,
): A2UIAction | undefined {
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
    const resolved = resolveDynamicValue(value as JsonValue, dataModel);
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

export interface RenderedA2UIAction {
  readonly action: A2UIAction;
  readonly requiresConfirmation: boolean;
  readonly destructive: boolean;
}

export function createRenderedA2UIAction(
  surfaceId: string,
  component: A2UIComponent,
  dataModel: A2UIDataModel | undefined,
): RenderedA2UIAction | undefined {
  const action = createA2UIAction(surfaceId, component, dataModel);
  const context = component.action?.event.context;
  if (!action || context === undefined) return undefined;
  return {
    action,
    requiresConfirmation: context.requiresApproval,
    destructive: context.destructive,
  };
}
