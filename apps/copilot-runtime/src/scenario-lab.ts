import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import type { Dirent } from "node:fs";
import {
  type A2uiGenerationErrorContent,
  generateA2uiSurfaceFromContent,
} from "./a2ui-generation.js";
import {
  parsePresentationInput,
  type PresentationInput,
  serializePresentationInputContent,
} from "./presentation-input.js";
import {
  type DraftScenarioFixture,
  MAX_SCENARIO_DRAFT_DESCRIPTION_LENGTH,
} from "./scenario-fixture-drafter.js";
import type { InvokeSubagent } from "./secondary-llm.js";

/**
 * Dev-only Scenario Lab endpoints (Issue #213 Workbench 表达).
 *
 * Scenario files are JSON documents living in this repository - they are the
 * single source of truth for CI and review. These endpoints let the
 * Workbench Scenarios page list, edit, run, and save exactly those files:
 * saving writes the repository file back, and running feeds an (unsaved)
 * PresentationInput buffer through the real Secondary LLM generation chain.
 * No persistence, no scenario management platform.
 */

export const SCENARIO_LAB_BASE_PATH = "/api/dev/scenario-lab";

export interface ScenarioLabOptions {
  readonly draftScenarioFixture?: DraftScenarioFixture;
  readonly invokeSubagent?: InvokeSubagent;
  readonly scenariosDir: URL;
}

interface ExpectedFact {
  readonly pointer: string;
  readonly value: unknown;
}

interface EvaluationOracle {
  readonly facts: readonly ExpectedFact[];
}

interface ScenarioDocument {
  readonly evaluationOracle: EvaluationOracle;
  readonly name: string;
  readonly presentationInput: unknown;
}

type FactCheckStatus = "found" | "review";

