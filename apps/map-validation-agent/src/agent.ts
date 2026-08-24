import {
  CopilotKitStateSchema,
  convertActionsToDynamicStructuredTools,
} from "@copilotkit/sdk-js/langgraph";
import { AIMessage, SystemMessage } from "@langchain/core/messages";
import {
  Annotation,
  END,
  type Runtime,
  START,
  StateGraph,
  StateSchema,
} from "@langchain/langgraph";
import {
  defaultValidationModelFactory,
  type ValidationModelFactory,
} from "./model.js";
import { createMapValidationSystemPrompt } from "./prompt.js";
import {
  loadValidationScenarioInput,
  type ValidationScenarioInput,
} from "./scenario-loader.js";

const ValidationAgentStateSchema = new StateSchema({
  ...CopilotKitStateSchema.fields,
});

export const ValidationRunContextAnnotation = Annotation.Root({
  validationScenarioId: Annotation<string>,
});

type ValidationAgentState = typeof ValidationAgentStateSchema.State;
type ValidationRunContext = typeof ValidationRunContextAnnotation.State;

const ALLOWED_FRONTEND_TOOLS = new Set([
  "focusOn",
  "highlight",
  "previewPath",
  "requestPatrolRouteSelection",
  "setLayerVisibility",
]);

/**
 * Resolves the run-scoped scenario id from the LangGraph runtime.
 *
 * Two delivery channels are legitimate for this stack:
 * - `runtime.context`: a caller passes the LangGraph `context` field directly
 *   (for example an in-process `graph.invoke(input, { context })`).
 * - `runtime.configurable`: the production channel. `@ag-ui/langgraph` 0.0.42
 *   only promotes `forwardedProps.config.configurable` keys into the LangGraph
 *   `context` field when they appear in the assistant `context_schema`, and
 *   langgraph-api reports an empty context schema for `StateSchema`-based
 *   graphs. The Workbench-sent id therefore arrives inside
 *   `config.configurable`, which LangGraph exposes as `runtime.configurable`.
 */
function resolveValidationScenarioId(
  runtime: Runtime<ValidationRunContext>,
): string {
  const scenarioId =
    runtime.context?.validationScenarioId ??
    runtime.configurable?.validationScenarioId;
  if (!scenarioId) throw new Error("VALIDATION_SCENARIO_ID_REQUIRED");
  return scenarioId;
}

interface FrontendActionLike {
  readonly name: string;
}

export interface ValidationAgentOptions {
  readonly loadScenarioInput?: (
    scenarioId: string,
  ) => Promise<ValidationScenarioInput>;
  readonly modelFactory?: ValidationModelFactory;
}

function allowedFrontendActions(
  actions: readonly FrontendActionLike[],
): FrontendActionLike[] {
  return actions.filter((action) => ALLOWED_FRONTEND_TOOLS.has(action.name));
}

export function createValidationAgentNode(
  options: ValidationAgentOptions = {},
) {
  const loadScenarioInput =
    options.loadScenarioInput ?? loadValidationScenarioInput;
  const modelFactory = options.modelFactory ?? defaultValidationModelFactory;

  return async (
    state: ValidationAgentState,
    runtime: Runtime<ValidationRunContext>,
  ) => {
    const scenarioId = resolveValidationScenarioId(runtime);
    const scenario = await loadScenarioInput(scenarioId);
    const actions = allowedFrontendActions(
      (state.copilotkit?.actions ?? []) as FrontendActionLike[],
    );
    const tools = convertActionsToDynamicStructuredTools(actions);
    const model = modelFactory().bindTools(tools);
    // The run config (callbacks, signal, metadata) propagates to the model
    // call through AsyncLocalStorage; no explicit config argument is needed.
    const response = await model.invoke([
      new SystemMessage(createMapValidationSystemPrompt(scenario)),
      ...state.messages,
    ]);
    if (!(response instanceof AIMessage))
      throw new Error("MAP_VALIDATION_MODEL_RESPONSE_INVALID");
    return { messages: [response] };
  };
}

export function createMapValidationGraph(options: ValidationAgentOptions = {}) {
  return new StateGraph(
    ValidationAgentStateSchema,
    ValidationRunContextAnnotation,
  )
    .addNode("agent", createValidationAgentNode(options))
    .addEdge(START, "agent")
    .addEdge("agent", END)
    .compile();
}

export const graph = createMapValidationGraph();
