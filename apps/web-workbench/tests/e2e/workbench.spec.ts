import { expect, type Page, test } from "@playwright/test";

const chatInput = (page: Page) =>
  page.getByRole("textbox", { name: "Type a message..." });

const sendMessage = (page: Page) =>
  page.getByRole("button", { name: "Send message" });

test.beforeEach(async ({ request }) => {
  await request.post("/__control__/restore");
  await request.post("/__control__/runtime-up");
});

test("CopilotKit Headless renders safe Markdown, PresentationResult and diagnostics", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByTestId("environment-banner")).toContainText("v0.1.0");
  await expect(page.getByTestId("connection-status")).toHaveText(
    "Runtime Host 可用",
  );
  await chatInput(page).fill("展示 Markdown");
  await sendMessage(page).click();

  await expect(page.getByTestId("run-status")).toContainText("已完成");
  await expect(
    page
      .getByTestId("controlled-copilot-chat")
      .getByTestId("markdown-result")
      .getByRole("heading", { level: 2 }),
  ).toHaveText("Runtime 在线");
  await expect(
    page.getByTestId("markdown-result").locator("script"),
  ).toHaveCount(0);
  await expect(page.getByTestId("presentation-result-viewer")).toContainText(
    "markdown",
  );
  await expect(page.getByTestId("diagnostics-panel")).toContainText(
    "presentation-pipeline",
  );
});

test("CopilotKit Headless keeps A2UI raw data controlled", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("connection-status")).toHaveText(
    "Runtime Host 可用",
  );

  await chatInput(page).fill("返回 A2UI");
  await sendMessage(page).click();
  await expect(page.getByTestId("run-status")).toContainText("已完成");
  await expect(
    page.getByTestId("controlled-copilot-chat").getByTestId("a2ui-renderer"),
  ).toContainText("Ready");
  await expect(page.getByTestId("a2ui-raw-content")).toHaveCount(0);
  await page.getByTestId("a2ui-raw-viewer").getByLabel("显示原始数据").check();
  await expect(page.getByTestId("a2ui-raw-content")).toContainText(
    "createSurface",
  );
});

test("stop cancels a turn and Action Resume retires its previous Surface", async ({
  page,
}) => {
  await page.goto("/");
  await chatInput(page).fill("缓慢响应");
  await sendMessage(page).click();
  const stop = page.getByRole("button", { name: "停止生成" });
  await expect(stop).toBeVisible();
  await stop.click();
  await expect(page.getByTestId("run-status")).toContainText("已取消");
  await expect(page.getByTestId("turn-failure")).toContainText(
    "WORKBENCH_REQUEST_CANCELLED",
  );

  await chatInput(page).fill("返回 A2UI");
  await sendMessage(page).click();
  const buttons = page
    .getByTestId("controlled-copilot-chat")
    .getByRole("button", { name: "继续" });
  await expect(buttons).toHaveCount(1);
  await buttons.first().click();
  await expect(page.getByTestId("controlled-copilot-chat")).toContainText(
    "Resumed",
  );
  await expect(buttons).toHaveCount(1);
  await expect(buttons.first()).toBeDisabled();
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
  await chatInput(page).fill("超时后重试");
  await sendMessage(page).click();
  await expect(page.getByTestId("turn-failure")).toContainText(
    "WORKBENCH_REQUEST_TIMEOUT",
  );
  await page.getByRole("button", { name: "重试" }).click();
  await expect(page.getByTestId("run-status")).toContainText("已完成");
  await expect(page.getByTestId("markdown-result")).toBeVisible();
});

test("refresh explicitly reports reset state", async ({ page }) => {
  await page.goto("/");
  await page.reload();
  await expect(page.getByTestId("refresh-notice")).toContainText("页面已刷新");
  await expect(page.getByTestId("run-status")).toContainText("等待发送");
});

test("debug conversation can be created, selected and deleted through Runtime thread APIs", async ({
  page,
}) => {
  await page.goto("/");
  const threadList = page.getByTestId("thread-list");
  await expect(threadList).toBeVisible();

  await threadList.getByRole("button").first().click();
  await expect(threadList.locator("strong")).toHaveText([
    "New debug conversation",
  ]);

  // Buttons are: new thread, select thread, rename, archive, delete.
  await threadList.getByRole("button").nth(4).click();
  await expect(threadList.locator("strong")).toHaveCount(0);
});

test("Headless reports an initial outage and recovers", async ({ page }) => {
  await page.request.post("/__control__/runtime-down");
  await page.goto("/");

  await expect(page.getByTestId("connection-status")).toHaveText(
    "Runtime Host 不可用",
  );
  await expect(sendMessage(page)).toBeDisabled();

  await page.request.post("/__control__/runtime-up");
  await expect(page.getByTestId("connection-notice")).toHaveText(
    "Runtime Host 服务连接已恢复",
    { timeout: 10_000 },
  );
  await page.getByRole("button", { name: "重新探测 / 连接" }).click();
  await expect(page.getByTestId("connection-status")).toHaveText(
    "Runtime Host 可用",
  );

  await chatInput(page).fill("恢复后的结果");
  await sendMessage(page).click();
  await expect(page.getByTestId("markdown-result")).toBeVisible();

  await page.request.post("/__control__/runtime-down");
  await expect(page.getByTestId("connection-status")).toHaveText(
    "Runtime Host 不可用",
    { timeout: 10_000 },
  );
  await expect(sendMessage(page)).toBeDisabled();

  await page.request.post("/__control__/runtime-up");
});
