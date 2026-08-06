<script setup lang="ts">
import type {
  RuntimeRunRequest,
  RuntimeRunResult,
} from "@generative-ui/runtime-contract";
import type { Message } from "@ag-ui/core";
import {
  computed,
  defineAsyncComponent,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
} from "vue";
import {
  createConversationState,
  conversationMessages,
  failOperation,
  resolveAction,
  resolveRun,
  setConversationInput,
  startAction,
  startRun,
  restoreConversationHistory,
  type ConversationState,
  type TurnFailure,
} from "../conversation/conversation-store.js";
import { archiveRuntimeThread, createRuntimeThread, deleteRuntimeThread, getRuntimeThread, listRuntimeThreads, renameRuntimeThread } from "../runtime/thread-client.js";
import type { RuntimeThread } from "@generative-ui/runtime-contract";
import DiagnosticsPanel from "../diagnostics/DiagnosticsPanel.vue";
import CatalogComponentPreview from "../catalog/CatalogComponentPreview.vue";
import A2UIRawViewer from "../renderer/A2UIRawViewer.vue";
import type { RenderedRuntimeAction } from "../renderer/a2ui.js";
import PresentationResultViewer from "../renderer/PresentationResultViewer.vue";
import { probeRuntimeHealth } from "../runtime/health.js";
import {
  fetchReadOnlyRuntimeData,
  parseRuntimeCatalogSummary,
  parseRuntimeScenarios,
  type RuntimeCatalogSummary,
  type RuntimeScenarioSummary,
} from "../runtime/read-only-client.js";
import { createCopilotKitHeadlessClient } from "../runtime/copilotkit-headless-client.js";
import {
  type ConnectionState,
  type RuntimeTransportClient,
  WorkbenchRuntimeError,
} from "../runtime/types.js";
import {
  createRuntimeEndpoints,
  resolveWorkbenchConfig,
  type WorkbenchConfig,
} from "../settings/runtime-config.js";
import {
  loadWorkbenchLocalSettings,
  saveWorkbenchLocalSettings,
} from "../settings/local-settings.js";
import { quickScenarios } from "./scenarios.js";
import {
  BUILTIN_CASES,
  exportCustomCases,
  importCustomCases,
  loadCustomCases,
  loadCaseFailureDiagnosis,
  consumePendingCase,
  saveCustomCases,
  saveCaseFailureDiagnosis,
  savePendingCase,
  evaluateCase,
  type CaseEvaluation,
  type WorkbenchCase,
} from "../cases/case-library.js";
import {
  loadInspectionSnapshot,
  saveInspectionSnapshot,
  type InspectionSnapshot,
} from "../inspect/inspection-snapshot.js";
import {
  resolveWorkbenchRoute,
  workbenchRouteLabel,
  WORKBENCH_ROUTES,
} from "./routes.js";

const ControlledCopilotChatView = defineAsyncComponent(
  () => import("../conversation/ControlledCopilotChatView.vue"),
);
const CopilotKitConversationProvider = defineAsyncComponent(
  () => import("../conversation/CopilotKitConversationProvider.vue"),
);
// PROTOTYPE(issue-179)：仅开发环境且存在 ?variant= 参数时启用。
const PrototypeExecutionMap = import.meta.env.DEV
  ? defineAsyncComponent(
      () => import("../prototype/execution-map/PrototypeExecutionMap.vue"),
    )
  : undefined;
const showExecutionMapPrototype =
  import.meta.env.DEV &&
  new URLSearchParams(window.location.search).has("variant");

type RunState =
  | "idle"
  | "running"
  | "rendering"
  | "completed"
  | "degraded"
  | "failed"
  | "cancelled";

interface DisplayError {
  code: string;
  message: string;
  path?: string;
  retryable: boolean;
  stage?: string;
}

const configResolution:
  | { config: WorkbenchConfig; error?: never }
  | {
      config?: never;
      error: string;
    } = (() => {
  try {
    return {
      config: resolveWorkbenchConfig(
        window.__GEN_UI_WORKBENCH_CONFIG__ ?? {},
        {
          VITE_RUNTIME_HOST_URL: import.meta.env.VITE_RUNTIME_HOST_URL,
          VITE_WORKBENCH_ENVIRONMENT: import.meta.env
            .VITE_WORKBENCH_ENVIRONMENT,
        },
        window.location.origin,
      ),
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "WORKBENCH_CONFIG_INVALID",
    };
  }
})();

