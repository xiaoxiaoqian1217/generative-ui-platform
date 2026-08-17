import { DYNAMIC_A2UI_COMPONENT_NAMES } from "@generative-ui/copilot-runtime";
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
  await expect(
    page.getByTestId("agent-source-select").locator("option"),
  ).toHaveText(["AGUIMock", "single-agent-chat-server"]);
  await expect(page.getByTestId("presentation-mode-select")).toHaveCount(0);
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

test("Conversation-first Shell opens a per-turn Inspect overlay with swimlane timeline", async ({
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
  const panel = page.getByTestId("inspect-panel");
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("turn-");

  // 泳道只来自真实观察到的 participant
  await expect(page.getByTestId("timeline-lane-workbench")).toBeVisible();
  await expect(page.getByTestId("timeline-lane-agent")).toBeVisible();
  await expect(
    page.getByTestId("timeline-lane-copilotkit-runtime"),
  ).toHaveCount(0);

  // 事件按 observed order 展示
  const types = await page
    .locator("[data-testid^='timeline-node-']")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-type")),
    );
  expect(types[0]).toBe("RUN_INPUT");
  expect(types).toContain("RUN_STARTED");
  expect(types).toContain("TEXT_MESSAGE_CONTENT");
  expect(types).toContain("RUN_FINISHED");

  // 点击节点查看 Raw JSON Detail
  await page
    .locator(
      "[data-testid^='timeline-node-'][data-type='TEXT_MESSAGE_CONTENT']",
    )
    .first()
    .click();
  const detail = page.getByTestId("inspect-detail");
  await expect(detail).toContainText("Agent online");
  // 纯过程事件显式表达无契约边界 Artifact
  await expect(page.getByTestId("inspect-no-artifact")).toContainText(
    "不产生契约边界 Artifact",
  );

  await page.getByTestId("inspect-close").click();
  await expect(page.getByTestId("inspect-panel")).toHaveCount(0);
});

test("Conversation-first Shell explains the deterministic A2UI scenario for generic requests", async ({
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
    "A2UI is available through the deterministic inspection summary scenario",
  );
  await expect(turn.getByTestId("a2ui-raw-content")).toHaveCount(0);
  await expect(turn.locator("[data-testid^='inspect-turn-']")).toBeVisible();
});

test("the inspection summary renders identically across consecutive runs", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("agent-connection-status")).toContainText(
    "已连接",
  );

  const scenario = page.getByRole("button", { name: /巡检摘要 \(A2UI\)/ });
  await scenario.click();

  const firstSurface = page.locator("[data-surface-id='inspection-summary']");
  await expect(firstSurface).toBeVisible();
  await expect(firstSurface).toContainText("巡检结果");
  await expect(firstSurface).toContainText("正常设备");
  await expect(firstSurface).toContainText("4");
  await expect(firstSurface).toContainText("告警设备");
  await expect(firstSurface).toContainText("1");
  await expect(
    firstSurface.getByRole("button", { name: "查看详情" }),
  ).toBeVisible();
  const firstText = await firstSurface.innerText();

  await page.locator("[data-testid^='inspect-turn-']").first().click();
  await expect(
    page
      .getByTestId("swimlane-timeline")
      .locator("[data-type='ACTIVITY_SNAPSHOT']"),
  ).toBeVisible();
  await page.getByTestId("inspect-close").click();

  await page.getByTestId("new-conversation").click();
  await scenario.click();

  const secondSurface = page.locator("[data-surface-id='inspection-summary']");
  await expect(secondSurface).toBeVisible();
  expect(await secondSurface.innerText()).toBe(firstText);
});

test("an invalid A2UI surface is isolated and the conversation remains usable", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("agent-connection-status")).toContainText(
    "已连接",
  );

  await conversationInput(page).fill("展示损坏的 A2UI");
  await conversationSend(page).click();

  await expect(
    page.getByText(/A2UI render error: Catalog not found/),
  ).toBeVisible();
  await expect(conversationInput(page)).toBeEnabled();

  await conversationInput(page).fill("hello");
  await conversationSend(page).click();
  await expect(page.getByTestId("markdown-result")).toContainText(
    "AG-UI mock is connected.",
  );
});

