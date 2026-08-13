import type { AGUIMock } from "@copilotkit/aimock";
import { buildTextResponse } from "@copilotkit/aimock/agui";

export function registerEchoScenario(mock: AGUIMock): void {
  mock.onMessage(/^(?:hello|echo|连接测试)$/i, "AG-UI mock is connected.");
  mock.onMessage(
    /(?:Markdown|恢复后的结果)/i,
    "## Agent online\n\n**AG-UI Markdown rendered safely.** <script>window.__unsafe = true</script>",
  );
  mock.onMessage(/A2UI/i, "A2UI capability is frozen for a later phase.");
  mock.onPredicate(
    (input) =>
      input.messages?.at(-1)?.role === "tool" &&
      String(input.messages.at(-1)?.content).includes("frontend-tool"),
    buildTextResponse("Workbench Frontend Tool is connected."),
  );
  mock.onToolCall(/call frontend status tool/i, "show_workbench_status", "{}");
  mock.onMessage(/slow response/i, "Response completed.", { delayMs: 2_000 });
  mock.onMessage(/timeout then retry/i, "Response completed.");
}
