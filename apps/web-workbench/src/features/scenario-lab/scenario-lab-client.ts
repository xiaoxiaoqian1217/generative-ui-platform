/**
 * Client for the source-neutral, dev-only Scenario Lab boundary (Issue #213).
 * Scenario documents are JSON files in the repository; the dev host
 * reads/writes them and runs unsaved buffers through the real presentation
 * generation chain.
 */

export interface ScenarioLabFact {
  readonly pointer: string;
  readonly value: unknown;
}

export interface ScenarioLabEvaluationOracle {
  readonly facts: readonly ScenarioLabFact[];
}

export interface ScenarioLabDocument {
  readonly evaluationOracle: ScenarioLabEvaluationOracle;
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

export type ScenarioGenerationResult =
  | {
      readonly ok: true;
      readonly surface: Record<string, unknown>;
    }
  | { readonly ok: false; readonly error: ScenarioLabError };

export type ScenarioEvaluationResult =
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
  const body = (await readJson(await fetch(`${labBaseUrl}/scenarios`))) as {
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
  const response = await fetch(`${labBaseUrl}/scenarios/${document.name}`, {
    body: JSON.stringify({
      evaluationOracle: document.evaluationOracle,
      presentationInput: document.presentationInput,
    }),
    headers: { "content-type": "application/json" },
    method: "PUT",
  });
  await readJson(response);
}

export async function generateScenarioLabSurface(
  labBaseUrl: string,
  document: {
    readonly presentationInput: unknown;
  },
): Promise<ScenarioGenerationResult> {
  const response = await fetch(`${labBaseUrl}/generations`, {
    body: JSON.stringify(document),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  return (await readJson(response)) as ScenarioGenerationResult;
}

export async function evaluateScenarioLabSurface(
  labBaseUrl: string,
  document: {
    readonly evaluationOracle: ScenarioLabEvaluationOracle;
    readonly presentationInput: unknown;
  },
): Promise<ScenarioEvaluationResult> {
  const response = await fetch(`${labBaseUrl}/evaluations`, {
    body: JSON.stringify(document),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  return (await readJson(response)) as ScenarioEvaluationResult;
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
  const response = await fetch(`${labBaseUrl}/fixture-drafts`, {
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
