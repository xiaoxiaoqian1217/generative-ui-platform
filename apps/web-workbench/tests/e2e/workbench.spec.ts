import { DYNAMIC_A2UI_COMPONENT_NAMES } from "@generative-ui/copilot-runtime";
import { expect, type Page, test } from "@playwright/test";

const conversationInput = (page: Page) =>
  page.getByTestId("composer").getByRole("textbox", { name: "输入消息" });

const conversationSend = (page: Page) => page.getByTestId("composer-send");

async function expectLatestStructuredActivity(
  page: Page,
  expectedTexts: readonly string[],
) {
  await page.locator("[data-testid^='inspect-turn-']").first().click();
  await page
    .getByTestId("swimlane-timeline")
    .locator("[data-type='ACTIVITY_SNAPSHOT']")
    .first()
    .click();
  const structuredDetail = page.getByTestId("inspect-detail");
  await structuredDetail.getByTestId("json-node-content").click();
  await structuredDetail.getByTestId("json-node-payload").click();
  for (const expectedText of expectedTexts)
    await expect(structuredDetail).toContainText(expectedText);
  await page.getByTestId("inspect-close").click();
}

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
  await expect(page.getByTestId("device-marker-01")).toBeVisible();
  for (const featureId of ["east-ridge", "under-bridge", "checkpoint-b"])
    await expect(page.getByTestId(`map-feature-${featureId}`)).toBeHidden();
  await expect(page.getByTestId("map-effect-summary")).toHaveCount(0);
  await expect(
    page.getByTestId("agent-source-select").locator("option"),
  ).toHaveText([
    "AGUIMock",
    "single-agent-chat-server",
    "Map Validation Agent",
  ]);
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
  await expect(turns).not.toContainText("contentType");
  await expect(turns).not.toContainText("totalDevices");

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

  await expectLatestStructuredActivity(page, [
    "inspection-summary",
    "totalDevices",
  ]);

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
  await expect(page.getByTestId("conversation-turns")).not.toContainText(
    "totalDevices",
  );
  await expect(
    page.locator("[data-surface-id='inspection-summary-dynamic']"),
  ).toHaveCount(0);
  await expect(conversationInput(page)).toBeEnabled();

  await expectLatestStructuredActivity(page, ["totalDevices"]);

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
  await expect(page.getByTestId("conversation-turns")).not.toContainText(
    "totalDevices",
  );
  await expect(page.getByTestId("agent-connection-status")).toContainText(
    "已连接",
  );
  await expect(conversationInput(page)).toBeEnabled();

  await expectLatestStructuredActivity(page, ["totalDevices"]);

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
    .nth(1)
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
  expect(probe.advertisedToolNames).toEqual(
    expect.arrayContaining([
      "focusOn",
      "highlight",
      "previewPath",
      "setLayerVisibility",
      "show_workbench_status",
    ]),
  );
  expect(probe.advertisedToolNames).not.toContain("locateDevice");
  expect(probe.result).toContain('"capability":"frontend-tool"');
  expect(probe.result).toContain('"surface":"web-workbench"');
  expect(probe.result).toContain('"status":"connected"');
});

test("the migrated locate intent composes map-domain tools on the GIS surface", async ({
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
    "data-highlighted",
    "true",
  );
  await expect(page.getByTestId("map-view")).toHaveAttribute(
    "data-focused-feature-id",
    "01",
  );
  await expect(page.getByTestId("map-view")).toHaveAttribute(
    "data-center",
    "116.3974,39.9093",
  );
  await expect(page.getByTestId("map-view")).toHaveAttribute("data-zoom", "14");
  await expect(page.getByTestId("device-card")).toHaveCount(0);
  await expect(page.getByTestId("markdown-result")).toContainText(
    "已定位无人机 01",
  );
});

