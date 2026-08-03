import { expect, test } from "@playwright/test";

async function waitForRuntime(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page.getByTestId("connection-status")).toContainText(
    "Runtime Host",
  );
}

async function run(page: import("@playwright/test").Page, message: string) {
  await page.getByTestId("message-input").fill(message);
  await page.getByTestId("send-run").click();
  await expect(page.getByTestId("run-status")).toHaveAttribute(
    "data-state",
    "completed",
  );
}

test("three-service HTTP flow renders Markdown and A2UI with safe diagnostics", async ({
  page,
}) => {
  await waitForRuntime(page);

  await run(page, "show the available scenarios");
  await expect(page.getByTestId("markdown-result")).toBeVisible();
  await expect(page.getByTestId("diagnostics-panel")).toContainText(
    "requestId",
  );
  await expect(
    page.getByTestId("markdown-result").locator("script"),
  ).toHaveCount(0);

  await run(page, "query device status");
  await expect(page.getByTestId("a2ui-renderer")).toBeVisible();
  await expect(page.getByTestId("a2ui-renderer")).toContainText(
    "camera-north-01",
  );
  await expect(page.getByTestId("a2ui-raw-content")).toHaveCount(0);
});

test("WebSocket uses the same Runtime Host orchestration", async ({ page }) => {
  await waitForRuntime(page);
  await page.getByTestId("transport-websocket").click();
  await expect(page.getByTestId("connection-status")).toContainText(
    "Runtime Host",
  );
  await run(page, "query device status");
  await expect(page.getByTestId("a2ui-renderer")).toBeVisible();
  await expect(page.getByTestId("diagnostics-panel")).toContainText(
    "presentationRequestId",
  );
});

test("patrol confirmation resumes the Business Agent and re-presents through the pipeline", async ({
  page,
}) => {
  await waitForRuntime(page);
  await run(page, "create a patrol plan");
  const presentationBefore = await page
    .getByTestId("presentation-result-viewer")
    .textContent();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Confirm patrol plan" }).click();
  await expect(page.getByTestId("run-status")).toHaveAttribute(
    "data-state",
    "completed",
  );
  await expect(page.getByTestId("a2ui-renderer")).toBeVisible();
  await expect(page.getByTestId("presentation-result-viewer")).not.toHaveText(
    presentationBefore ?? "",
  );
  await expect(page.getByTestId("diagnostics-panel")).toContainText(
    "presentationRequestId",
  );
});

test.skip(
  process.env.PLATFORM_E2E_FIXTURE_FAULT === undefined,
  "This assertion runs only against a separately started fault-injected Runtime Host.",
);
test("fixture model failures preserve a safe Markdown result", async ({
  page,
}) => {
  await waitForRuntime(page);
  await page.getByTestId("message-input").fill("query device status");
  await page.getByTestId("send-run").click();
  await expect(page.getByTestId("run-status")).toHaveAttribute(
    "data-state",
    "degraded",
  );
  await expect(page.getByTestId("markdown-result")).toBeVisible();
  await expect(
    page.getByTestId("markdown-result").locator("script"),
  ).toHaveCount(0);
  await expect(page.getByTestId("presentation-result-viewer")).toContainText(
    "markdown",
  );
});
