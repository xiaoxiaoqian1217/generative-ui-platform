import { expect, type Page, test } from "@playwright/test";

const conversationInput = (page: Page) =>
  page.getByTestId("composer").getByRole("textbox", { name: "输入消息" });

const conversationSend = (page: Page) => page.getByTestId("composer-send");

test.beforeEach(async ({ request }) => {
  await request.post("/__control__/restore");
  await request.post("/__control__/agent-up");
});

test("Conversation-first Shell is the default product interface", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("conversation-shell")).toBeVisible();
  await expect(page.getByTestId("conversation-sidebar")).toBeVisible();
  await expect(page.getByTestId("composer")).toBeVisible();
  await expect(page.getByTestId("agent-connection-status")).toContainText(
    "已连接",
  );
});

test("Conversation-first Shell sends a real message and renders safe Markdown inline", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("agent-connection-status")).toContainText(
    "已连接",
  );

  await conversationInput(page).fill("展示 Markdown");
  await conversationSend(page).click();

  const turn = page
    .getByTestId("conversation-turns")
    .locator("[data-testid^='conversation-turn-']")
    .first();
  await expect(turn.getByTestId("user-message")).toHaveText("展示 Markdown");
  await expect(
    turn.getByTestId("markdown-result").getByRole("heading", { level: 2 }),
  ).toHaveText("Runtime 在线");
  await expect(
    turn.getByTestId("markdown-result").locator("script"),
  ).toHaveCount(0);
});

test("Conversation-first Shell opens a per-turn Inspect overlay", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("agent-connection-status")).toContainText(
    "已连接",
  );

  await conversationInput(page).fill("展示 Markdown");
  await conversationSend(page).click();
  const turn = page
    .getByTestId("conversation-turns")
    .locator("[data-testid^='conversation-turn-']")
    .first();
  await expect(
    turn.getByTestId("markdown-result").getByRole("heading", { level: 2 }),
  ).toHaveText("Runtime 在线");

  await page.locator("[data-testid^='inspect-turn-']").first().click();
  await expect(page.getByTestId("inspect-panel")).toBeVisible();
  await expect(page.getByTestId("inspect-panel")).toContainText("turn-");
  await expect(page.getByTestId("presentation-result-viewer")).toContainText(
    "markdown",
  );
  await page.getByTestId("inspect-close").click();
  await expect(page.getByTestId("inspect-panel")).toHaveCount(0);
});

test("Conversation-first Shell keeps A2UI raw data controlled", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("agent-connection-status")).toContainText(
    "已连接",
  );

  await conversationInput(page).fill("返回 A2UI");
  await conversationSend(page).click();

  const turn = page
    .getByTestId("conversation-turns")
    .locator("[data-testid^='conversation-turn-']")
    .first();
  await expect(turn.getByTestId("a2ui-renderer")).toContainText("Ready");
  await expect(turn.getByTestId("a2ui-raw-content")).toHaveCount(0);
  await expect(turn.locator("[data-testid^='inspect-turn-']")).toBeVisible();
});

test("Frontend Tool is advertised, executed in the browser, and continued through AG-UI", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("agent-connection-status")).toContainText(
    "已连接",
  );

  await conversationInput(page).fill("调用前端状态工具");
  await conversationSend(page).click();

  await expect
    .poll(async () => {
      const response = await request.get("/__control__/frontend-tool-probe");
      const probe = await response.json();
      return probe.continuations;
    })
    .toBe(1);

  const response = await request.get("/__control__/frontend-tool-probe");
  const probe = await response.json();
  expect(probe.advertised).toBe(true);
  expect(probe.result).toContain('"capability":"frontend-tool"');
  expect(probe.result).toContain('"surface":"web-workbench"');
  expect(probe.result).toContain('"status":"connected"');
});

test("AGUIMock locateDevice drives the independent GIS business surface", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "generative-ui.workbench.settings.v1",
      JSON.stringify({
        agentUrl: "http://127.0.0.1:4180",
        requestTimeoutMs: 30_000,
        showDebugDetails: false,
      }),
    );
  });
  await page.goto("/");
  await expect(page.getByTestId("conversation-sidebar")).toBeVisible();
  await expect(page.getByTestId("conversation-main")).toBeVisible();
  await expect(page.getByTestId("map-workspace")).toBeVisible();
  await expect(page.getByTestId("device-marker-01")).toBeVisible();
  await expect(page.getByTestId("device-card")).toHaveCount(0);

  await conversationInput(page).fill("定位无人机 01");
  await conversationSend(page).click();

  await expect(page.getByTestId("device-marker-01")).toHaveAttribute(
    "data-selected",
    "true",
  );
  await expect(page.getByTestId("device-card")).toContainText("无人机 01");
  await expect(page.getByTestId("device-card")).toContainText("82%");
  await expect(page.getByTestId("markdown-result")).toContainText(
    "已定位无人机 01",
  );
});

test("the GIS workspace can locate its test device manually", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("device-card")).toHaveCount(0);

  await page.getByRole("button", { name: "定位测试设备" }).click();

  await expect(page.getByTestId("device-marker-01")).toHaveAttribute(
    "data-selected",
    "true",
  );
  await expect(page.getByTestId("device-card")).toContainText("无人机 01");
});

test("stop cancels a turn", async ({ page }) => {
  await page.goto("/");
  await conversationInput(page).fill("缓慢响应");
  await conversationSend(page).click();
  const stop = page.getByRole("button", { name: "停止生成" });
  await expect(stop).toBeVisible();
  await stop.click();
  await expect(page.getByTestId("turn-failure")).toContainText(
    "WORKBENCH_REQUEST_CANCELLED",
  );
});

test("a retryable timeout can be explicitly retried in its turn", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "generative-ui.workbench.settings.v1",
      JSON.stringify({ requestTimeoutMs: 1_000, showDebugDetails: false }),
    );
  });
  await page.goto("/");
  await conversationInput(page).fill("超时后重试");
  await conversationSend(page).click();
  await expect(page.getByTestId("turn-failure")).toContainText(
    "WORKBENCH_REQUEST_TIMEOUT",
  );
  await page.getByRole("button", { name: "重试" }).click();
  await expect(page.getByTestId("markdown-result")).toBeVisible();
});

test("agent outage disables input and recovers", async ({ page }) => {
  await page.request.post("/__control__/agent-down");
  await page.goto("/");

  await expect(conversationInput(page)).toBeDisabled();
  await expect(conversationSend(page)).toBeDisabled();

  await page.request.post("/__control__/agent-up");
  await expect(page.getByTestId("agent-connection-status")).toContainText(
    "已连接",
    { timeout: 10_000 },
  );

  await conversationInput(page).fill("恢复后的结果");
  await conversationSend(page).click();
  await expect(page.getByTestId("markdown-result")).toBeVisible();
});