test("scenario A applies the patrol map intents to one persistent surface", async ({
  page,
}) => {
  await page.goto("/");
  const mapView = page.getByTestId("map-view");
  await expect(mapView).toBeVisible();

  await page.getByRole("button", { name: /北侧通道巡逻方案/ }).click();

  const publicPlan = page.getByTestId("map-plan-activity");
  await expect(publicPlan).toBeVisible();
  await expect(publicPlan).toContainText(/Agent (正在研判|研判摘要)/);
  await expect(publicPlan).toContainText("北侧通道巡逻候选方案");

  await expect(page.getByTestId("markdown-result")).toContainText(
    "初步研判已完成",
  );
  const mapOperations = page.getByTestId("map-operation-hud-summary");
  await expect(page.getByTestId("map-operation-hud-current")).toContainText(
    "地图操作已完成",
  );
  const mapOperationHistory = page.getByTestId("map-operation-hud-history");
  await expect(mapOperationHistory).toContainText("显示任务限制图层");
  await expect(mapOperationHistory).toContainText("聚焦北侧通道");
  await expect(mapOperationHistory).toContainText("标记观察点和限制区");
  await expect(mapOperationHistory).toContainText("预览候选路线 A");
  await expect(mapOperations).toContainText("查看记录");
  await expect(publicPlan).toContainText("Agent 研判摘要");
  await expect(publicPlan).toContainText("3 个观察点");
  await expect(publicPlan).toContainText("临时预览");
  await expect(publicPlan).toContainText("尚未比较其他候选路线");
  await expect(publicPlan).not.toContainText("显示任务限制图层");
  expect(
    await page
      .getByTestId("quick-scenarios")
      .evaluate((element) => element.scrollWidth - element.clientWidth),
  ).toBe(0);
  await expect(mapView).toHaveCount(1);
  await expect(mapView).toHaveAttribute(
    "data-focused-feature-id",
    "north-corridor",
  );
  await expect(mapView).toHaveAttribute(
    "data-highlighted-feature-ids",
    "east-ridge,under-bridge,checkpoint-b,north-restricted-zone",
  );
  await expect(mapView).toHaveAttribute("data-center", "116.452,39.923");
  await expect(mapView).toHaveAttribute("data-zoom", "12.8");
  await expect(mapView).toHaveAttribute(
    "data-visible-layer-ids",
    "operational-constraints",
  );
  await expect(mapView).toHaveAttribute(
    "data-previewed-path-feature-id",
    "patrol-path-a",
  );
  await expect(page.getByTestId("device-marker-01")).toHaveAttribute(
    "data-highlighted",
    "false",
  );
  for (const featureId of ["east-ridge", "under-bridge", "checkpoint-b"])
    await expect(page.getByTestId(`map-feature-${featureId}`)).toHaveAttribute(
      "data-highlighted",
      "true",
    );
  await expect(page.getByTestId("map-effect-summary")).toContainText(
    "4 处高亮",
  );
  await expect(page.getByTestId("map-effect-summary")).toContainText(
    "路线预览",
  );

  await mapOperations.click();
  const mapOperationInspection = page.getByTestId("inspect-map-operations");
  await expect(page.getByTestId("inspect-map-plan")).toContainText("3 个阶段");
  await expect(mapOperationInspection).toContainText("显示任务限制图层");
  await expect(mapOperationInspection).toContainText("聚焦北侧通道");
  await expect(mapOperationInspection).toContainText("标记观察点和限制区");
  await expect(mapOperationInspection).toContainText("预览候选路线 A");
  const timeline = page.getByTestId("swimlane-timeline");
  const inspectedRunId =
    (await page.getByTestId("inspect-turn-run-id").textContent()) ?? "";
  const inspectedThreadId =
    (await page.getByTestId("inspect-turn-thread-id").textContent()) ?? "";
  expect(inspectedRunId).not.toBe("");
  expect(inspectedThreadId).not.toBe("");
  await expect(timeline.locator("[data-type='TOOL_CALL_START']")).toHaveCount(
    4,
  );
  await expect(timeline.locator("[data-type='TOOL_CALL_RESULT']")).toHaveCount(
    4,
  );
  await expect(timeline.locator("[data-type='ACTIVITY_SNAPSHOT']")).toHaveCount(
    5,
  );
  await expect(
    timeline.locator("[data-type='FRONTEND_TOOL_INVOCATION']"),
  ).toHaveCount(4);
  const frontendResults = timeline.locator(
    "[data-type='FRONTEND_TOOL_RESULT']",
  );
  await expect(frontendResults).toHaveCount(4);

  const protocolNodes = timeline.locator(
    "[data-type='TOOL_CALL_START'], [data-type='TOOL_CALL_RESULT']",
  );
  await expect(protocolNodes).toHaveCount(8);
  expect(
    await protocolNodes.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-type")),
    ),
  ).toEqual([
    "TOOL_CALL_START",
    "TOOL_CALL_RESULT",
    "TOOL_CALL_START",
    "TOOL_CALL_RESULT",
    "TOOL_CALL_START",
    "TOOL_CALL_RESULT",
    "TOOL_CALL_START",
    "TOOL_CALL_RESULT",
  ]);

  const expectedSteps = [
    {
      affectedIds: ["operational-constraints"],
      argumentIds: ["operational-constraints"],
      name: "setLayerVisibility",
    },
    {
      affectedIds: ["north-corridor"],
      argumentIds: ["north-corridor"],
      name: "focusOn",
    },
    {
      affectedIds: [
        "east-ridge",
        "under-bridge",
        "checkpoint-b",
        "north-restricted-zone",
      ],
      argumentIds: [
        "east-ridge",
        "under-bridge",
        "checkpoint-b",
        "north-restricted-zone",
      ],
      name: "highlight",
    },
    {
      affectedIds: ["patrol-path-a"],
      argumentIds: ["patrol-path-a"],
      name: "previewPath",
    },
  ] as const;
  const toolCallStarts = timeline.locator("[data-type='TOOL_CALL_START']");
  const toolCallArgs = timeline.locator("[data-type='TOOL_CALL_ARGS']");
  const standardResults = timeline.locator("[data-type='TOOL_CALL_RESULT']");
  const protocolToolCallIds: string[] = [];
  for (const [index, expectedStep] of expectedSteps.entries()) {
    await toolCallStarts.nth(index).click();
    const detail = page.getByTestId("inspect-detail");
    const startToolCallId =
      (await detail.getByTestId("inspect-tool-call-id").textContent()) ?? "";
    expect(startToolCallId).not.toBe("");
    protocolToolCallIds.push(startToolCallId);
    await expect(detail.getByTestId("inspect-run-id")).toHaveText(
      inspectedRunId,
    );
    await expect(detail.getByTestId("inspect-thread-id")).toHaveText(
      inspectedThreadId,
    );
    await expect(detail).toContainText(expectedStep.name);

    await toolCallArgs.nth(index).click();
    await expect(detail.getByTestId("inspect-tool-call-id")).toHaveText(
      startToolCallId,
    );
    for (const id of expectedStep.argumentIds)
      await expect(detail).toContainText(id);

    await standardResults.nth(index).click();
    await expect(detail.getByTestId("inspect-tool-call-id")).toHaveText(
      startToolCallId,
    );
    await expect(detail.getByTestId("inspect-run-id")).toHaveText(
      inspectedRunId,
    );
    await expect(detail.getByTestId("inspect-thread-id")).toHaveText(
      inspectedThreadId,
    );
    await expect(page.getByTestId("inspect-payload")).toContainText(
      "completed",
    );
    for (const id of expectedStep.affectedIds)
      await expect(page.getByTestId("inspect-payload")).toContainText(id);
  }

  const observedToolNames: string[] = [];
  const observedToolCallIds = new Set<string>();
  for (let index = 0; index < expectedSteps.length; index += 1) {
    await frontendResults.nth(index).click();
    const detail = page.getByTestId("inspect-detail");
    await expect(detail.getByTestId("inspect-run-id")).toHaveText(
      inspectedRunId,
    );
    await expect(detail.getByTestId("inspect-thread-id")).toHaveText(
      inspectedThreadId,
    );
    const toolCallId = await detail
      .getByTestId("inspect-tool-call-id")
      .textContent();
    expect(toolCallId).toBeTruthy();
    observedToolCallIds.add(toolCallId ?? "");
    const requestText =
      (await page.getByTestId("inspect-exchange-request").textContent()) ?? "";
    const observedName = expectedSteps
      .map((step) => step.name)
      .find((name) => requestText.includes(name));
    expect(observedName).toBeDefined();
    observedToolNames.push(observedName ?? "");
    await expect(page.getByTestId("inspect-exchange-response")).toContainText(
      "completed",
    );
    expect(
      await timeline.locator("[data-correlated='true']").count(),
    ).toBeGreaterThanOrEqual(5);
  }
  expect(observedToolNames).toEqual(expectedSteps.map((step) => step.name));
  expect(observedToolCallIds.size).toBe(4);
  expect([...observedToolCallIds]).toEqual(protocolToolCallIds);
});