interface FactCheckEntry extends ExpectedFact {
  readonly status: FactCheckStatus;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json" },
    status,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseEvaluationOracle(
  value: unknown,
  options: { readonly allowEmpty?: boolean } = {},
): EvaluationOracle {
  if (!isRecord(value) || !Array.isArray(value.facts)) {
    throw new Error("EVALUATION_ORACLE_INVALID");
  }
  const facts = value.facts.map((fact) => {
    if (!isRecord(fact) || typeof fact.pointer !== "string") {
      throw new Error("EVALUATION_ORACLE_INVALID");
    }
    return { pointer: fact.pointer, value: fact.value };
  });
  if (facts.length === 0 && options.allowEmpty !== true)
    throw new Error("EVALUATION_ORACLE_REQUIRED");
  return { facts };
}

/**
 * Representation-tolerant fact probe: a fact counts as `found` when its
 * value appears anywhere in the generated surface (data model or literal
 * props), as a number or as its string form. Representation changes such as
 * 0.938 -> "93.8%" are flagged `review` for manual confirmation instead of
 * being auto-judged - the LLM may re-express but must not drop or invent.
 */
function deepContains(node: unknown, value: unknown): boolean {
  if (node === value) return true;
  if (
    (typeof node === "string" || typeof node === "number") &&
    (typeof value === "string" || typeof value === "number") &&
    String(node) === String(value)
  )
    return true;
  if (Array.isArray(node))
    return node.some((item) => deepContains(item, value));
  if (isRecord(node))
    return Object.values(node).some((item) => deepContains(item, value));
  return false;
}

function scenarioFileUrl(scenariosDir: URL, name: string, file: string): URL {
  return new URL(`${name}/${file}`, scenariosDir);
}

async function readScenario(
  scenariosDir: URL,
  name: string,
): Promise<ScenarioDocument | undefined> {
  try {
    const [presentationInputRaw, evaluationOracleRaw] = await Promise.all([
      readFile(
        scenarioFileUrl(scenariosDir, name, "presentation-input.json"),
        "utf8",
      ),
      readFile(
        scenarioFileUrl(scenariosDir, name, "expected-facts.json"),
        "utf8",
      ),
    ]);
    return {
      evaluationOracle: JSON.parse(evaluationOracleRaw) as EvaluationOracle,
      name,
      presentationInput: JSON.parse(presentationInputRaw) as unknown,
    };
  } catch {
    return undefined;
  }
}

const SCENARIO_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

async function listScenarios(scenariosDir: URL): Promise<ScenarioDocument[]> {
  let entries: Dirent[];
  try {
    entries = await readdir(scenariosDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const scenarios: ScenarioDocument[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !SCENARIO_NAME_PATTERN.test(entry.name))
      continue;
    const scenario = await readScenario(scenariosDir, entry.name);
    if (scenario !== undefined) scenarios.push(scenario);
  }
  return scenarios.sort((a, b) => a.name.localeCompare(b.name));
}

async function saveScenario(
  scenariosDir: URL,
  name: string,
  document: {
    evaluationOracle: EvaluationOracle;
    presentationInput: unknown;
  },
): Promise<void> {
  const dir = new URL(`${name}/`, scenariosDir);
  await mkdir(dir, { recursive: true });
  await Promise.all([
    writeFile(
      scenarioFileUrl(scenariosDir, name, "presentation-input.json"),
      `${JSON.stringify(document.presentationInput, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      scenarioFileUrl(scenariosDir, name, "expected-facts.json"),
      `${JSON.stringify(document.evaluationOracle, null, 2)}\n`,
      "utf8",
    ),
  ]);
}

type ScenarioSurfaceGeneration =
  | { readonly ok: true; readonly surface: Record<string, unknown> }
  | {
      readonly error: A2uiGenerationErrorContent;
      readonly ok: false;
      readonly status?: number;
    };

async function generateScenarioSurface(
  invokeSubagent: InvokeSubagent | undefined,
  body: unknown,
): Promise<ScenarioSurfaceGeneration> {
  if (!isRecord(body)) {
    return {
      error: {
        code: "A2UI_GENERATION_FAILED",
        message: "SCENARIO_GENERATION_BODY_INVALID",
      },
      ok: false,
      status: 400,
    };
  }
  let input: PresentationInput;
  try {
    input = parsePresentationInput(body.presentationInput);
  } catch (error) {
    return {
      error: {
        code: "A2UI_GENERATION_FAILED",
        message:
          error instanceof Error
            ? `PRESENTATION_INPUT_INVALID: ${error.message}`
            : "PRESENTATION_INPUT_INVALID",
      },
      ok: false,
      status: 400,
    };
  }
  if (invokeSubagent === undefined) {
    const error: A2uiGenerationErrorContent = {
      code: "A2UI_GENERATION_UNAVAILABLE",
      message:
        "A2UI Secondary LLM is not configured (A2UI_SECONDARY_LLM_API_KEY).",
    };
    return { error, ok: false };
  }
  const generation = await generateA2uiSurfaceFromContent(
    serializePresentationInputContent(input),
    invokeSubagent,
  ).catch(
    (error: unknown): { ok: false; error: A2uiGenerationErrorContent } => ({
      error: {
        code: "A2UI_GENERATION_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Dynamic A2UI generation failed.",
      },
      ok: false,
    }),
  );
  if (!generation.ok) return generation;
  return {
    ok: true,
    surface: JSON.parse(generation.envelope) as Record<string, unknown>,
  };
}

async function generateScenario(
  invokeSubagent: InvokeSubagent | undefined,
  body: unknown,
): Promise<Response> {
  const generation = await generateScenarioSurface(invokeSubagent, body);
  return json(
    generation.ok
      ? { ok: true, surface: generation.surface }
      : { error: generation.error, ok: false },
    generation.ok ? 200 : generation.status,
  );
}

async function evaluateScenario(
  invokeSubagent: InvokeSubagent | undefined,
  body: unknown,
): Promise<Response> {
  if (!isRecord(body)) {
    return json({ error: "SCENARIO_EVALUATION_BODY_INVALID" }, 400);
  }
  let evaluationOracle: EvaluationOracle;
  try {
    evaluationOracle = parseEvaluationOracle(body.evaluationOracle, {
      allowEmpty: true,
    });
  } catch {
    return json({ error: "EVALUATION_ORACLE_INVALID" }, 400);
  }
  const generation = await generateScenarioSurface(invokeSubagent, body);
  if (!generation.ok) {
    return json({ error: generation.error, ok: false }, generation.status);
  }
  const factCheck: FactCheckEntry[] = evaluationOracle.facts.map((fact) => ({
    ...fact,
    status: deepContains(generation.surface, fact.value) ? "found" : "review",
  }));
  return json({ factCheck, ok: true, surface: generation.surface });
}

async function draftScenario(
  draftScenarioFixture: DraftScenarioFixture | undefined,
  body: unknown,
  signal: AbortSignal,
): Promise<Response> {
  if (
    !isRecord(body) ||
    typeof body.description !== "string" ||
    body.description.trim().length === 0
  )
    return json({ error: "SCENARIO_DRAFT_DESCRIPTION_REQUIRED" }, 400);
  if (body.description.length > MAX_SCENARIO_DRAFT_DESCRIPTION_LENGTH)
    return json({ error: "SCENARIO_DRAFT_DESCRIPTION_TOO_LONG" }, 400);
  if (draftScenarioFixture === undefined) {
    const error = {
      code: "SCENARIO_DRAFT_UNAVAILABLE",
      message:
        "Scenario fixture drafting is not configured (SCENARIO_DRAFT_LLM_API_KEY).",
    };
    return json({ error, ok: false }, 503);
  }
  try {
    const content = await draftScenarioFixture(body.description.trim(), {
      signal,
    });
    return json({ content, ok: true });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      return json(
        {
          error: { code: "SCENARIO_DRAFT_CANCELLED" },
          ok: false,
        },
        499,
      );
    return json(
      {
        error: {
          code: "SCENARIO_DRAFT_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Scenario draft generation failed.",
        },
        ok: false,
      },
      502,
    );
  }
}

/**
 * Returns a handler for the Scenario Lab endpoints, or `undefined` when the
 * request path does not belong to the lab so the caller can fall through to
 * the CopilotKit runtime handler.
 */
export function createScenarioLabHandler(options: ScenarioLabOptions) {
  const basePath = SCENARIO_LAB_BASE_PATH;
  const scenariosPath = `${basePath}/scenarios`;
  return async (request: Request): Promise<Response | undefined> => {
    const url = new URL(request.url);
    const { pathname } = url;
    if (pathname !== basePath && !pathname.startsWith(`${basePath}/`))
      return undefined;

    if (pathname === scenariosPath && request.method === "GET") {
      return json({
        capabilities: {
          drafting: options.draftScenarioFixture !== undefined,
        },
        scenarios: await listScenarios(options.scenariosDir),
      });
    }

    if (pathname === `${basePath}/generations` && request.method === "POST") {
      return generateScenario(options.invokeSubagent, await request.json());
    }

    if (pathname === `${basePath}/evaluations` && request.method === "POST") {
      return evaluateScenario(options.invokeSubagent, await request.json());
    }

    if (
      pathname === `${basePath}/fixture-drafts` &&
      request.method === "POST"
    ) {
      return draftScenario(
        options.draftScenarioFixture,
        await request.json(),
        request.signal,
      );
    }

    const saveMatch = pathname.slice(scenariosPath.length + 1);
    if (
      pathname.startsWith(`${scenariosPath}/`) &&
      request.method === "PUT" &&
      SCENARIO_NAME_PATTERN.test(saveMatch)
    ) {
      const body = (await request.json()) as unknown;
      if (!isRecord(body)) return json({ error: "SCENARIO_SAVE_INVALID" }, 400);
      try {
        parsePresentationInput(body.presentationInput);
        const evaluationOracle = parseEvaluationOracle(body.evaluationOracle);
        await saveScenario(options.scenariosDir, saveMatch, {
          evaluationOracle,
          presentationInput: body.presentationInput,
        });
      } catch (error) {
        return json(
          {
            error:
              error instanceof Error ? error.message : "SCENARIO_SAVE_INVALID",
          },
          400,
        );
      }
      return json({ ok: true });
    }

    return json({ error: "SCENARIO_LAB_NOT_FOUND" }, 404);
  };
}
