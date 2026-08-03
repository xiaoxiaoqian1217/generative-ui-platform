import { defineConfig, devices } from "@playwright/test";

/**
 * This suite deliberately has no webServer.
 * scripts/test-e2e-platform.mjs starts the only permitted topology first:
 * Workbench :5173, Runtime Host :8200, and Reference Business Agent :8300.
 */
export default defineConfig({
  testDir: "./tests/platform-e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  reporter: "line",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