test("the discovered validation Agent reaches the patrol map terminal state", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByTestId("agent-source-select")
    .selectOption("map-validation-agent");
  await expect(page.getByTestId("frontend-tool-capability-gap")).toHaveCount(0);

  await page.getByRole("button", { name: /北侧通道真实 Agent 展示/ }).click();

  const mapView = page.getByTestId("map-view");
  await expect(mapView).toHaveAttribute(
    "data-focused-feature-id",
    "north-corridor",
  );
  await expect(mapView).toHaveAttribute(
    "data-visible-layer-ids",
    "operational-constraints",
  );
  await expect(mapView).toHaveAttribute(
    "data-highlighted-feature-ids",
    "east-ridge,under-bridge,checkpoint-b,north-restricted-zone",
  );
  await expect(mapView).toHaveAttribute(
    "data-previewed-path-feature-id",
    "patrol-path-a",
  );
  await expect(page.getByTestId("map-operation-hud-current")).toContainText(
    "地图操作已完成",
  );
});

async function startPatrolRouteConsult(page: Page) {
  await page.getByRole("button", { name: /候选巡逻路线征询/ }).click();
  const consult = page.locator("[data-testid^='patrol-route-consult-']");
  await expect(consult).toBeVisible({ timeout: 15_000 });
  await expect(consult.getByTestId("consult-status")).toHaveText("executing");
  await expect(
    consult.getByTestId("patrol-route-option-route-a"),
  ).toContainText("覆盖范围较大、距离较长");
  await expect(
    consult.getByTestId("patrol-route-option-route-b"),
  ).toContainText("距离较短、东侧覆盖较少");
  return consult;
}