test("the Platform Catalog scenario renders Metric, StatusBadge, and InfoRow through the merged catalog", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("agent-connection-status")).toContainText(
    "已连接",
  );

  await page
    .getByRole("button", { name: /巡检摘要 \(Platform Catalog\)/ })
    .click();

  const surface = page.locator(
    "[data-surface-id='inspection-summary-platform']",
  );
  await expect(surface).toBeVisible();
  await expect(surface).toContainText("巡检结果");

  const badge = surface.getByTestId("ui-status-badge");
  await expect(badge).toHaveText("已完成");
  await expect(badge).toHaveAttribute("data-variant", "success");

  const metrics = surface.getByTestId("ui-metric");
  await expect(metrics).toHaveCount(3);
  await expect(metrics.nth(0)).toContainText("设备数量");
  await expect(metrics.nth(0)).toContainText("5");
  await expect(metrics.nth(1)).toContainText("异常数量");
  await expect(metrics.nth(1)).toContainText("1");
  await expect(metrics.nth(2)).toContainText("完成率");
  await expect(metrics.nth(2)).toContainText("100%");

  const infoRows = surface.getByTestId("ui-info-row");
  await expect(infoRows).toHaveCount(3);
  await expect(infoRows.nth(0)).toContainText("开始时间");
  await expect(infoRows.nth(0)).toContainText("14:20");
  await expect(infoRows.nth(1)).toContainText("执行耗时");
  await expect(infoRows.nth(1)).toContainText("12 min");
  await expect(infoRows.nth(2)).toContainText("执行区域");
  await expect(infoRows.nth(2)).toContainText("A 区");

  await page.locator("[data-testid^='inspect-turn-']").first().click();
  await expect(
    page
      .getByTestId("swimlane-timeline")
      .locator("[data-type='ACTIVITY_SNAPSHOT']"),
  ).toBeVisible();
});

test("Dynamic A2UI renders the controlled business content through the final catalog", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("agent-connection-status")).toContainText(
    "已连接",
  );
  const scenario = page.getByRole("button", {
    name: /巡检摘要 \(Dynamic A2UI\)/,
  });
  await expect(scenario).toBeVisible();
  await expect(
    page.getByRole("button", { name: /巡检摘要 \(Platform Catalog\)/ }),
  ).toBeVisible();

  await scenario.click();

  const turns = page.getByTestId("conversation-turns");
  await expect(turns).toContainText("inspection-summary");
  await expect(turns).toContainText("totalDevices");

  const firstSurface = page.locator(
    "[data-surface-id='inspection-summary-dynamic']",
  );
  await expect(firstSurface).toBeVisible();
  await expect(firstSurface.getByTestId("ui-status-badge")).toHaveText(
    "已完成",
  );
  const firstMetrics = firstSurface.getByTestId("ui-metric");
  await expect(firstMetrics).toHaveCount(4);
  for (const fact of [
    "设备总数",
    "5",
    "正常数量",
    "4",
    "异常数量",
    "1",
    "完成率",
    "100%",
  ])
    await expect(firstSurface).toContainText(fact);
  const firstInfoRows = firstSurface.getByTestId("ui-info-row");
  await expect(firstInfoRows).toHaveCount(3);
  for (const fact of ["14:20", "12 分钟", "A 区"])
    await expect(firstSurface).toContainText(fact);

  await page.getByTestId("new-conversation").click();
  await scenario.click();
  const secondSurface = page.locator(
    "[data-surface-id='inspection-summary-dynamic']",
  );
  await expect(secondSurface).toBeVisible();
  for (const fact of ["5", "4", "1", "100%", "14:20", "12 分钟", "A 区"])
    await expect(secondSurface).toContainText(fact);

  const generations = await (
    await request.get("/__control__/secondary-llm")
  ).json();
  expect(generations).toHaveLength(2);
  const catalogComponents = new Set(DYNAMIC_A2UI_COMPONENT_NAMES);
  for (const generation of generations) {
    const componentTypes = generation.args.components.map(
      (component: { component: string }) => component.component,
    );
    expect(
      componentTypes.every((type: string) => catalogComponents.has(type)),
    ).toBe(true);
    expect(componentTypes).toEqual(
      expect.arrayContaining(["Metric", "StatusBadge", "InfoRow"]),
    );
    expect(generation.prompt).toContain("inspection-summary");
    expect(generation.prompt).toContain("totalDevices");
    expect(generation.prompt).toContain(
      "https://generative-ui.dev/a2ui/v0_9/platform_catalog.json",
    );
    expect(generation.prompt).not.toContain("DeviceCard");
  }
});

