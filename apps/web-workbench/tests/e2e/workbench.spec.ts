import { expect, type Page, test } from "@playwright/test";

const conversationInput = (page: Page) =>
  page.getByTestId("composer").getByRole("textbox", { name: "输入消息" });

const conversationSend = (page: Page) => page.getByTestId("composer-send");

test.beforeEach(async ({ request }) => {
  await request.post("/__control__/restore");
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
  ).toHaveText("Agent online");
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
  ).toHaveText("Agent online");

  await page.locator("[data-testid^='inspect-turn-']").first().click();
  await expect(page.getByTestId("inspect-panel")).toBeVisible();
  await expect(page.getByTestId("inspect-panel")).toContainText("turn-");
  await expect(page.getByTestId("agent-message-viewer")).toContainText(
    "assistant",
  );
  await page.getByTestId("inspect-close").click();
  await expect(page.getByTestId("inspect-panel")).toHaveCount(0);
});

test("Conversation-first Shell treats frozen A2UI capability as normal Agent text", async ({
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
  await expect(turn.getByTestId("markdown-result")).toContainText(
    "A2UI capability is frozen",
  );
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

  await conversationInput(page).fill("call frontend status tool");
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

test("AGUIMock serves the connection probe from the unified scenario server", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("agent-connection-status")).toContainText(
    "已连接",
  );

  await conversationInput(page).fill("连接测试");
  await conversationSend(page).click();

  await expect(page.getByTestId("markdown-result")).toContainText(
    "AG-UI mock is connected.",
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
  await conversationInput(page).fill("slow response");
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
  await conversationInput(page).fill("timeout then retry");
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

test("SACS Source streams text, state, activity, and artifact without Frontend Tools", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await page
    .getByTestId("agent-source-select")
    .selectOption("single-agent-chat-server");
  await expect(page.getByTestId("frontend-tool-capability-gap")).toBeVisible();

  await conversationInput(page).fill("run SACS business task");
  await conversationSend(page).click();
  await expect(page.getByTestId("markdown-result")).toContainText(
    "artifact report-42",
  );
  await page.locator("[data-testid^='inspect-turn-']").first().click();
  const observation = page.getByTestId("agent-message-viewer");
  await expect(observation).toContainText("STATE_SNAPSHOT");
  await expect(observation).toContainText("STATE_DELTA");
  await expect(observation).toContainText("ACTIVITY_SNAPSHOT");
  await expect(observation).toContainText("ACTIVITY_DELTA");
  await expect(observation).toContainText("report-42");

  const received = await (await request.get("/__control__/sacs")).json();
  expect(received.at(-1).authorization).toBe("Bearer e2e-sacs-key");
  expect(received.at(-1).userJwt).toBe("e2e-signed-user");
  expect(received.at(-1).body.tools).toEqual([]);
});

test("the selected Agent Source survives a page reload", async ({ page }) => {
  await page.goto("/");
  await page
    .getByTestId("agent-source-select")
    .selectOption("single-agent-chat-server");

  await page.reload();

  await expect(page.getByTestId("agent-source-select")).toHaveValue(
    "single-agent-chat-server",
  );
  await expect(page.getByTestId("frontend-tool-capability-gap")).toBeVisible();
});

test("a structured SACS result without assistant text still enters Inspect", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByTestId("agent-source-select")
    .selectOption("single-agent-chat-server");
  await conversationInput(page).fill("structured result only");
  await conversationSend(page).click();

  await page.locator("[data-testid^='inspect-turn-']").first().click();
  await expect(page.getByTestId("agent-message-viewer")).toContainText(
    "report-42",
  );
  await expect(page.getByTestId("turn-failure")).toHaveCount(0);
});

test("an unavailable SACS upstream is retryable while Runtime stays available", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByTestId("agent-source-select")
    .selectOption("single-agent-chat-server");
  await page.request.post("/__control__/sacs-down");
  await conversationInput(page).fill("run SACS business task");
  await conversationSend(page).click();

  await expect(page.getByTestId("turn-failure")).toContainText(
    "WORKBENCH_AGENT_UNAVAILABLE",
  );
  await expect(page.getByRole("button", { name: "重试" })).toBeVisible();
  await expect(page.getByTestId("agent-connection-status")).toContainText(
    "不可用",
  );
  await page.request.post("/__control__/restore");
  await page.getByRole("button", { name: "重试" }).click();
  await expect(page.getByTestId("markdown-result")).toContainText(
    "artifact report-42",
  );
  await expect(page.getByTestId("agent-connection-status")).toContainText(
    "已连接",
  );
});

test("SACS RUN_ERROR enters the bounded failed state", async ({ page }) => {
  await page.goto("/");
  await page
    .getByTestId("agent-source-select")
    .selectOption("single-agent-chat-server");
  await conversationInput(page).fill("SACS error");
  await conversationSend(page).click();
  await expect(page.getByTestId("turn-failure")).toContainText(
    "WORKBENCH_RUN_ERROR",
  );
  await expect(page.getByTestId("turn-failure")).not.toContainText(
    "bounded fixture failure",
  );
});