test("accepted decision dock requires a route choice before map-anchored revision", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /候选巡逻路线征询/ }).click();

  const dock = page.getByTestId("consult-dock");
  const mapView = page.getByTestId("map-view");
  const confirm = dock.getByTestId("dock-confirm");
  const routeA = page.getByRole("button", { name: "路线 A", exact: true });
  const routeB = page.getByRole("button", { name: "路线 B", exact: true });
  await expect(dock).toBeVisible();
  await expect(dock).toContainText("第 1 步: 先选择路线 A 或路线 B");
  await expect(dock.getByTestId("dock-revise")).toHaveCount(0);
  await expect(confirm).toBeDisabled();
  await expect(routeA).toBeDisabled();
  await expect(routeB).toBeDisabled();
  await expect(page.getByTestId("consult-revision-popup")).toHaveCount(0);

  await dock.getByTestId("dock-option-route-b").hover();
  await expect(mapView).not.toHaveAttribute(
    "data-consult-emphasized-feature-id",
    "patrol-path-b",
  );

  await dock.getByTestId("dock-option-route-b").click();
  await expect(dock.getByTestId("dock-option-route-b")).toHaveAttribute(
    "data-tentative",
    "true",
  );
  await expect(dock).toContainText("第 2 步: 点击地图中的路线 B，然后提出修改");
  await expect(confirm).toBeEnabled();
  await expect(confirm).toHaveText("确认选择路线 B");
  await expect(mapView).toHaveAttribute(
    "data-consult-emphasized-feature-id",
    "patrol-path-b",
  );
  await expect(routeA).toBeDisabled();
  await expect(routeB).toBeEnabled();
  await expect(page.getByTestId("consult-revision-popup")).toHaveCount(0);

  await routeB.click();
  const revision = page.getByTestId("consult-revision-popup");
  await expect(revision).toBeVisible();
  await expect(revision.getByTestId("revision-anchor-label")).toHaveText(
    "锚点: 路线 B",
  );
  await expect(dock).toBeVisible();

  await revision.getByTestId("revision-submit").click();
  await expect(page.getByTestId("markdown-result").last()).toContainText(
    "没有生成新路线",
  );
  await expect(page.getByTestId("map-view")).toHaveAttribute(
    "data-highlighted-feature-ids",
    "under-bridge",
  );
  await expect(page.getByTestId("consult-revision-pin")).toBeVisible();

  await page.getByRole("button", { name: /候选巡逻路线征询/ }).click();
  await expect(dock).toBeVisible({ timeout: 15_000 });
  await expect(confirm).toBeDisabled();
  await expect(dock).toContainText("第 1 步: 先选择路线 A 或路线 B");
  await dock.getByTestId("dock-cancel").click();
  await expect(page.getByTestId("markdown-result").last()).toContainText(
    "没有选择巡逻路线",
  );

  await page.getByRole("button", { name: "+ 新建" }).click();
  await expect(page.getByTestId("consult-revision-pin")).toHaveCount(0);
  await expect(page.getByTestId("consult-map-pill")).toHaveCount(0);
});