const initialLocalSettings = loadWorkbenchLocalSettings(window.localStorage);
const fallbackConfig: WorkbenchConfig = {
  environment: "invalid",
  runtimeHostUrl: window.location.origin,
};
const configured = configResolution.config ?? fallbackConfig;
const config =
  initialLocalSettings.runtimeHostUrl === undefined
    ? configured
    : resolveWorkbenchConfig(
        {
          environment: configured.environment,
          runtimeHostUrl: initialLocalSettings.runtimeHostUrl,
        },
        {},
        window.location.origin,
      );
const endpoints = createRuntimeEndpoints(config.runtimeHostUrl);
const pendingCase = consumePendingCase(window.sessionStorage);
const configurationError = configResolution.error;
const workbenchVersion = __WORKBENCH_VERSION__;

const connectionState = ref<ConnectionState>("connecting");
const connectionNotice = ref("正在探测 Runtime Host");
const runState = ref<RunState>("idle");
const conversation = shallowRef<ConversationState>(
  createConversationState(pendingCase?.input ?? quickScenarios[0]?.message ?? ""),
);
const input = computed({
  get: () => conversation.value.inputValue,
  set: (value: string) => {
    conversation.value = setConversationInput(conversation.value, value);
  },
});
const messages = computed<readonly Message[]>(() =>
  conversationMessages(conversation.value),
);
const currentTurn = computed(() => conversation.value.turns.at(-1));
const result = computed(() => currentTurn.value?.runtimeResult);
const conversationThreadId = computed(() => {
  for (const turn of [...conversation.value.turns].reverse()) {
    if (turn.threadId !== undefined) return turn.threadId;
  }
  return undefined;
});
const configurationFailure = ref<DisplayError>();
const error = computed<DisplayError | undefined>(() => configurationFailure.value);
const refreshNotice = ref("");
const activeController = ref<AbortController>();
const route = ref(resolveWorkbenchRoute(window.location.pathname));
const settingsRuntimeHostUrl = ref(config.runtimeHostUrl);
const settingsTimeoutMs = ref(String(initialLocalSettings.requestTimeoutMs));
const settingsShowDebugDetails = ref(initialLocalSettings.showDebugDetails);
const settingsNotice = ref("");
const catalog = ref<RuntimeCatalogSummary>();
const scenarios = ref<readonly RuntimeScenarioSummary[]>();
const readOnlyNotice = ref("");
const customCases = ref<readonly WorkbenchCase[]>(loadCustomCases(window.localStorage));
const caseImport = ref("");
const caseNotice = ref("");
const activeCase = ref<WorkbenchCase | undefined>(pendingCase);
const caseEvaluation = ref<CaseEvaluation>();
const latestCaseFailure = ref(loadCaseFailureDiagnosis(window.localStorage));
const allCases = computed(() => [...BUILTIN_CASES, ...customCases.value]);
const inspection = ref<InspectionSnapshot | undefined>(loadInspectionSnapshot(window.sessionStorage));
const threads = ref<readonly RuntimeThread[]>([]);
const nextThreadCursor = ref<string>();
const selectedThreadId = ref<string>();
const threadNotice = ref("");

let client: RuntimeTransportClient | undefined;
let clientGeneration = 0;
let healthTimer: ReturnType<typeof globalThis.setInterval> | undefined;

const connectionLabels: Record<ConnectionState, string> = {
  connected: "Runtime Host 可用",
  connecting: "正在连接",
  disconnected: "连接已关闭",
  reconnecting: "连接中断，正在重连",
  unavailable: "Runtime Host 不可用",
};

const runLabels: Record<RunState, string> = {
  cancelled: "已取消",
  completed: "已完成",
  degraded: "已安全降级",
  failed: "运行失败",
  idle: "等待发送",
  rendering: "正在渲染",
  running: "Agent 运行中",
};

const a2uiOperations = computed(() => {
  const value = result.value?.presentation;
  return value && "mode" in value && value.mode === "generative-ui"
    ? value.operations
    : undefined;
});
const canSend = computed(
  () =>
    input.value.trim().length > 0 &&
    runState.value !== "running" &&
    runState.value !== "rendering" &&
    connectionState.value === "connected" &&
    configurationError === undefined,
);
const isInputDisabled = computed(
  () =>
    connectionState.value !== "connected" ||
    configurationError !== undefined ||
    conversation.value.activeOperation !== undefined,
);
const activeEndpoint = computed(() => endpoints.copilotKit);

