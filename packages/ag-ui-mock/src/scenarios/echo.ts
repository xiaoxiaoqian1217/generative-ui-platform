import type { AgUiMockScenario } from "./types.js";
import { textEvents, textFromLatestUserMessage } from "./types.js";

export const echoScenario: AgUiMockScenario = {
  description:
    "Echoes the latest user message using standard AG-UI text events.",
  name: "echo",
  events(input) {
    return textEvents(input, textFromLatestUserMessage(input));
  },
};