test("route A revision preserves the selected route and supports keyboard dialog flow", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /候选巡逻路线征询/ }).click();

  const dock = page.getByTestId("consult-dock");
  const routeA = page.getByRole("button", { name: "路线 A", exact: true });
  await dock.getByTestId("dock-option-route-a").click();
  await expect(routeA).toBeEnabled();
  await routeA.press("Enter");

  const dialog = page.getByRole("dialog", { name: "提出修改" });
  const instruction = dialog.getByTestId("revision-instruction");
  await expect(dialog).toBeVisible();
  await expect(instruction).toBeFocused();
  await instruction.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(routeA).toBeFocused();

  await routeA.press("Enter");
  await page.getByTestId("revision-submit").click();
  await expect(page.getByTestId("markdown-result").last()).toContainText(
    "路线 A 的修改要求",
  );
  await expect(page.getByTestId("map-view")).toHaveAttribute(
    "data-previewed-path-feature-id",
    "patrol-path-a",
  );
});

test("cancel discards an unsubmitted route revision anchor", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /候选巡逻路线征询/ }).click();

  const dock = page.getByTestId("consult-dock");
  await dock.getByTestId("dock-option-route-b").click();
  await page.getByRole("button", { name: "路线 B", exact: true }).click();
  await expect(page.getByTestId("consult-revision-pin")).toBeVisible();
  await dock.getByTestId("dock-cancel").click();

  await expect(page.getByTestId("markdown-result").last()).toContainText(
    "没有选择巡逻路线",
  );
  await expect(page.getByTestId("consult-revision-pin")).toHaveCount(0);
});

