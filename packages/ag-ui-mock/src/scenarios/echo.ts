import type { AGUIMock } from "@copilotkit/aimock";

export function registerEchoScenario(mock: AGUIMock): void {
  mock.onMessage(/^(?:hello|echo|连接测试)$/i, "AG-UI mock is connected.");
}