test("Dynamic A2UI catalog violation falls back to content with an explicit error", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("agent-connection-status")).toContainText(
    "已连接",
  );
  await request.post("/__control__/secondary-llm-mode", {
    data: { mode: "invalid" },
  });

  await page.getByRole("button", { name: /巡检摘要 \(Dynamic A2UI\)/ }).click();

  const error = page.getByTestId("a2ui-generation-error");
  await expect(error).toContainText("A2UI_GENERATION_FAILED");
  await expect(error).toContainText("DeviceCard");
  await expect(page.getByTestId("conversation-turns")).toContainText(
    "totalDevices",
  );
  await expect(
    page.locator("[data-surface-id='inspection-summary-dynamic']"),
  ).toHaveCount(0);
  await expect(conversationInput(page)).toBeEnabled();

  await page
    .getByRole("button", { name: /巡检摘要 \(Platform Catalog\)/ })
    .click();
  await expect(
    page.locator("[data-surface-id='inspection-summary-platform']"),
  ).toBeVisible();
});

test("Dynamic A2UI Secondary LLM failure is bounded and does not break fixed A2UI", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("agent-connection-status")).toContainText(
    "已连接",
  );
  await request.post("/__control__/secondary-llm-mode", {
    data: { mode: "down" },
  });

  await page.getByRole("button", { name: /巡检摘要 \(Dynamic A2UI\)/ }).click();

  const error = page.getByTestId("a2ui-generation-error");
  await expect(error).toContainText("A2UI_GENERATION_FAILED");
  await expect(error).toContainText("A2UI_SECONDARY_LLM_UNAVAILABLE");
  await expect(page.getByTestId("conversation-turns")).toContainText(
    "totalDevices",
  );
  await expect(page.getByTestId("agent-connection-status")).toContainText(
    "已连接",
  );
  await expect(conversationInput(page)).toBeEnabled();

  await request.post("/__control__/restore");
  await page.getByRole("button", { name: /巡检摘要 \(A2UI\)/ }).click();
  await expect(
    page.locator("[data-surface-id='inspection-summary']"),
  ).toBeVisible();
});

test("Dynamic A2UI generated actions are recorded in Inspect only and never sent back", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("agent-connection-status")).toContainText(
    "已连接",
  );
  await request.post("/__control__/secondary-llm-mode", {
    data: { mode: "action" },
  });

  await page.getByRole("button", { name: /巡检摘要 \(Dynamic A2UI\)/ }).click();

  const surface = page.locator(
    "[data-surface-id='inspection-summary-dynamic']",
  );
  await expect(surface).toBeVisible();
  const actionButton = surface.getByRole("button", { name: "重试巡检" });
  await expect(actionButton).toBeVisible();
  await expect(page.locator("[data-testid^='conversation-turn-']")).toHaveCount(
    1,
  );

  const probe = async () =>
    (await (await request.get("/__control__/frontend-tool-probe")).json())
      .runs as number;
  const runsBefore = await probe();
  await actionButton.click();
  await page.waitForTimeout(600);

  expect(await probe()).toBe(runsBefore);
  await expect(page.locator("[data-testid^='conversation-turn-']")).toHaveCount(
    1,
  );
  await expect(conversationInput(page)).toBeEnabled();

  await page.locator("[data-testid^='inspect-turn-']").first().click();
  await page
    .locator("[data-testid^='timeline-node-'][data-type='ACTIVITY_SNAPSHOT']")
    .first()
    .click();
  const detail = page.getByTestId("inspect-detail");
  await detail.getByTestId("json-node-content").first().click();
  await detail.getByTestId("json-node-a2ui_operations").first().click();
  await detail.getByTestId("json-node-1").first().click();
  await detail.getByTestId("json-node-updateComponents").first().click();
  await detail.getByTestId("json-node-components").first().click();
  await detail.getByTestId("json-node-3").first().click();
  await detail.getByTestId("json-node-action").first().click();
  await detail.getByTestId("json-node-event").first().click();
  await expect(detail).toContainText("retry_inspection");
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
  const timeline = page.getByTestId("swimlane-timeline");
  for (const type of [
    "STATE_SNAPSHOT",
    "STATE_DELTA",
    "ACTIVITY_SNAPSHOT",
    "ACTIVITY_DELTA",
  ]) {
    await expect(
      timeline.locator(`[data-type='${type}']`).first(),
    ).toBeVisible();
  }

  await timeline.locator("[data-type='STATE_SNAPSHOT']").first().click();
  await page
    .getByTestId("inspect-detail")
    .getByTestId("json-node-snapshot")
    .click();
  await page
    .getByTestId("inspect-detail")
    .getByTestId("json-node-task")
    .click();
  await expect(page.getByTestId("inspect-detail")).toContainText("progress");

  await timeline.locator("[data-type='RUN_FINISHED']").first().click();
  const finishedDetail = page.getByTestId("inspect-detail");
  await finishedDetail.getByTestId("json-node-result").click();
  await finishedDetail.getByTestId("json-node-artifact").click();
  await expect(finishedDetail).toContainText("report-42");

  const received = await (await request.get("/__control__/sacs")).json();
  expect(received.at(-1).authorization).toBe(
    "Bearer e2e-sacs-service-key-with-at-least-32-characters",
  );
  expect(received.at(-1).userJwtClaims).toMatchObject({
    iss: "open-webui",
    role: "user",
    sub: "e2e-workbench-user",
  });
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
  await page
    .getByTestId("swimlane-timeline")
    .locator("[data-type='RUN_FINISHED']")
    .first()
    .click();
  const structuredDetail = page.getByTestId("inspect-detail");
  await structuredDetail.getByTestId("json-node-result").click();
  await structuredDetail.getByTestId("json-node-artifact").click();
  await expect(structuredDetail).toContainText("report-42");
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