async function establishScenarioAMapContext(page: Page) {
  const mapView = page.getByTestId("map-view");
  await page.getByRole("button", { name: /北侧通道巡逻方案/ }).click();
  await expect(page.getByTestId("markdown-result").last()).toContainText(
    "初步研判已完成",
  );
  await expect(mapView).toHaveAttribute(
    "data-focused-feature-id",
    "north-corridor",
  );
  await expect(mapView).toHaveAttribute(
    "data-highlighted-feature-ids",
    "east-ridge,under-bridge,checkpoint-b,north-restricted-zone",
  );
  await expect(mapView).toHaveAttribute(
    "data-visible-layer-ids",
    "operational-constraints",
  );
  await expect(mapView).toHaveAttribute(
    "data-previewed-path-feature-id",
    "patrol-path-a",
  );
}

test("scenario B reuses scenario A context and continues route B without clearing the selection", async ({
  page,
}) => {
  await page.goto("/?consultVariant=a");
  const mapView = page.getByTestId("map-view");
  await establishScenarioAMapContext(page);
  const consult = await startPatrolRouteConsult(page);

  await consult.getByTestId("preview-route-a").click();
  await expect(mapView).toHaveAttribute(
    "data-previewed-path-feature-id",
    "patrol-path-a",
  );
  await consult.getByTestId("preview-route-b").press("Enter");
  await expect(mapView).toHaveAttribute(
    "data-previewed-path-feature-id",
    "patrol-path-b",
  );

  await page.locator("[data-testid^='inspect-turn-']").last().click();
  const waitingTimeline = page.getByTestId("swimlane-timeline");
  await expect(
    waitingTimeline.locator("[data-type='HUMAN_WAIT_STARTED']"),
  ).toHaveCount(1);
  await expect(
    waitingTimeline.locator("[data-type='TOOL_CALL_START']"),
  ).toHaveCount(1);
  await page.getByTestId("inspect-close").click();

  await mapView.evaluate((element) => {
    element.setAttribute(
      "data-preview-history",
      element.getAttribute("data-previewed-path-feature-id") ?? "<empty>",
    );
    new MutationObserver(() => {
      const history = element.getAttribute("data-preview-history") ?? "";
      const next =
        element.getAttribute("data-previewed-path-feature-id") ?? "<empty>";
      element.setAttribute("data-preview-history", `${history},${next}`);
    }).observe(element, {
      attributeFilter: ["data-previewed-path-feature-id"],
      attributes: true,
    });
  });
  await consult.getByTestId("select-route-b").click();
  await expect(mapView).toHaveAttribute(
    "data-previewed-path-feature-id",
    "patrol-path-b",
  );
  await expect(consult.getByTestId("select-route-b")).toBeDisabled();
  await expect(page.getByTestId("markdown-result").last()).toContainText(
    "尚未提交或执行巡逻任务",
  );
  await expect(mapView).toHaveAttribute(
    "data-previewed-path-feature-id",
    "patrol-path-b",
  );
  expect(await mapView.getAttribute("data-preview-history")).not.toContain(
    "<empty>",
  );

  await page.locator("[data-testid^='inspect-turn-']").last().click();
  const completedTimeline = page.getByTestId("swimlane-timeline");
  await expect(
    completedTimeline.locator("[data-type='HUMAN_WAIT_FINISHED']"),
  ).toHaveCount(1);
  await expect(
    completedTimeline.locator("[data-type='TOOL_CALL_START']"),
  ).toHaveCount(2);
  await expect(
    completedTimeline.locator("[data-type='TOOL_CALL_RESULT']"),
  ).toHaveCount(2);
  const consultStart = completedTimeline
    .locator("[data-type='TOOL_CALL_START']")
    .first();
  await consultStart.click();
  const consultToolCallId =
    (await page.getByTestId("inspect-tool-call-id").textContent()) ?? "";
  expect(consultToolCallId).not.toBe("");
  await completedTimeline
    .locator("[data-type='TOOL_CALL_RESULT']")
    .first()
    .click();
  await expect(page.getByTestId("inspect-tool-call-id")).toHaveText(
    consultToolCallId,
  );
  const previewStates = completedTimeline.locator(
    "[data-type='MAP_PREVIEW_STATE']",
  );
  await expect(previewStates).toHaveCount(3);
  await previewStates.last().click();
  await expect(page.getByTestId("inspect-payload")).toContainText("agent");
  await expect(page.getByTestId("inspect-payload")).toContainText(
    "patrol-path-b",
  );
  await expect(
    completedTimeline.locator("[data-type*='INTERRUPT']"),
  ).toHaveCount(0);
});

