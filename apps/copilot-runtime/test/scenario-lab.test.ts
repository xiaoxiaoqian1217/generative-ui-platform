import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  createScenarioLabHandler,
  type InvokeSubagent,
  SCENARIO_LAB_BASE_PATH,
} from "../src/index.js";

const tempDirs: string[] = [];
const SCENARIOS_PATH = `${SCENARIO_LAB_BASE_PATH}/scenarios`;
const GENERATIONS_PATH = `${SCENARIO_LAB_BASE_PATH}/generations`;
const EVALUATIONS_PATH = `${SCENARIO_LAB_BASE_PATH}/evaluations`;
const FIXTURE_DRAFTS_PATH = `${SCENARIO_LAB_BASE_PATH}/fixture-drafts`;

async function tempScenariosDir(): Promise<URL> {
  const dir = await mkdtemp(join(tmpdir(), "scenario-lab-"));
  tempDirs.push(dir);
  return pathToFileURL(`${dir}/`);
}

const summaryInput = {
  content: {
    kind: "structured",
    mediaType: "application/json",
    value: { failed: 8, successRate: 0.938, total: 128 },
  },
  context: { allowedActions: [] },
  lifecycle: "stable",
  provenance: [],
};

const summaryFacts = {
  facts: [
    { pointer: "/total", value: 128 },
    { pointer: "/failed", value: 8 },
  ],
};

const faithfulInvokeSubagent: InvokeSubagent = async () => ({
  surfaceId: "scenario-summary",
  components: [
    { id: "root", component: "Card", child: "metric" },
    {
      id: "metric",
      component: "Metric",
      label: "总数",
      value: { path: "/total" },
    },
  ],
  data: { failed: 8, total: 128 },
});

function labRequest(path: string, init: RequestInit = {}): Request {
  return new Request(`http://runtime.example.test${path}`, init);
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { force: true, recursive: true })),
  );
});

