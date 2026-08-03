import {
  createOpenAICompatiblePresentationModelAdapter,
  type OpenAICompatiblePresentationModelAdapterDependencies,
  type PresentationModelProvider,
  PresentationModelProviderConfigurationError,
  type PresentationModelProviderRegistration,
} from "./openai-compatible-model-adapter.js";
import type { ModelAdapter } from "./presentation-router.js";

export const BUILT_IN_OPENAI_COMPATIBLE_PROVIDER_BASE_URLS = Object.freeze({
  kimi: "https://api.moonshot.cn/v1",
  doubao: "https://ark.cn-beijing.volces.com/api/v3",
  glm: "https://open.bigmodel.cn/api/paas/v4",
  qwen: "https://dashscope.aliyuncs.com/compatible-mode/v1",
} as const satisfies Record<
  Exclude<PresentationModelProvider, "openai-compatible">,
  string
>);

export interface PresentationModelProviderRegistrationSummary {
  readonly registrationId: string;
  readonly provider: PresentationModelProvider;
  readonly modelName: string;
}

export interface PresentationModelProviderRegistry {
  list(): readonly PresentationModelProviderRegistrationSummary[];
  resolve(registrationId: string): ModelAdapter;
}

export class PresentationModelProviderNotRegisteredError extends Error {
  readonly code = "PRESENTATION_MODEL_PROVIDER_NOT_REGISTERED";

  constructor() {
    super("Presentation Model Provider is not registered.");
    this.name = "PresentationModelProviderNotRegisteredError";
  }
}

function defaultBaseUrl(
  provider: PresentationModelProvider,
): string | undefined {
  return provider === "openai-compatible"
    ? undefined
    : BUILT_IN_OPENAI_COMPATIBLE_PROVIDER_BASE_URLS[provider];
}

function snapshotRegistration(
  input: PresentationModelProviderRegistration,
): Readonly<PresentationModelProviderRegistration> {
  try {
    const registrationId = input.registrationId;
    const provider = input.provider;
    const modelName = input.modelName;
    const baseUrl = input.baseUrl;
    const endpointId = input.endpointId;
    const apiKey = input.apiKey;
    return Object.freeze({
      registrationId,
      provider,
      modelName,
      apiKey,
      ...(baseUrl === undefined ? {} : { baseUrl }),
      ...(endpointId === undefined ? {} : { endpointId }),
    });
  } catch {
    throw new PresentationModelProviderConfigurationError();
  }
}

export function createPresentationModelProviderRegistry(
  registrations: readonly PresentationModelProviderRegistration[],
  dependencies: OpenAICompatiblePresentationModelAdapterDependencies = {},
): PresentationModelProviderRegistry {
  const adapters = new Map<string, ModelAdapter>();
  const summaries: PresentationModelProviderRegistrationSummary[] = [];

  try {
    for (const registration of registrations) {
      const snapshot = snapshotRegistration(registration);
      if (adapters.has(snapshot.registrationId)) {
        throw new PresentationModelProviderConfigurationError();
      }
      const resolvedBaseUrl =
        snapshot.baseUrl ?? defaultBaseUrl(snapshot.provider);
      const resolvedRegistration: PresentationModelProviderRegistration = {
        registrationId: snapshot.registrationId,
        provider: snapshot.provider,
        modelName: snapshot.modelName,
        apiKey: snapshot.apiKey,
        ...(resolvedBaseUrl === undefined ? {} : { baseUrl: resolvedBaseUrl }),
        ...(snapshot.endpointId === undefined
          ? {}
          : { endpointId: snapshot.endpointId }),
      };
      adapters.set(
        snapshot.registrationId,
        createOpenAICompatiblePresentationModelAdapter(
          resolvedRegistration,
          dependencies,
        ),
      );
      summaries.push(
        Object.freeze({
          registrationId: snapshot.registrationId,
          provider: snapshot.provider,
          modelName: snapshot.modelName,
        }),
      );
    }
  } catch (caught) {
    if (caught instanceof PresentationModelProviderConfigurationError) {
      throw caught;
    }
    throw new PresentationModelProviderConfigurationError();
  }

  summaries.sort((left, right) =>
    left.registrationId < right.registrationId
      ? -1
      : left.registrationId > right.registrationId
        ? 1
        : 0,
  );
  const stableSummaries = Object.freeze([...summaries]);

  return Object.freeze({
    list: () => stableSummaries,
    resolve(registrationId: string): ModelAdapter {
      const adapter = adapters.get(registrationId);
      if (adapter === undefined) {
        throw new PresentationModelProviderNotRegisteredError();
      }
      return adapter;
    },
  });
}
