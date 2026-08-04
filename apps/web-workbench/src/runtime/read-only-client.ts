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

function record(input: unknown): Record<string, unknown> | undefined {
  return typeof input === "object" && input !== null && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : undefined;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function stringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : undefined;
}

export function parseRuntimeCatalogSummary(
  input: unknown,
): RuntimeCatalogSummary | undefined {
  const root = record(input);
  if (!root) return undefined;
  const catalogId = text(root.catalogId);
  const catalogVersion = text(root.catalogVersion);
  if (
    !catalogId ||
    !catalogVersion ||
    !Array.isArray(root.components) ||
    !Array.isArray(root.actions)
  )
    return undefined;
  const components = root.components.map((candidate) => {
    const value = record(candidate);
    const componentType = value && text(value.componentType);
    const displayName = value && text(value.displayName);
    const description = value && text(value.description);
    const category = value && text(value.category);
    const propsSchema = value?.propsSchema;
    const allowedActions = value && stringArray(value.allowedActions);
    return componentType &&
      displayName &&
      description &&
      category &&
      propsSchema !== undefined &&
      allowedActions
      ? {
          componentType,
          displayName,
          description,
          category,
          propsSchema,
          allowedActions,
        }
      : undefined;
  });
  const actions = root.actions.map((candidate) => {
    const value = record(candidate);
    const actionType = value && text(value.actionType);
    const description = value && text(value.description);
    return actionType &&
      description &&
      typeof value?.destructive === "boolean" &&
      typeof value.requiresConfirmation === "boolean"
      ? {
          actionType,
          description,
          destructive: value.destructive,
          requiresConfirmation: value.requiresConfirmation,
        }
      : undefined;
  });
  return components.every(Boolean) && actions.every(Boolean)
    ? {
        catalogId,
        catalogVersion,
        components: components as RuntimeCatalogSummary["components"],
        actions: actions as RuntimeCatalogSummary["actions"],
      }
    : undefined;
}

export function parseRuntimeScenarios(
  input: unknown,
): readonly RuntimeScenarioSummary[] | undefined {
  const root = record(input);
  if (!root || !Array.isArray(root.scenarios)) return undefined;
  const scenarios = root.scenarios.map((candidate) => {
    const value = record(candidate);
    const scenarioId = value && text(value.scenarioId);
    const version = value && text(value.version);
    const description = value && text(value.description);
    const examples = value && stringArray(value.examples);
    return scenarioId &&
      version &&
      description &&
      examples &&
      typeof value.available === "boolean"
      ? {
          scenarioId,
          version,
          description,
          examples,
          available: value.available,
        }
      : undefined;
  });
  return scenarios.every(Boolean)
    ? (scenarios as RuntimeScenarioSummary[])
    : undefined;
}

export async function fetchReadOnlyRuntimeData<T>(
  endpoint: string,
  parse: (input: unknown) => T | undefined,
): Promise<T> {
  const response = await fetch(endpoint, {
    headers: { accept: "application/json" },
  });
  const parsed = parse(await response.json());
  if (!response.ok || parsed === undefined)
    throw new Error("WORKBENCH_RUNTIME_READ_CONTRACT_INVALID");
  return parsed;
}
