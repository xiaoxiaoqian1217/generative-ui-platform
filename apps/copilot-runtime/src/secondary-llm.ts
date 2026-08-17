import { RENDER_A2UI_TOOL_DEF } from "@ag-ui/a2ui-toolkit";

export const DEFAULT_SECONDARY_LLM_BASE_URL = "https://openrouter.ai/api/v1";
export const DEFAULT_SECONDARY_LLM_MODEL = "openai/gpt-4.1-mini";

export interface SecondaryLlmConfig {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly model: string;
}

/**
 * The host-wired Secondary LLM call required by
 * `runA2UIGenerationWithRecovery`: run the presentation model once with the
 * composed prompt (catalog schema + guidelines + business content + any
 * prior validation errors) and return its `render_a2ui` tool arguments, or
 * `null` when the model produced no tool call.
 */
export type InvokeSubagent = (
  prompt: string,
  attempt: number,
) => Promise<Record<string, unknown> | null>;

interface ChatCompletionResponse {
  readonly choices?: readonly {
    readonly message?: {
      readonly tool_calls?: readonly {
        readonly function?: {
          readonly arguments?: unknown;
          readonly name?: unknown;
        };
      }[];
    };
  }[];
}

/**
 * Minimal OpenAI-compatible wiring of the Secondary Presentation LLM.
 * The model can only answer through the catalog-constrained `render_a2ui`
 * tool; it never emits HTML / CSS / JavaScript.
 */
export function createSecondaryLlmInvokeSubagent(
  config: SecondaryLlmConfig,
  options: { readonly timeoutMs?: number } = {},
): InvokeSubagent {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const endpoint = `${config.baseUrl.replace(/\/+$/, "")}/chat/completions`;
  return async (prompt) => {
    const response = await fetch(endpoint, {
      body: JSON.stringify({
        messages: [{ content: prompt, role: "user" }],
        model: config.model,
        temperature: 0.2,
        tool_choice: {
          function: { name: RENDER_A2UI_TOOL_DEF.function.name },
          type: "function",
        },
        tools: [RENDER_A2UI_TOOL_DEF],
      }),
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json",
      },
      method: "POST",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      throw new Error(`A2UI_SECONDARY_LLM_HTTP_${response.status}`);
    }
    const body = (await response.json()) as ChatCompletionResponse;
    const toolCall = body.choices?.[0]?.message?.tool_calls?.[0];
    if (
      toolCall?.function?.name !== RENDER_A2UI_TOOL_DEF.function.name ||
      typeof toolCall.function.arguments !== "string"
    ) {
      return null;
    }
    try {
      const args = JSON.parse(toolCall.function.arguments) as unknown;
      return typeof args === "object" && args !== null
        ? (args as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  };
}
