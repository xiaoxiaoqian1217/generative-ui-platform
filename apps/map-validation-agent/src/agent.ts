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
    const scenarioId = runtime.context?.validationScenarioId;
    if (!scenarioId) throw new Error("VALIDATION_SCENARIO_ID_REQUIRED");
    const scenario = await loadScenarioInput(scenarioId);
    const actions = allowedFrontendActions(
      (state.copilotkit?.actions ?? []) as FrontendActionLike[],
    );
    const tools = convertActionsToDynamicStructuredTools(actions);
    const model = modelFactory().bindTools(tools);
    const response = await model.invoke(
      [
        new SystemMessage(createMapValidationSystemPrompt(scenario)),
        ...state.messages,
      ],
      runtime,
    );
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
