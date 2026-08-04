import type { ComponentCatalog } from "@generative-ui/component-catalog-schema";

export interface RuntimeCatalogSummary {
  readonly catalogId: string;
  readonly catalogVersion: string;
  readonly components: readonly {
    readonly componentType: string;
    readonly displayName: string;
    readonly description: string;
    readonly category: string;
    readonly propsSchema: unknown;
    readonly allowedActions: readonly string[];
  }[];
  readonly actions: readonly {
    readonly actionType: string;
    readonly description: string;
    readonly destructive: boolean;
    readonly requiresConfirmation: boolean;
  }[];
}

export interface RuntimeScenarioSummary {
  readonly scenarioId: string;
  readonly version: string;
  readonly description: string;
  readonly examples: readonly string[];
  readonly available: boolean;
}

export function createRuntimeCatalogSummary(
  catalog: ComponentCatalog,
): RuntimeCatalogSummary {
  return Object.freeze({
    catalogId: catalog.catalogId,
    catalogVersion: catalog.catalogVersion,
    components: Object.freeze(
      catalog.components.map((component) =>
        Object.freeze({
          componentType: component.componentType,
          displayName: component.displayName,
          description: component.description,
          category: component.category,
          propsSchema: component.propsSchema,
          allowedActions: Object.freeze([...component.allowedActions]),
        }),
      ),
    ),
    actions: Object.freeze(
      catalog.actions.map((action) =>
        Object.freeze({
          actionType: action.actionType,
          description: action.description,
          destructive: action.destructive,
          requiresConfirmation: action.requiresApproval,
        }),
      ),
    ),
  });
}

export function createRuntimeScenarioSummaries(): readonly RuntimeScenarioSummary[] {
  return Object.freeze([
    Object.freeze({
      scenarioId: "device-status",
      version: "1.0",
      description: "展示设备状态的参考业务场景。",
      examples: Object.freeze(["查看当前可用的无人机和无人车"]),
      available: true,
    }),
    Object.freeze({
      scenarioId: "patrol-plan",
      version: "1.0",
      description: "展示多方案与确认型 Action 的参考业务场景。",
      examples: Object.freeze(["使用一架无人机和两台无人车巡查 A 区域"]),
      available: true,
    }),
  ]);
}
