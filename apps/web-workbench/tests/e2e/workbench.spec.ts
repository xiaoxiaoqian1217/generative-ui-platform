import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  await request.post("/__control__/restore");
  await request.post("/__control__/runtime-up");
});

test("HTTP renders safe Markdown, PresentationResult and diagnostics", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByTestId("environment-banner")).toContainText("v0.1.0");
  await expect(page.getByTestId("connection-status")).toHaveText(
    "Runtime Host 可用",
  );
  await page.getByTestId("message-input").fill("展示 Markdown");
  await page.getByTestId("send-run").click();

  await expect(page.getByTestId("run-status")).toContainText("已完成");
  await expect(
    page.getByTestId("markdown-result").getByRole("heading", { level: 2 }),
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

test("WebSocket recovers and keeps A2UI raw data controlled", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("transport-websocket").click();
  await expect(page.getByTestId("connection-status")).toHaveText(
    "Runtime Host 可用",
  );

  await page.getByTestId("message-input").fill("返回 A2UI");
  await page.getByTestId("send-run").click();
  await expect(page.getByTestId("run-status")).toContainText("已完成");
  await expect(page.getByTestId("a2ui-placeholder")).toBeVisible();
  await expect(page.getByTestId("a2ui-raw-content")).toHaveCount(0);
  await page.getByTestId("a2ui-raw-viewer").getByLabel("显示原始数据").check();
  await expect(page.getByTestId("a2ui-raw-content")).toContainText(
    "beginRendering",
  );

  await page.request.post("/__control__/disconnect");
  await expect(page.getByTestId("connection-status")).toHaveText(
    "连接中断，正在重连",
  );
  await page.request.post("/__control__/restore");
  await expect(page.getByTestId("connection-notice")).toHaveText(
    "Runtime Host 服务连接已恢复",
    {
      timeout: 10_000,
    },
  );
});

test("refresh explicitly reports reset state", async ({ page }) => {
  await page.goto("/");
  await page.reload();
  await expect(page.getByTestId("refresh-notice")).toContainText("页面已刷新");
  await expect(page.getByTestId("run-status")).toContainText("等待发送");
});

test("HTTP reports an initial outage, clears stale output and recovers", async ({
  page,
}) => {
  await page.request.post("/__control__/runtime-down");
  await page.goto("/");

  await expect(page.getByTestId("connection-status")).toHaveText(
    "Runtime Host 不可用",
  );
  await page.getByTestId("message-input").fill("故障期间发送");
  await page.getByTestId("send-run").click();
  await expect(page.getByTestId("run-status")).toContainText("失败");
  await expect(page.getByTestId("error-state")).toContainText(
    "WORKBENCH_RESPONSE_INVALID",
  );
  await expect(page.getByTestId("markdown-result")).toHaveCount(0);

  await page.request.post("/__control__/runtime-up");
  await expect(page.getByTestId("connection-notice")).toHaveText(
    "Runtime Host 服务连接已恢复",
    { timeout: 10_000 },
  );

  await page.getByTestId("message-input").fill("恢复后的结果");
  await page.getByTestId("send-run").click();
  await expect(page.getByTestId("markdown-result")).toBeVisible();

  await page.request.post("/__control__/runtime-down");
  await page.getByTestId("message-input").fill("再次故障");
  await page.getByTestId("send-run").click();
  await expect(page.getByTestId("error-state")).toBeVisible();
  await expect(page.getByTestId("markdown-result")).toHaveCount(0);

  await page.request.post("/__control__/runtime-up");
});