test("Inspect shows the AGUIMock Frontend Tool loop with real correlation", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("agent-connection-status")).toContainText(
    "已连接",
  );

  await conversationInput(page).fill("定位无人机 01");
  await conversationSend(page).click();
  await expect(page.getByTestId("markdown-result")).toContainText(
    "已定位无人机 01",
  );

  await page.locator("[data-testid^='inspect-turn-']").first().click();
  const timeline = page.getByTestId("swimlane-timeline");

  // Frontend Tool 泳道只在真实发生时出现
  await expect(page.getByTestId("timeline-lane-frontend-tool")).toBeVisible();
  await expect(
    timeline.locator("[data-type='TOOL_CALL_START']").first(),
  ).toBeVisible();
  await expect(
    timeline.locator("[data-type='TOOL_CALL_END']").first(),
  ).toBeVisible();
  await expect(
    timeline.locator("[data-type='FRONTEND_TOOL_INVOCATION']").first(),
  ).toBeVisible();

  const result = timeline.locator("[data-type='FRONTEND_TOOL_RESULT']").first();
  await expect(result).toBeVisible();
  await expect(result).toHaveAttribute("data-status", "ok");
  await expect(result).toContainText("ms");

  await result.click();
  const detail = page.getByTestId("inspect-detail");
  // 请求 / 返回配对：invocation args 与 result 真实成对呈现
  await expect(page.getByTestId("inspect-exchange-request")).toContainText(
    "locateDevice",
  );
  await expect(page.getByTestId("inspect-exchange-response")).toContainText(
    "located",
  );
  await expect(detail).toContainText("toolCall");

  // Tool Call / Tool Result 之间的真实关联被高亮
  const correlatedCount = await timeline
    .locator("[data-correlated='true']")
    .count();
  expect(correlatedCount).toBeGreaterThanOrEqual(2);
  await expect(
    timeline.locator("[data-type='TOOL_CALL_END']").first(),
  ).toHaveAttribute("data-correlated", "true");
});

test("AGUIMock bounded RUN_ERROR is located in Inspect with its public payload", async ({
  page,
}) => {
  await page.goto("/");
  await conversationInput(page).fill("mock failure");
  await conversationSend(page).click();
  await expect(page.getByTestId("turn-failure")).toContainText(
    "WORKBENCH_RUN_ERROR",
  );

  await page.locator("[data-testid^='inspect-turn-']").first().click();
  const errorNode = page
    .getByTestId("swimlane-timeline")
    .locator("[data-type='RUN_ERROR']")
    .first();
  await expect(errorNode).toHaveAttribute("data-status", "failed");

  await errorNode.click();
  const detail = page.getByTestId("inspect-detail");
  await expect(detail).toContainText("MOCK_FIXTURE_ERROR");
  await expect(detail).toContainText("bounded mock fixture failure");
});

