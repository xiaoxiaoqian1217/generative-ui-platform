import { readFile } from "node:fs/promises";
import { z } from "zod";

const scenarioIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*-v[1-9][0-9]*$/);

const mapTargetRefSchema = z
  .object({
    featureId: z.string().min(1),
    layerId: z.string().min(1).optional(),
  })
  .strict();

const mapLayerRefSchema = z.object({ layerId: z.string().min(1) }).strict();

const mapTargetSchema = z.discriminatedUnion("kind", [
  z
    .object({
      id: z.string().min(1),
      kind: z.literal("feature"),
      label: z.string().min(1),
      ref: mapTargetRefSchema,
    })
    .strict(),
  z
    .object({
      id: z.string().min(1),
      kind: z.literal("layer"),
      label: z.string().min(1),
      ref: mapLayerRefSchema,
    })
    .strict(),
]);

const businessFactSchema = z.discriminatedUnion("kind", [
  z
    .object({
      id: z.string().min(1),
      kind: z.literal("statement"),
      statement: z.string().min(1),
    })
    .strict(),
  z
    .object({
      id: z.string().min(1),
      kind: z.literal("route-candidate"),
      label: z.string().min(1),
      mapTargetId: z.string().min(1),
      optionId: z.string().min(1),
      reasonable: z.literal(true),
      summary: z.string().min(1),
    })
    .strict(),
]);

export const validationScenarioInputSchema = z
  .object({
    facts: z.array(businessFactSchema).min(1),
    mapTargets: z.array(mapTargetSchema).min(1),
    scenarioId: scenarioIdSchema,
    userGoal: z.string().min(1),
    version: z.string().regex(/^[1-9][0-9]*$/),
  })
  .strict();

const validationScenarioSchema = z
  .object({
    expected: z
      .object({
        expectedInteraction: z.enum(["act", "consult", "report-gap"]),
        forbiddenBehaviors: z.array(z.string().min(1)),
        requiredCapabilities: z.array(z.string().min(1)),
      })
      .strict(),
    input: validationScenarioInputSchema,
  })
  .strict();

export type ValidationScenario = z.infer<typeof validationScenarioSchema>;
export type ValidationScenarioInput = z.infer<
  typeof validationScenarioInputSchema
>;

export interface ScenarioLoaderOptions {
  readonly scenariosDir?: URL;
}

const DEFAULT_SCENARIOS_DIR = new URL("../scenarios/", import.meta.url);

export async function loadValidationScenario(
  scenarioId: string,
  options: ScenarioLoaderOptions = {},
): Promise<ValidationScenario> {
  const parsedId = scenarioIdSchema.safeParse(scenarioId);
  if (!parsedId.success) throw new Error("VALIDATION_SCENARIO_ID_INVALID");
  const scenariosDir = options.scenariosDir ?? DEFAULT_SCENARIOS_DIR;
  let content: string;
  try {
    content = await readFile(
      new URL(`${parsedId.data}.json`, scenariosDir),
      "utf8",
    );
  } catch {
    throw new Error("VALIDATION_SCENARIO_NOT_FOUND");
  }
  let document: unknown;
  try {
    document = JSON.parse(content) as unknown;
  } catch {
    throw new Error("VALIDATION_SCENARIO_JSON_INVALID");
  }
  const parsed = validationScenarioSchema.safeParse(document);
  if (!parsed.success) throw new Error("VALIDATION_SCENARIO_INVALID");
  if (parsed.data.input.scenarioId !== parsedId.data)
    throw new Error("VALIDATION_SCENARIO_ID_MISMATCH");
  return parsed.data;
}

export async function loadValidationScenarioInput(
  scenarioId: string,
  options: ScenarioLoaderOptions = {},
): Promise<ValidationScenarioInput> {
  const scenario = await loadValidationScenario(scenarioId, options);
  return scenario.input;
}
