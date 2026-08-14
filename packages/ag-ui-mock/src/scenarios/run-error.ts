import { randomUUID } from "node:crypto";
import type { AGUIMock } from "@copilotkit/aimock";
import type { AGUIEvent } from "@copilotkit/aimock/agui";

/**
 * Issue #205：确定性的 bounded RUN_ERROR 回归场景。
 * 用于验证 Workbench Turn Inspect 能定位失败步骤并展示公开错误 payload。
 */
export function registerRunErrorScenario(mock: AGUIMock): void {
  mock.onPredicate(
    (input) => /mock failure/i.test(String(input.messages?.at(-1)?.content)),
    ((): AGUIEvent[] => {
      const threadId = randomUUID();
      const runId = randomUUID();
      return [
        { type: "RUN_STARTED", threadId, runId },
        {
          type: "RUN_ERROR",
          code: "MOCK_FIXTURE_ERROR",
          message: "bounded mock fixture failure",
        },
      ];
    })(),
  );
}
