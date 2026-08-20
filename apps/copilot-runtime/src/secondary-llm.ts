import { RENDER_A2UI_TOOL_DEF } from "@ag-ui/a2ui-toolkit";

export const DEFAULT_SECONDARY_LLM_BASE_URL = "https://openrouter.ai/api/v1";
export const DEFAULT_SECONDARY_LLM_MODEL = "openai/gpt-4.1-mini";
export const DEFAULT_SECONDARY_LLM_TIMEOUT_MS = 90_000;

export interface SecondaryLlmConfig {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly model: string;
  readonly timeoutMs?: number;
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
  const timeoutMs =
    options.timeoutMs ?? config.timeoutMs ?? DEFAULT_SECONDARY_LLM_TIMEOUT_MS;
  const endpoint = `${config.baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const send = (prompt: string, toolChoice: unknown) =>
    fetch(endpoint, {
      body: JSON.stringify({
        messages: [{ content: prompt, role: "user" }],
        model: config.model,
        temperature: 0.2,
        ...(toolChoice === undefined ? {} : { tool_choice: toolChoice }),
        tools: [RENDER_A2UI_TOOL_DEF],
      }),
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json",
      },
      method: "POST",
      signal: AbortSignal.timeout(timeoutMs),
    });
  return async (prompt) => {
    let response = await send(prompt, {
      function: { name: RENDER_A2UI_TOOL_DEF.function.name },
      type: "function",
    });
    if (response.status === 400) {
      // Some OpenAI-compatible providers (e.g. reasoning-mode endpoints)
      // reject a forced `tool_choice` object; degrade to "auto" only when
      // the provider error explicitly names tool_choice.
      const detail = await response.text();
      if (!detail.includes("tool_choice")) {
        throw new Error(`A2UI_SECONDARY_LLM_HTTP_400 ${detail.slice(0, 200)}`);
      }
      response = await send(prompt, "auto");
    }
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