test("scenario B keeps human wait outside the short run deadline", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "generative-ui.workbench.settings.v1",
      JSON.stringify({ requestTimeoutMs: 1_000, showDebugDetails: false }),
    );
  });
  await page.goto("/?consultVariant=a");
  const consult = await startPatrolRouteConsult(page);

  await page.waitForTimeout(1_500);
  await expect(consult.getByTestId("consult-cancel")).toBeEnabled();
  await expect(page.getByTestId("turn-failure")).toHaveCount(0);
  await consult.getByTestId("consult-cancel").click();
  await expect(page.getByTestId("markdown-result").last()).toContainText(
    "没有选择巡逻路线",
  );
});

test("a pending non-HITL focusOn handler remains inside the run deadline", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "generative-ui.workbench.settings.v1",
      JSON.stringify({ requestTimeoutMs: 1_000, showDebugDetails: false }),
    );
    localStorage.setItem("generative-ui.workbench.e2e.hang-focus-on", "true");
  });
  await page.goto("/");
  await conversationInput(page).fill("验证 focusOn 超时边界");
  await conversationSend(page).click();

  await expect(page.getByTestId("turn-failure")).toContainText(
    "WORKBENCH_REQUEST_TIMEOUT",
  );
  await page.locator("[data-testid^='inspect-turn-']").first().click();
  const timeline = page.getByTestId("swimlane-timeline");
  await expect(timeline.locator("[data-type='TOOL_CALL_START']")).toHaveCount(
    1,
  );
  await expect(
    timeline.locator("[data-type='HUMAN_WAIT_STARTED']"),
  ).toHaveCount(0);
  await expect(timeline.locator("[data-type='RUN_TIMEOUT']")).toHaveCount(1);
});

test("scenario B maps route A selection to the existing route A path", async ({
  page,
}) => {
  await page.goto("/?consultVariant=a");
  const consult = await startPatrolRouteConsult(page);
  await consult.getByTestId("select-route-a").click();

  await expect(page.getByTestId("markdown-result").last()).toContainText(
    "已记录路线 A",
  );
  await expect(page.getByTestId("map-view")).toHaveAttribute(
    "data-previewed-path-feature-id",
    "patrol-path-a",
  );
});

test("scenario B cancel clears consult preview without a map continuation", async ({
  page,
}) => {
  await page.goto("/?consultVariant=a");
  const consult = await startPatrolRouteConsult(page);
  await consult.getByTestId("preview-route-a").click();
  await expect(page.getByTestId("map-view")).toHaveAttribute(
    "data-previewed-path-feature-id",
    "patrol-path-a",
  );

  await consult.getByTestId("consult-cancel").click();
  await expect(page.getByTestId("markdown-result").last()).toContainText(
    "没有选择巡逻路线",
  );
  await expect(page.getByTestId("map-view")).not.toHaveAttribute(
    "data-previewed-path-feature-id",
  );
  await page.locator("[data-testid^='inspect-turn-']").first().click();
  await expect(
    page
      .getByTestId("swimlane-timeline")
      .locator("[data-type='TOOL_CALL_START']"),
  ).toHaveCount(1);
});