test("SACS Interrupt is answered in the turn and resumed with real correlation", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await page
    .getByTestId("agent-source-select")
    .selectOption("single-agent-chat-server");

  await conversationInput(page).fill("confirm task");
  await conversationSend(page).click();

  const interrupt = page.getByTestId("turn-interrupt");
  await expect(interrupt).toBeVisible();
  await expect(page.getByTestId("interrupt-reason")).toContainText(
    "请确认是否继续执行任务",
  );

  await page
    .locator("[data-testid^='interrupt-input-']")
    .first()
    .fill("继续执行");
  await page.locator("[data-testid^='interrupt-submit-']").first().click();

  await expect(page.getByTestId("markdown-result").last()).toContainText(
    "Task resumed after confirmation: 继续执行.",
  );
  await expect(page.getByTestId("turn-interrupt")).toHaveCount(0);

  // SACS 侧真实收到 AG-UI resume 数组
  const received = await (await request.get("/__control__/sacs")).json();
  const resumeRun = received.find(
    (entry) => Array.isArray(entry.body.resume) && entry.body.resume.length > 0,
  );
  expect(resumeRun.body.resume[0].status).toBe("resolved");
  expect(resumeRun.body.resume[0].payload).toBe("继续执行");

  // Inspect：interrupt outcome → resume input → continuation 可关联
  await page.locator("[data-testid^='inspect-turn-']").first().click();
  const timeline = page.getByTestId("swimlane-timeline");
  const interrupted = timeline.locator("[data-status='interrupted']").first();
  await expect(interrupted).toBeVisible();
  await interrupted.click();
  const interruptDetail = page.getByTestId("inspect-detail");
  await interruptDetail.getByTestId("json-node-outcome").click();
  await interruptDetail.getByTestId("json-node-interrupts").click();
  await interruptDetail.getByTestId("json-node-0").click();
  await expect(interruptDetail).toContainText("need_confirmation");
  await expect(timeline.locator("[data-correlated='true']")).toHaveCount(2);

  await timeline.locator("[data-type='RESUME_INPUT']").first().click();
  await page
    .getByTestId("inspect-detail")
    .getByTestId("json-node-resume")
    .click();
  await page.getByTestId("inspect-detail").getByTestId("json-node-0").click();
  await expect(page.getByTestId("inspect-detail")).toContainText("继续执行");
});

test("SACS durable run conflict is observable as a bounded public error", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByTestId("agent-source-select")
    .selectOption("single-agent-chat-server");
  await conversationInput(page).fill("durable conflict");
  await conversationSend(page).click();
  await expect(page.getByTestId("turn-failure")).toContainText(
    "WORKBENCH_RUN_ERROR",
  );

  await page.locator("[data-testid^='inspect-turn-']").first().click();
  await page
    .getByTestId("swimlane-timeline")
    .locator("[data-type='RUN_ERROR']")
    .first()
    .click();
  await expect(page.getByTestId("inspect-detail")).toContainText(
    "run_id_conflict",
  );
});

test("a large SACS payload stays folded and lazily rendered in Inspect", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByTestId("agent-source-select")
    .selectOption("single-agent-chat-server");
  await conversationInput(page).fill("large payload");
  await conversationSend(page).click();
  await expect(page.getByTestId("markdown-result")).toContainText(
    "artifact report-42",
  );

  await page.locator("[data-testid^='inspect-turn-']").first().click();
  await page
    .getByTestId("swimlane-timeline")
    .locator("[data-type='STATE_SNAPSHOT']")
    .first()
    .click();

  const detail = page.getByTestId("inspect-detail");
  await expect(detail).toBeVisible();
  // 大对象分页渲染（每页 50 项），页面保持可用
  await detail.getByTestId("json-node-snapshot").click();
  await detail.getByTestId("json-node-items").click();
  const showMore = detail.getByTestId("json-show-more");
  await expect(showMore).toContainText("70");
  await showMore.click();
  await expect(detail.getByTestId("json-show-more")).toContainText("20");
});
