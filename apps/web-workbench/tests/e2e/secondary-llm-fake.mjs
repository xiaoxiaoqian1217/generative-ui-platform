/**
 * Deterministic Secondary LLM double for CI e2e (Issue #210 test strategy).
 *
 * The fake is injected into the Runtime through `createRuntimeHandler`'s
 * `invokeSubagent` option, so no real model call happens in CI. In "valid"
 * mode it parses the controlled business content out of the composed prompt
 * and answers with a catalog-legal surface that binds the actual business
 * facts, proving the content really flows through the generation chain.
 */

const VALID_MODES = new Set(["valid", "invalid", "down", "action"]);

/**
 * A catalog-legal surface that deliberately carries an action, exercising the
 * Issue #210 boundary: generated actions are recorded in Inspect only and
 * must never travel back to the Business Agent this phase.
 */
const ACTION_ARGS = {
  surfaceId: "inspection-summary-dynamic",
  components: [
    { id: "root", component: "Card", child: "col" },
    { id: "col", component: "Column", children: ["title", "retry"] },
    { id: "title", component: "Text", text: { path: "/title" }, variant: "h3" },
    {
      id: "retry",
      component: "Button",
      child: "retry-label",
      action: { event: { name: "retry_inspection" } },
    },
    { id: "retry-label", component: "Text", text: "重试巡检" },
  ],
  data: { title: "巡检结果" },
};

function extractBusinessContent(prompt) {
  const marker = "## Business content";
  const markerIndex = prompt.indexOf(marker);
  if (markerIndex === -1) return undefined;
  const rest = prompt.slice(markerIndex + marker.length);
  const nextHeading = rest.indexOf("\n## ");
  const section = nextHeading === -1 ? rest : rest.slice(0, nextHeading);
  const start = section.indexOf("{");
  const end = section.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return undefined;
  try {
    const parsed = JSON.parse(section.slice(start, end + 1));
    return parsed && typeof parsed === "object" ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Generic surface for Scenario Lab content (Issue #213): unlike the
 * conversation fixtures, scenario content is a raw business JSON value with
 * no `payload` envelope. Bind every top-level key so the fact check can
 * verify each value really travels through the generation chain.
 */
function buildGenericArgs(content) {
  const keys = Object.keys(content);
  const children = keys.map((key) => `row-${key}`);
  const components = [
    { id: "root", component: "Card", child: "list" },
    { id: "list", component: "Column", children },
  ];
  for (const key of keys) {
    components.push({
      id: `row-${key}`,
      component: typeof content[key] === "number" ? "Metric" : "InfoRow",
      label: key,
      value: { path: `/value/${key}` },
    });
  }
  return {
    surfaceId: "scenario-lab-generic",
    components,
    data: { value: content },
  };
}

function buildValidArgs(payload) {
  return {
    surfaceId: "inspection-summary-dynamic",
    components: [
      { id: "root", component: "Card", child: "summary" },
      {
        id: "summary",
        component: "Column",
        children: ["status", "metrics", "details"],
      },
      {
        id: "status",
        component: "StatusBadge",
        label: payload.status === "completed" ? "已完成" : "进行中",
        variant: payload.errorDevices > 0 ? "warning" : "success",
      },
      {
        id: "metrics",
        component: "Row",
        children: ["metric-total", "metric-ok", "metric-error", "metric-rate"],
      },
      {
        id: "metric-total",
        component: "Metric",
        label: "设备总数",
        value: { path: "/facts/total" },
        weight: 1,
      },
      {
        id: "metric-ok",
        component: "Metric",
        label: "正常数量",
        value: { path: "/facts/ok" },
        weight: 1,
      },
      {
        id: "metric-error",
        component: "Metric",
        label: "异常数量",
        value: { path: "/facts/error" },
        weight: 1,
      },
      {
        id: "metric-rate",
        component: "Metric",
        label: "完成率",
        value: { path: "/facts/rate" },
        weight: 1,
      },
      {
        id: "details",
        component: "Column",
        children: ["detail-start", "detail-duration", "detail-area"],
      },
      {
        id: "detail-start",
        component: "InfoRow",
        label: "开始时间",
        value: { path: "/facts/startedAt" },
      },
      {
        id: "detail-duration",
        component: "InfoRow",
        label: "执行耗时",
        value: { path: "/facts/duration" },
      },
      {
        id: "detail-area",
        component: "InfoRow",
        label: "执行区域",
        value: { path: "/facts/area" },
      },
    ],
    data: {
      facts: {
        total: payload.totalDevices,
        ok: payload.okDevices,
        error: payload.errorDevices,
        rate: `${Math.round(payload.completionRate * 100)}%`,
        startedAt: payload.startedAt,
        duration: `${payload.durationMinutes} 分钟`,
        area: payload.area,
      },
    },
  };
}

export function createSecondaryLlmFake() {
  const state = {
    mode: "valid",
    observations: [],
  };
  return {
    get observations() {
      return state.observations;
    },
    invokeSubagent: async (prompt, attempt) => {
      if (state.mode === "down") {
        throw new Error("A2UI_SECONDARY_LLM_UNAVAILABLE");
      }
      if (state.mode === "invalid") {
        const args = {
          components: [{ id: "root", component: "DeviceCard" }],
          data: {},
        };
        state.observations.push({ args, attempt, prompt });
        return args;
      }
      if (state.mode === "action") {
        state.observations.push({ args: ACTION_ARGS, attempt, prompt });
        return ACTION_ARGS;
      }
      const content = extractBusinessContent(prompt);
      if (content === undefined) return null;
      const args =
        content.payload && typeof content.payload === "object"
          ? buildValidArgs(content.payload)
          : buildGenericArgs(content);
      state.observations.push({ args, attempt, prompt });
      return args;
    },
    reset() {
      state.mode = "valid";
      state.observations.length = 0;
    },
    setMode(mode) {
      if (!VALID_MODES.has(mode)) {
        throw new Error(`UNKNOWN_SECONDARY_LLM_MODE_${mode}`);
      }
      state.mode = mode;
    },
  };
}