function applyConnectionState(next: ConnectionState): void {
  const previous = connectionState.value;
  connectionState.value = next;
  if (
    next === "connected" &&
    (previous === "unavailable" ||
      previous === "reconnecting" ||
      previous === "disconnected")
  ) {
    connectionNotice.value = "Runtime Host 服务连接已恢复";
    return;
  }
  connectionNotice.value = connectionLabels[next];
}

async function probeHealth(generation: number): Promise<void> {
  const state = await probeRuntimeHealth(endpoints.health);
  if (generation === clientGeneration) {
    applyConnectionState(state);
  }
}

function configureHeadlessRuntime(): void {
  clientGeneration += 1;
  const generation = clientGeneration;
  client?.close();
  client = undefined;
  activeController.value?.abort();
  if (healthTimer !== undefined) {
    globalThis.clearInterval(healthTimer);
    healthTimer = undefined;
  }

  if (configurationError !== undefined) {
    applyConnectionState("unavailable");
    configurationFailure.value = {
      code: configurationError,
      message:
        "Runtime Host 地址配置无效，请检查 runtime-config.js 或 VITE_RUNTIME_HOST_URL。",
      retryable: false,
      stage: "configuration",
    };
    return;
  }

  const onConnectionStateChange = (state: ConnectionState) => {
    if (generation === clientGeneration) {
      applyConnectionState(state);
    }
  };

  applyConnectionState("connecting");
  client = createCopilotKitHeadlessClient({
    actionEndpoint: endpoints.actions,
    runtimeUrl: endpoints.copilotKit,
    timeoutMs: initialLocalSettings.requestTimeoutMs,
    onConnectionStateChange,
  });
  client.connect();
  void probeHealth(generation);
  healthTimer = globalThis.setInterval(() => {
    void probeHealth(generation);
  }, 3_000);
}