describe("Scenario Lab endpoints", () => {
  it("falls through for non-lab paths", async () => {
    const handler = createScenarioLabHandler({
      scenariosDir: await tempScenariosDir(),
    });
    const response = await handler(
      labRequest("http://runtime.example.test/api/copilotkit/info"),
    );
    expect(response).toBeUndefined();
  });

  it("round-trips a scenario document through save and list", async () => {
    const scenariosDir = await tempScenariosDir();
    const handler = createScenarioLabHandler({ scenariosDir });

    const saveResponse = await handler(
      labRequest(`${SCENARIOS_PATH}/summary`, {
        body: JSON.stringify({
          evaluationOracle: summaryFacts,
          presentationInput: summaryInput,
        }),
        method: "PUT",
      }),
    );
    expect(saveResponse?.status).toBe(200);

    const saved = JSON.parse(
      await readFile(
        join(tempDirs[0] ?? "", "summary", "presentation-input.json"),
        "utf8",
      ),
    );
    expect(saved).toEqual(summaryInput);

    const listResponse = await handler(labRequest(SCENARIOS_PATH));
    const list = (await listResponse?.json()) as {
      scenarios: Array<{ name: string }>;
    };
    expect(list.scenarios.map((scenario) => scenario.name)).toEqual([
      "summary",
    ]);
  });

  it("rejects saving an invalid PresentationInput or scenario name", async () => {
    const handler = createScenarioLabHandler({
      scenariosDir: await tempScenariosDir(),
    });

    const invalidInput = await handler(
      labRequest(`${SCENARIOS_PATH}/summary`, {
        body: JSON.stringify({
          evaluationOracle: summaryFacts,
          presentationInput: { content: { kind: "mystery" } },
        }),
        method: "PUT",
      }),
    );
    expect(invalidInput?.status).toBe(400);

    const missingFacts = await handler(
      labRequest(`${SCENARIOS_PATH}/summary`, {
        body: JSON.stringify({
          evaluationOracle: { facts: [] },
          presentationInput: summaryInput,
        }),
        method: "PUT",
      }),
    );
    expect(missingFacts?.status).toBe(400);
    expect(await missingFacts?.json()).toEqual({
      error: "EVALUATION_ORACLE_REQUIRED",
    });

    const invalidName = await handler(
      labRequest(`${SCENARIOS_PATH}/Summary_Bad`, {
        body: JSON.stringify({
          evaluationOracle: summaryFacts,
          presentationInput: summaryInput,
        }),
        method: "PUT",
      }),
    );
    expect(invalidName?.status).toBe(404);
  });

  it("generates a surface without accepting an evaluation oracle", async () => {
    const handler = createScenarioLabHandler({
      invokeSubagent: faithfulInvokeSubagent,
      scenariosDir: await tempScenariosDir(),
    });

    const response = await handler(
      labRequest(GENERATIONS_PATH, {
        body: JSON.stringify({ presentationInput: summaryInput }),
        method: "POST",
      }),
    );
    const body = (await response?.json()) as {
      ok: boolean;
      surface: { a2ui_operations: unknown[] };
    };

    expect(body.ok).toBe(true);
    expect(body.surface.a2ui_operations.length).toBeGreaterThan(0);
    expect(body).not.toHaveProperty("factCheck");
  });

  it("evaluates generated surface fidelity against a separate oracle", async () => {
    const handler = createScenarioLabHandler({
      invokeSubagent: faithfulInvokeSubagent,
      scenariosDir: await tempScenariosDir(),
    });

    const response = await handler(
      labRequest(EVALUATIONS_PATH, {
        body: JSON.stringify({
          evaluationOracle: summaryFacts,
          presentationInput: summaryInput,
        }),
        method: "POST",
      }),
    );
    const body = (await response?.json()) as {
      factCheck: Array<{ pointer: string; status: string }>;
      ok: boolean;
      surface: { a2ui_operations: unknown[] };
    };

    expect(body.ok).toBe(true);
    expect(body.factCheck).toEqual([
      { pointer: "/total", status: "found", value: 128 },
      { pointer: "/failed", status: "found", value: 8 },
    ]);
  });

  it("flags facts the generated surface does not carry as review", async () => {
    const handler = createScenarioLabHandler({
      invokeSubagent: faithfulInvokeSubagent,
      scenariosDir: await tempScenariosDir(),
    });

    const response = await handler(
      labRequest(EVALUATIONS_PATH, {
        body: JSON.stringify({
          evaluationOracle: {
            facts: [{ pointer: "/successRate", value: 0.938 }],
          },
          presentationInput: summaryInput,
        }),
        method: "POST",
      }),
    );
    const body = (await response?.json()) as {
      factCheck: Array<{ status: string }>;
    };
    expect(body.factCheck).toEqual([
      { pointer: "/successRate", status: "review", value: 0.938 },
    ]);
  });

  it("reports unavailability when the Secondary LLM is not configured", async () => {
    const handler = createScenarioLabHandler({
      scenariosDir: await tempScenariosDir(),
    });

    const response = await handler(
      labRequest(GENERATIONS_PATH, {
        body: JSON.stringify({ presentationInput: summaryInput }),
        method: "POST",
      }),
    );
    const body = (await response?.json()) as {
      error: { code: string };
      ok: boolean;
    };
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("A2UI_GENERATION_UNAVAILABLE");
  });

  it("rejects an invalid PresentationInput before generation", async () => {
    const handler = createScenarioLabHandler({
      invokeSubagent: faithfulInvokeSubagent,
      scenariosDir: await tempScenariosDir(),
    });

    const response = await handler(
      labRequest(GENERATIONS_PATH, {
        body: JSON.stringify({ presentationInput: { content: null } }),
        method: "POST",
      }),
    );
    expect(response?.status).toBe(400);
  });

  it("drafts scenario content from a natural language description", async () => {
    const handler = createScenarioLabHandler({
      draftScenarioFixture: async (description) => ({
        description,
        failed: 1,
        total: 3,
      }),
      scenariosDir: await tempScenariosDir(),
    });

    const response = await handler(
      labRequest(FIXTURE_DRAFTS_PATH, {
        body: JSON.stringify({ description: "三台设备的巡检结果" }),
        method: "POST",
      }),
    );
    const body = (await response?.json()) as {
      content: Record<string, unknown>;
      ok: boolean;
    };

    expect(body.ok).toBe(true);
    expect(body.content).toMatchObject({ failed: 1, total: 3 });
  });

  it("rejects drafting without a description or without a configured LLM", async () => {
    const scenariosDir = await tempScenariosDir();
    const withDrafter = createScenarioLabHandler({
      draftScenarioFixture: async () => ({ failed: 1, ok: 2, total: 3 }),
      scenariosDir,
    });
    const missingDescription = await withDrafter(
      labRequest(FIXTURE_DRAFTS_PATH, {
        body: JSON.stringify({ description: "   " }),
        method: "POST",
      }),
    );
    expect(missingDescription?.status).toBe(400);

    const withoutDrafter = createScenarioLabHandler({ scenariosDir });
    const unavailable = await withoutDrafter(
      labRequest(FIXTURE_DRAFTS_PATH, {
        body: JSON.stringify({ description: "巡检结果" }),
        method: "POST",
      }),
    );
    const body = (await unavailable?.json()) as {
      error: { code: string };
      ok: boolean;
    };
    expect(unavailable?.status).toBe(503);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("SCENARIO_DRAFT_UNAVAILABLE");
  });

  it("maps fixture authoring failures without using A2UI error semantics", async () => {
    const handler = createScenarioLabHandler({
      draftScenarioFixture: async () => {
        throw new Error("SCENARIO_DRAFT_LLM_OUTPUT_NOT_JSON");
      },
      scenariosDir: await tempScenariosDir(),
    });

    const response = await handler(
      labRequest(FIXTURE_DRAFTS_PATH, {
        body: JSON.stringify({ description: "巡检结果" }),
        method: "POST",
      }),
    );
    const body = (await response?.json()) as {
      error: { code: string; message: string };
      ok: boolean;
    };

    expect(response?.status).toBe(502);
    expect(body).toEqual({
      error: {
        code: "SCENARIO_DRAFT_FAILED",
        message: "SCENARIO_DRAFT_LLM_OUTPUT_NOT_JSON",
      },
      ok: false,
    });
  });
});
