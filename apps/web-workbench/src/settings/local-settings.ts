export interface WorkbenchLocalSettings {
  readonly runtimeHostUrl?: string;
  readonly requestTimeoutMs: number;
  readonly showDebugDetails: boolean;
}

export const WORKBENCH_LOCAL_SETTINGS_KEY =
  "generative-ui.workbench.settings.v1";
const DEFAULT_SETTINGS: WorkbenchLocalSettings = Object.freeze({
  requestTimeoutMs: 30_000,
  showDebugDetails: false,
});

function validRuntimeHostUrl(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  try {
    const url = new URL(value);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username !== "" ||
      url.password !== ""
    )
      return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

function parse(value: unknown): WorkbenchLocalSettings {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return DEFAULT_SETTINGS;
  const record = value as Record<string, unknown>;
  const timeout = record.requestTimeoutMs;
  const runtimeHostUrl =
    typeof record.runtimeHostUrl === "string"
      ? validRuntimeHostUrl(record.runtimeHostUrl)
      : undefined;
  return {
    ...(runtimeHostUrl === undefined ? {} : { runtimeHostUrl }),
    requestTimeoutMs:
      typeof timeout === "number" &&
      Number.isSafeInteger(timeout) &&
      timeout >= 1_000 &&
      timeout <= 300_000
        ? timeout
        : DEFAULT_SETTINGS.requestTimeoutMs,
    showDebugDetails: record.showDebugDetails === true,
  };
}

export function loadWorkbenchLocalSettings(
  storage: Storage,
): WorkbenchLocalSettings {
  const raw = storage.getItem(WORKBENCH_LOCAL_SETTINGS_KEY);
  if (raw === null) return DEFAULT_SETTINGS;
  try {
    return parse(JSON.parse(raw) as unknown);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveWorkbenchLocalSettings(
  storage: Storage,
  value: WorkbenchLocalSettings,
): WorkbenchLocalSettings {
  const normalized = parse(value);
  storage.setItem(WORKBENCH_LOCAL_SETTINGS_KEY, JSON.stringify(normalized));
  return normalized;
}
