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
  await expect(publicPlan).toContainText("Agent 正在处理地图");
  await expect(publicPlan).toContainText("北侧通道巡逻候选方案");
  await expect(publicPlan).not.toContainText("确认任务范围与限制");

  await expect(page.getByTestId("markdown-result")).toContainText(
    "限制图层已显示",
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
  await expect(publicPlan).toHaveCount(0);
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
