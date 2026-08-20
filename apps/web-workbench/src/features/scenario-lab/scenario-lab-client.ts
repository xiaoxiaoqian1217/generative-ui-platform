/**
 * Client for the dev-only Scenario Lab endpoints on the CopilotKit Runtime
 * (Issue #213). Scenario documents are JSON files in the repository; the
 * Runtime reads/writes them and runs unsaved buffers through the real
 * presentation generation chain.
 */

export interface ScenarioLabFact {
  readonly pointer: string;
  readonly value: unknown;
}

export interface ScenarioLabExpectedFacts {
  readonly facts: readonly ScenarioLabFact[];
}

export interface ScenarioLabDocument {
  readonly expectedFacts: ScenarioLabExpectedFacts;
  readonly name: string;
  readonly presentationInput: unknown;
}

export interface ScenarioLabIndex {
  readonly documents: readonly ScenarioLabDocument[];
  readonly draftingAvailable: boolean;
}

export interface ScenarioLabFactCheckEntry extends ScenarioLabFact {
  readonly status: "found" | "review";
}

export interface ScenarioLabError {
  readonly code?: string;
  readonly errors?: readonly string[];
  readonly message?: string;
}

export type ScenarioRunResult =
  | {
      readonly ok: true;
      readonly factCheck: readonly ScenarioLabFactCheckEntry[];
      readonly surface: Record<string, unknown>;
    }
  | { readonly ok: false; readonly error: ScenarioLabError };

async function readJson(response: Response): Promise<unknown> {
  const body = (await response.json()) as unknown;
  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "error" in body
        ? JSON.stringify((body as { error: unknown }).error)
        : `HTTP_${response.status}`;
    throw new Error(message);
  }
  return body;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function listScenarioLabDocuments(
  labBaseUrl: string,
): Promise<ScenarioLabIndex> {
  const body = (await readJson(await fetch(labBaseUrl))) as {
    capabilities?: { drafting?: boolean };
    scenarios: ScenarioLabDocument[];
  };
  return {
    documents: body.scenarios,
    draftingAvailable: body.capabilities?.drafting === true,
  };
}

export async function saveScenarioLabDocument(
  labBaseUrl: string,
  document: ScenarioLabDocument,
): Promise<void> {
  const response = await fetch(`${labBaseUrl}/${document.name}`, {
    body: JSON.stringify({
      expectedFacts: document.expectedFacts,
      presentationInput: document.presentationInput,
    }),
    headers: { "content-type": "application/json" },
    method: "PUT",
  });
  await readJson(response);
}

export async function runScenarioLabDocument(
  labBaseUrl: string,
  document: {
    readonly expectedFacts: ScenarioLabExpectedFacts;
    readonly presentationInput: unknown;
  },
): Promise<ScenarioRunResult> {
  const response = await fetch(`${labBaseUrl}/run`, {
    body: JSON.stringify(document),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  return (await readJson(response)) as ScenarioRunResult;
}

export type ScenarioDraftResult =
  | { readonly ok: true; readonly content: Record<string, unknown> }
  | { readonly ok: false; readonly error: ScenarioLabError };

/**
 * Ask the Scenario fixture authoring adapter for a synthetic content draft.
 * It remains an unsaved buffer until a human reviews it and writes facts.
 */
export async function requestScenarioDraft(
  labBaseUrl: string,
  description: string,
  signal?: AbortSignal,
): Promise<ScenarioDraftResult> {
  const response = await fetch(`${labBaseUrl}/draft`, {
    body: JSON.stringify({ description }),
    headers: { "content-type": "application/json" },
    method: "POST",
    ...(signal === undefined ? {} : { signal }),
  });
  const body = (await response.json()) as unknown;
  if (isRecord(body) && typeof body.ok === "boolean")
    return body as ScenarioDraftResult;
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  throw new Error("SCENARIO_DRAFT_RESPONSE_INVALID");
}