test("scenario B revision highlights under-bridge and reuses route B", async ({
  page,
}) => {
  await page.goto("/?consultVariant=a");
  const consult = await startPatrolRouteConsult(page);
  await consult
    .getByTestId("consult-revision-input")
    .fill("避开东侧高地，重点巡逻桥下区域");
  await consult.getByTestId("consult-revise").click();

  await expect(page.getByTestId("markdown-result").last()).toContainText(
    "没有生成新路线",
  );
  await expect(page.getByTestId("map-view")).toHaveAttribute(
    "data-highlighted-feature-ids",
    "under-bridge",
  );
  await expect(page.getByTestId("map-view")).toHaveAttribute(
    "data-previewed-path-feature-id",
    "patrol-path-b",
  );
});

test("stopping scenario B invalidates the old consultation", async ({
  page,
}) => {
  await page.goto("/?consultVariant=a");
  const consult = await startPatrolRouteConsult(page);
  await consult.getByTestId("preview-route-a").click();
  await page.getByRole("button", { name: "停止生成" }).click();

  await expect(page.getByTestId("turn-failure")).toContainText(
    "WORKBENCH_REQUEST_CANCELLED",
  );
  await expect(consult.getByTestId("select-route-a")).toBeDisabled();
  await expect(page.getByTestId("map-view")).not.toHaveAttribute(
    "data-previewed-path-feature-id",
  );
});

test("switching Agent Source removes the old consultation and its preview", async ({
  page,
}) => {
  await page.goto("/?consultVariant=a");
  const consult = await startPatrolRouteConsult(page);
  await consult.getByTestId("preview-route-b").click();
  await expect(page.getByTestId("map-view")).toHaveAttribute(
    "data-previewed-path-feature-id",
    "patrol-path-b",
  );

  await page
    .getByTestId("agent-source-select")
    .selectOption("single-agent-chat-server");
  await expect(consult).toHaveCount(0);
  await expect(page.getByTestId("map-view")).not.toHaveAttribute(
    "data-previewed-path-feature-id",
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

test("legacy locateDevice compatibility preserves its full observable terminal state", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("device-card")).toHaveCount(0);

  await page.getByRole("button", { name: "定位测试设备" }).click();

  await expect(page.getByTestId("device-marker-01")).toHaveAttribute(
    "data-selected",
    "true",
  );
  await expect(page.getByTestId("device-marker-01")).toHaveAttribute(
    "data-highlighted",
    "true",
  );
  await expect(page.getByTestId("map-view")).toHaveAttribute(
    "data-focused-feature-id",
    "01",
  );
  await expect(page.getByTestId("map-view")).toHaveAttribute(
    "data-center",
    "116.3974,39.9093",
  );
  await expect(page.getByTestId("map-view")).toHaveAttribute("data-zoom", "14");
  await expect(page.getByTestId("device-card")).toContainText("无人机 01");
  await expect(page.getByTestId("device-card")).toContainText("82%");
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

test("Inspect shows the migrated locate loop with real correlation", async ({
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

  const results = timeline.locator("[data-type='FRONTEND_TOOL_RESULT']");
  await expect(results).toHaveCount(2);
  const result = results.last();
  await expect(result).toHaveAttribute("data-status", "ok");

  await result.click();
  const detail = page.getByTestId("inspect-detail");
  // 请求 / 返回配对：invocation args 与 result 真实成对呈现
  await expect(page.getByTestId("inspect-exchange-request")).toContainText(
    "highlight",
  );
  await expect(page.getByTestId("inspect-exchange-response")).toContainText(
    "completed",
  );
  await expect(detail).toContainText("toolCall");

  // Tool Call / Tool Result 之间的真实关联被高亮
  const correlatedCount = await timeline
    .locator("[data-correlated='true']")
    .count();
  expect(correlatedCount).toBeGreaterThanOrEqual(2);
  await expect(
    timeline.locator("[data-type='TOOL_CALL_END']").last(),
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
