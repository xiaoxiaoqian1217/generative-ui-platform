/**
 * Client for the dev-only Scenario Lab endpoints on the CopilotKit Runtime
 * (Issue #213). Scenario documents are JSON files in the repository; the
 * Runtime reads/writes them and runs unsaved buffers through the real
 * Secondary LLM generation chain.
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

export async function listScenarioLabDocuments(
  labBaseUrl: string,
): Promise<readonly ScenarioLabDocument[]> {
  const body = (await readJson(await fetch(labBaseUrl))) as {
    scenarios: ScenarioLabDocument[];
  };
  return body.scenarios;
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