function createId(prefix: string): string {
  return (
    globalThis.crypto.randomUUID?.() ??
    `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

function createRequest(message: string): RuntimeRunRequest {
  const requestId = createId("request");
  return {
    protocolVersion: "1.0",
    requestId,
    runId: createId("run"),
    ...(conversationThreadId.value === undefined
      ? {}
      : { threadId: conversationThreadId.value }),
    message: { role: "user", content: message },
    presentation: {
      context: {
        locale: navigator.language,
        theme: "workbench",
        viewport: {
          height: window.innerHeight,
          width: window.innerWidth,
        },
      },
    },
  };
}

function platformErrorFromResult(
  value: RuntimeRunResult,
): DisplayError | undefined {
  if (value.status !== "failed") {
    return undefined;
  }
  return {
    code: value.error.code,
    message: value.error.message,
    ...(value.error.path === undefined ? {} : { path: value.error.path }),
    retryable: value.error.retryable,
    stage: "runtime",
  };
}

function displayErrorFromUnknown(value: unknown): DisplayError {
  if (value instanceof WorkbenchRuntimeError) {
    return {
      code: value.code,
      message: value.message,
      ...(value.path === undefined ? {} : { path: value.path }),
      retryable: value.retryable,
      stage: "transport",
    };
  }
  return {
    code: "WORKBENCH_UNEXPECTED_ERROR",
    message: "Workbench 处理请求时发生未知错误。",
    retryable: true,
    stage: "workbench",
  };
}

function turnFailure(error: DisplayError): TurnFailure {
  return {
    code: error.code,
    message: error.message,
    retryable: error.retryable,
    ...(error.stage === undefined ? {} : { stage: error.stage }),
  };
}

async function sendMessage(message = input.value): Promise<void> {
  const normalizedMessage = message.trim();
  if (!client || normalizedMessage === "" || !canSend.value) {
    return;
  }

  const request = createRequest(normalizedMessage);
  const turnId = `turn-${request.requestId}`;
  const nextConversation = startRun(conversation.value, {
    message: normalizedMessage,
    requestId: request.requestId,
    turnId,
  });
  if (nextConversation === conversation.value) return;
  conversation.value = nextConversation;
  const controller = new AbortController();
  activeController.value = controller;
  runState.value = "running";

  try {
    const runtimeResult = await client.run(
      request,
      controller.signal,
    );
    if (activeCase.value !== undefined) {
      caseEvaluation.value = evaluateCase(
        activeCase.value.expectation,
        runtimeResult,
      );
      caseNotice.value = caseEvaluation.value.passed
        ? `用例“${activeCase.value.title}”通过语义断言。`
        : `用例“${activeCase.value.title}”失败：${caseEvaluation.value.failures.join(" ")}`;
    }
    if (activeCase.value !== undefined && caseEvaluation.value?.passed === false) {
      saveCaseFailureDiagnosis(
        window.localStorage,
        activeCase.value.id,
        caseEvaluation.value,
      );
      latestCaseFailure.value = loadCaseFailureDiagnosis(window.localStorage);
    }
    saveInspectionSnapshot(window.sessionStorage, runtimeResult);
    inspection.value = loadInspectionSnapshot(window.sessionStorage);
    if (runtimeResult.status === "failed") {
      const failure = platformErrorFromResult(runtimeResult);
      if (failure !== undefined)
        conversation.value = failOperation(conversation.value, turnId, turnFailure(failure));
      runState.value = "failed";
      return;
    }

    conversation.value = resolveRun(conversation.value, turnId, runtimeResult);
    selectedThreadId.value = runtimeResult.threadId;
    void refreshThreads();

    runState.value = "rendering";
    await nextTick();
    runState.value = runtimeResult.status;
  } catch (caught) {
    const displayError = displayErrorFromUnknown(caught);
    conversation.value = failOperation(
      conversation.value,
      turnId,
      turnFailure(displayError),
      displayError.code === "WORKBENCH_REQUEST_CANCELLED" ? "cancelled" : "failed",
    );
    runState.value =
      displayError.code === "WORKBENCH_REQUEST_CANCELLED"
        ? "cancelled"
        : "failed";
  } finally {
    if (activeController.value === controller) {
      activeController.value = undefined;
    }
  }
}

function cancelRequest(): void {
  activeController.value?.abort();
}

function retryTurn(turnId: string): void {
  const turn = conversation.value.turns.find((item) => item.turnId === turnId);
  if (turn === undefined || turn.failure?.retryable !== true) return;
  input.value = turn.userMessage.content;
  void sendMessage(turn.userMessage.content);
}

function selectScenario(message: string): void {
  input.value = message;
}

async function handleA2UIAction(rendered: RenderedRuntimeAction): Promise<void> {
  if (
    !client ||
    !result.value ||
    result.value.status === "failed" ||
    conversation.value.activeOperation !== undefined
  )
    return;
  if (
    rendered.requiresConfirmation &&
    !window.confirm(
      rendered.destructive
        ? "此高风险操作将继续执行。确认吗？"
        : "此操作需要确认。确认吗？",
    )
  )
    return;
  const turn = conversation.value.turns.find((item) =>
    item.businessSurfaces.some(
      (surface) =>
        surface.surfaceId === rendered.action.surfaceId && surface.status === "active",
    ),
  );
  if (turn === undefined || turn.runtimeResult === undefined) return;
  const requestId = createId("action");
  const nextConversation = startAction(conversation.value, {
    requestId,
    surfaceId: rendered.action.surfaceId,
    turnId: turn.turnId,
  });
  if (nextConversation === conversation.value) return;
  conversation.value = nextConversation;
  const controller = new AbortController();
  activeController.value = controller;
  runState.value = "running";
  try {
    const actionResult = await client.action({
      protocolVersion: "1.0",
      requestId,
      threadId: turn.runtimeResult.threadId,
      runId: turn.runtimeResult.runId,
      action: {
        ...rendered.action,
        ...(rendered.requiresConfirmation ? { approved: true } : {}),
      },
    }, controller.signal);
    saveInspectionSnapshot(window.sessionStorage, actionResult);
    inspection.value = loadInspectionSnapshot(window.sessionStorage);
    if (actionResult.status === "failed") {
      const failure = platformErrorFromResult(actionResult);
      if (failure !== undefined)
        conversation.value = failOperation(
          conversation.value,
          turn.turnId,
          turnFailure(failure),
        );
      runState.value = "failed";
      return;
    }
    conversation.value = resolveAction(conversation.value, turn.turnId, actionResult);
    runState.value = "rendering";
    await nextTick();
    runState.value = actionResult.status;
  } catch (caught) {
    const displayError = displayErrorFromUnknown(caught);
    conversation.value = failOperation(
      conversation.value,
      turn.turnId,
      turnFailure(displayError),
      displayError.code === "WORKBENCH_REQUEST_CANCELLED" ? "cancelled" : "failed",
    );
    runState.value =
      displayError.code === "WORKBENCH_REQUEST_CANCELLED"
        ? "cancelled"
        : "failed";
  } finally {
    if (activeController.value === controller) activeController.value = undefined;
  }
}

function reconnect(): void {
  configureHeadlessRuntime();
}

async function refreshThreads(): Promise<void> {
  try { const page = await listRuntimeThreads(endpoints.threads); threads.value = page.items; nextThreadCursor.value = page.nextCursor; threadNotice.value = ""; } catch { threadNotice.value = "无法加载调试会话。"; }
}

async function loadMoreThreads(): Promise<void> { if (nextThreadCursor.value === undefined) return; try { const page = await listRuntimeThreads(endpoints.threads, nextThreadCursor.value); threads.value = [...threads.value, ...page.items]; nextThreadCursor.value = page.nextCursor; } catch { threadNotice.value = "无法加载更多会话。"; } }

async function selectThread(threadId: string): Promise<void> {
  try { const detail = await getRuntimeThread(endpoints.threads, threadId); selectedThreadId.value = detail.thread.threadId; conversation.value = restoreConversationHistory(detail); runState.value = "idle"; } catch { threadNotice.value = "无法加载会话历史。"; }
}

async function newThread(): Promise<void> {
  try { const thread = await createRuntimeThread(endpoints.threads); await refreshThreads(); await selectThread(thread.threadId); } catch { threadNotice.value = "无法创建调试会话。"; }
}

async function removeThread(threadId: string): Promise<void> {
  try { const status = await deleteRuntimeThread(endpoints.threads, threadId); threadNotice.value = status === "completed" ? "会话已删除。" : `删除结果：${status}`; if (selectedThreadId.value === threadId) { selectedThreadId.value = undefined; conversation.value = createConversationState(); } await refreshThreads(); } catch { threadNotice.value = "删除会话失败。"; }
}

async function renameThread(thread: RuntimeThread): Promise<void> { const title = window.prompt("会话名称", thread.title); if (!title?.trim()) return; try { await renameRuntimeThread(endpoints.threads, thread.threadId, title); await refreshThreads(); } catch { threadNotice.value = "重命名会话失败。"; } }
async function archiveThread(threadId: string): Promise<void> { try { await archiveRuntimeThread(endpoints.threads, threadId); await refreshThreads(); } catch { threadNotice.value = "归档会话失败。"; } }

async function loadReadOnlyData(): Promise<void> {
  if (route.value !== "/catalog" && route.value !== "/scenarios") return;
  readOnlyNotice.value = "正在读取 Runtime Host 元数据…";
  try {
    if (route.value === "/catalog") {
      catalog.value = await fetchReadOnlyRuntimeData(
        endpoints.catalog,
        parseRuntimeCatalogSummary,
      );
    } else {
      scenarios.value = await fetchReadOnlyRuntimeData(
        endpoints.scenarios,
        parseRuntimeScenarios,
      );
    }
    readOnlyNotice.value = "";
  } catch {
    readOnlyNotice.value = "Runtime Host 元数据当前不可用或未通过只读契约校验。";
  }
}

function saveSettings(): void {
  const parsedTimeout = Number(settingsTimeoutMs.value);
  try {
    const runtimeUrl = new URL(settingsRuntimeHostUrl.value);
    if (
      (runtimeUrl.protocol !== "http:" && runtimeUrl.protocol !== "https:") ||
      runtimeUrl.username !== "" ||
      runtimeUrl.password !== "" ||
      !Number.isSafeInteger(parsedTimeout) ||
      parsedTimeout < 1_000 ||
      parsedTimeout > 300_000
    )
      throw new Error("invalid-settings");
    const saved = saveWorkbenchLocalSettings(window.localStorage, {
      runtimeHostUrl: settingsRuntimeHostUrl.value,
      requestTimeoutMs: parsedTimeout,
      showDebugDetails: settingsShowDebugDetails.value,
    });
    settingsNotice.value = "设置已保存在此浏览器。正在重新加载连接配置。";
    window.setTimeout(() => window.location.reload(), 100);
    void saved;
  } catch {
    settingsNotice.value = "设置无效。Runtime Host 必须是 HTTP(S) 地址，超时必须在 1,000 到 300,000 毫秒之间。";
  }
}

function exportCases(): void {
  caseImport.value = exportCustomCases(customCases.value);
  caseNotice.value = "已导出本地自定义案例 JSON。";
}

function importCases(): void {
  try {
    customCases.value = importCustomCases(caseImport.value);
    saveCustomCases(window.localStorage, customCases.value);
    caseNotice.value = "已导入并保存本地自定义案例。";
  } catch {
    caseNotice.value = "案例 JSON 无效，未修改本地案例库。";
  }
}

function replayCase(item: WorkbenchCase): void {
  savePendingCase(window.sessionStorage, item);
  window.location.assign("/playground");
}

onMounted(() => {
  window.addEventListener("popstate", () => {
    route.value = resolveWorkbenchRoute(window.location.pathname);
  });
  const navigation = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  if (navigation?.type === "reload") {
    refreshNotice.value =
      "页面已刷新，本地运行记录已重置，Runtime Host 配置已重新加载。";
  }
  configureHeadlessRuntime();
  void refreshThreads();
  void loadReadOnlyData();
  if (pendingCase !== undefined) window.setTimeout(() => void sendMessage(pendingCase.input), 0);
});

onBeforeUnmount(() => {
  clientGeneration += 1;
  activeController.value?.abort();
  client?.close();
  if (healthTimer !== undefined) {
    globalThis.clearInterval(healthTimer);
  }
});
</script>

<template>
  <div class="workbench-shell">
    <header class="topbar">
      <div class="brand-lockup">
        <div class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></div>
        <div>
          <p class="eyebrow">GENERATIVE UI PLATFORM</p>
          <h1>Workbench</h1>
        </div>
      </div>
      <div class="banner" data-testid="environment-banner">
        <span class="banner-label">ENV</span>
        <strong>{{ config.environment }}</strong>
        <span class="banner-divider"></span>
        <span class="banner-label">VERSION</span>
        <strong>v{{ workbenchVersion }}</strong>
      </div>
    </header>

    <nav class="workbench-nav" aria-label="Workbench">
      <a
        v-for="item in WORKBENCH_ROUTES"
        :key="item"
        :class="{ active: route === item }"
        :href="item"
      >
        {{ workbenchRouteLabel(item) }}
      </a>
    </nav>

    <main v-if="route === '/playground'" class="workspace">
      <aside class="control-rail">
        <section class="rail-section" data-testid="thread-list">
          <div class="section-heading"><div><p class="eyebrow">DEBUG HISTORY</p><h2>调试会话</h2></div><button class="secondary-button" type="button" @click="newThread">新建</button></div>
          <p v-if="threadNotice">{{ threadNotice }}</p>
          <p v-if="threads.length === 0">暂无会话。</p>
          <div class="scenario-list"><div v-for="thread in threads" :key="thread.threadId"><button class="scenario-button" :class="{ active: selectedThreadId === thread.threadId }" type="button" @click="selectThread(thread.threadId)"><strong>{{ thread.title }}</strong><span>{{ thread.status }}</span></button><button class="secondary-button" type="button" @click="renameThread(thread)">重命名</button><button class="secondary-button" type="button" @click="archiveThread(thread.threadId)">归档</button><button class="secondary-button" type="button" @click="removeThread(thread.threadId)">删除</button></div></div>
          <button v-if="nextThreadCursor" class="secondary-button full" type="button" @click="loadMoreThreads">加载更多</button>
        </section>
        <section class="rail-section runtime-card">
          <div class="section-heading">
            <div>
              <p class="eyebrow">RUNTIME</p>
              <h2>连接控制</h2>
            </div>
            <span class="status-dot" :data-state="connectionState"></span>
          </div>
          <div class="runtime-host">
            <span>Agent Runtime Host</span>
            <code data-testid="runtime-host-url">{{ config.runtimeHostUrl }}</code>
          </div>
          <p class="endpoint-line">CopilotKit Headless</p>
          <div class="connection-readout" :data-state="connectionState">
            <strong data-testid="connection-status">{{ connectionLabels[connectionState] }}</strong>
            <span data-testid="connection-notice">{{ connectionNotice }}</span>
          </div>
          <button class="secondary-button full" type="button" @click="reconnect">
            重新探测 / 连接
          </button>
          <p class="endpoint-line">当前端点 <code>{{ activeEndpoint }}</code></p>
        </section>

        <section class="rail-section">
          <div class="section-heading">
            <div>
              <p class="eyebrow">SCENARIOS</p>
              <h2>快捷输入</h2>
            </div>
            <span class="count-badge">{{ quickScenarios.length }}</span>
          </div>
          <div class="scenario-list">
            <button
              v-for="scenario in quickScenarios"
              :key="scenario.id"
              class="scenario-button"
              type="button"
              @click="selectScenario(scenario.message)"
            >
              <strong>{{ scenario.label }}</strong>
              <span>{{ scenario.description }}</span>
            </button>
          </div>
        </section>

        <section class="rail-section boundary-note">
          <p class="eyebrow">ARCHITECTURE BOUNDARY</p>
          <p>浏览器仅连接 Agent Runtime Host。</p>
          <p>无 Compiler URL、Agent 私有地址或模型密钥。</p>
        </section>
      </aside>

      <section class="main-stage">
        <div v-if="refreshNotice" class="refresh-notice" data-testid="refresh-notice">
          {{ refreshNotice }}
        </div>

        <section class="composer-card conversation-card">
          <div class="composer-header">
            <div>
              <p class="eyebrow">PLAYGROUND</p>
              <h2>受控会话</h2>
            </div>
            <div class="run-state" :data-state="runState" data-testid="run-status">
              <span></span>{{ runLabels[runState] }}
            </div>
          </div>
          <CopilotKitConversationProvider
            :runtime-url="endpoints.copilotKit"
            data-testid="copilotkit-conversation"
          >
            <ControlledCopilotChatView
              :input-value="input"
              :is-action-disabled="conversation.activeOperation !== undefined"
              :is-input-disabled="isInputDisabled"
              :is-running="runState === 'running' || runState === 'rendering'"
              :messages="[...messages]"
              :turns="conversation.turns"
              data-testid="controlled-copilot-chat"
              @action="handleA2UIAction"
              @input-change="input = $event"
              @retry="retryTurn"
              @stop="cancelRequest"
              @submit-message="sendMessage($event)"
            />
          </CopilotKitConversationProvider>
        </section>

        <section v-if="error" class="error-card" data-testid="error-state">
          <div class="error-icon">!</div>
          <div class="error-copy">
            <p class="eyebrow">{{ error.stage ?? "error" }}</p>
            <h3>{{ error.code }}</h3>
            <p>{{ error.message }}</p>
            <code v-if="error.path">字段路径：{{ error.path }}</code>
          </div>
        </section>

        <div v-if="result" class="results-grid">
          <section class="result-card primary-result">
            <div class="viewer-heading">
              <div>
                <p class="eyebrow">RENDERER</p>
                <h2>最终展示</h2>
              </div>
              <span class="result-mode" :data-status="result.status">
                {{ result.status }}
              </span>
            </div>
          </section>

          <PresentationResultViewer :result="result" />
          <A2UIRawViewer
            v-if="a2uiOperations"
            :operations="a2uiOperations"
          />
          <DiagnosticsPanel :result="result" />
          <p
            v-if="activeCase && caseEvaluation"
            data-testid="case-evaluation"
            :data-passed="caseEvaluation.passed"
          >
            {{ caseEvaluation.passed ? '用例语义断言通过。' : caseEvaluation.failures.join(' ') }}
          </p>
        </div>

        <section v-else class="empty-stage">
          <div class="empty-orbit"><span></span><span></span><span></span></div>
          <p class="eyebrow">READY</p>
          <h2>等待首个 PresentationResult</h2>
          <p>选择快捷场景或输入消息，Workbench 将通过当前 Transport 连接 Runtime Host。</p>
        </section>
      </section>
    </main>
    <main v-else class="workspace static-workbench-page" :data-testid="`route-${route.slice(1)}`">
      <section class="main-stage">
        <section v-if="route === '/prototype-inspect'" :style="{ width: '80vw' }">
          <p class="eyebrow">PROTOTYPE INSPECT</p>
          <h2>Prototype Inspect</h2>
          <PrototypeExecutionMap v-if="showExecutionMapPrototype" />
          <p v-else>原型仅在开发环境且 URL 携带 ?variant= 参数时启用。</p>
        </section>
        <section v-else class="composer-card">
          <p class="eyebrow">{{ workbenchRouteLabel(route).toUpperCase() }}</p>
          <h2>{{ workbenchRouteLabel(route) }}</h2>
          <template v-if="route === '/inspect'">
            <p>选择或重放一次运行后，在此查看已脱敏的阶段、关联 ID、耗时、展示决策和降级信息。</p>
            <div v-if="inspection" data-testid="inspection-summary">
              <p>{{ inspection.status }} · {{ inspection.presentationMode ?? '无展示结果' }}</p>
              <dl><div><dt>requestId</dt><dd>{{ inspection.requestId }}</dd></div><div><dt>runId</dt><dd>{{ inspection.runId }}</dd></div><div><dt>降级原因</dt><dd>{{ inspection.degradationReasonCode ?? '—' }}</dd></div></dl>
              <p v-for="stage in inspection.stages" :key="stage.name">{{ stage.name }} · {{ stage.status }} · {{ stage.durationMs ?? '—' }} ms · {{ stage.errorCode ?? '' }}</p>
            </div>
            <p v-else data-testid="inspection-empty">尚未保存可检查的运行摘要。</p>
          </template>
          <template v-else-if="route === '/cases'">
            <p>案例使用语义断言；不比较原始 A2UI、页面文案或截图。</p>
            <div data-testid="case-library">
              <article v-for="item in allCases" :key="item.id">
                <h3>{{ item.title }}</h3><p>{{ item.input }}</p><code>{{ item.builtin ? '内置案例' : '本地案例' }}</code><button class="secondary-button" type="button" @click="replayCase(item)">运行此案例</button>
              </article>
            </div>
            <label>导入或导出本地案例 JSON<textarea v-model="caseImport" data-testid="case-json" rows="8"></textarea></label>
            <div class="button-group"><button class="secondary-button" data-testid="export-cases" type="button" @click="exportCases">导出 JSON</button><button class="primary-button" data-testid="import-cases" type="button" @click="importCases">导入 JSON</button></div>
            <p v-if="caseNotice" data-testid="case-notice">{{ caseNotice }}</p>
            <p v-if="latestCaseFailure" data-testid="case-failure-diagnosis">{{ latestCaseFailure.caseId }} · {{ latestCaseFailure.failures.join(' ') }}</p>
          </template>
          <template v-else-if="route === '/catalog'">
            <p>此页仅查看 Runtime Host 提供的受 Schema 校验 Catalog 摘要和受控组件预览。</p>
            <p v-if="readOnlyNotice" data-testid="catalog-notice">{{ readOnlyNotice }}</p>
            <div v-if="catalog" data-testid="catalog-summary">
              <p><strong>{{ catalog.catalogId }}</strong> · {{ catalog.catalogVersion }}</p>
              <article v-for="component in catalog.components" :key="component.componentType">
                <h3>{{ component.displayName }}</h3><p>{{ component.description }}</p><code>{{ component.componentType }}</code><p>Actions: {{ component.allowedActions.join(', ') || '—' }}</p><pre>{{ JSON.stringify(component.propsSchema, null, 2) }}</pre><CatalogComponentPreview :component-type="component.componentType" />
              </article>
              <section data-testid="catalog-actions"><h3>受控 Action</h3><p v-for="action in catalog.actions" :key="action.actionType">{{ action.actionType }} · {{ action.description }} · {{ action.requiresConfirmation ? 'requires confirmation' : 'no confirmation' }} · {{ action.destructive ? 'destructive' : 'non-destructive' }}</p></section>
            </div>
          </template>
          <template v-else-if="route === '/scenarios'">
            <p>此页仅查看 Runtime Host 已加载的场景元数据、说明和示例。</p>
            <p v-if="readOnlyNotice" data-testid="scenarios-notice">{{ readOnlyNotice }}</p>
            <div v-if="scenarios" data-testid="scenarios-summary">
              <article v-for="scenario in scenarios" :key="scenario.scenarioId">
                <h3>{{ scenario.scenarioId }} · {{ scenario.version }}</h3><p>{{ scenario.description }}</p><p>{{ scenario.examples.join('；') }}</p>
              </article>
            </div>
          </template>
          <form v-else class="settings-form" @submit.prevent="saveSettings">
            <p>本地设置仅保存 Runtime Host 地址、超时和调试显示；不保存模型、Agent 地址或任何凭证。</p>
            <label>Runtime Host 地址 <input v-model="settingsRuntimeHostUrl" data-testid="settings-runtime-host" type="url" required /></label>
            <label>请求超时（毫秒） <input v-model="settingsTimeoutMs" data-testid="settings-timeout" type="number" min="1000" max="300000" required /></label>
            <label><input v-model="settingsShowDebugDetails" data-testid="settings-debug" type="checkbox" /> 显示本地调试详情</label>
            <button class="primary-button" data-testid="save-settings" type="submit">保存设置</button>
            <p v-if="settingsNotice" data-testid="settings-notice">{{ settingsNotice }}</p>
          </form>
        </section>
      </section>
    </main>
  </div>
</template>
