import type { BaseLanguageModelInput } from "@langchain/core/language_models/base";
import type { BindToolsInput } from "@langchain/core/language_models/chat_models";
import type { BaseMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";

export interface ValidationModelConfig {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly model: string;
}

export interface ValidationChatModel {
  bindTools(tools: BindToolsInput[]): {
    invoke(
      input: BaseLanguageModelInput,
      config?: RunnableConfig,
    ): Promise<BaseMessage>;
  };
}

function requiredEnvironment(name: string, value: string | undefined): string {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`${name}_REQUIRED`);
  return normalized;
}

function modelBaseUrl(value: string | undefined): string {
  const normalized = requiredEnvironment("MAP_VALIDATION_LLM_BASE_URL", value);
  const url = new URL(normalized);
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new Error("MAP_VALIDATION_LLM_BASE_URL_INVALID");
  return url.toString();
}

export function loadValidationModelConfig(
  environment: NodeJS.ProcessEnv,
): ValidationModelConfig {
  return {
    apiKey: requiredEnvironment(
      "MAP_VALIDATION_LLM_API_KEY",
      environment.MAP_VALIDATION_LLM_API_KEY,
    ),
    baseUrl: modelBaseUrl(environment.MAP_VALIDATION_LLM_BASE_URL),
    model: requiredEnvironment(
      "MAP_VALIDATION_LLM_MODEL",
      environment.MAP_VALIDATION_LLM_MODEL,
    ),
  };
}

export type ValidationModelFactory = () => ValidationChatModel;

export function createValidationModel(
  config: ValidationModelConfig,
): ValidationChatModel {
  const model = new ChatOpenAI({
    apiKey: config.apiKey,
    configuration: { baseURL: config.baseUrl },
    model: config.model,
    temperature: 0,
  });
  return {
    bindTools(tools) {
      const bound = model.bindTools(tools);
      return {
        invoke: (input, runtimeConfig) => bound.invoke(input, runtimeConfig),
      };
    },
  };
}

export function defaultValidationModelFactory(): ValidationChatModel {
  return createValidationModel(loadValidationModelConfig(process.env));
}
