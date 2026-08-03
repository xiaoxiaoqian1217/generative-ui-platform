<script setup lang="ts">
import type {
  RuntimeRunRequest,
  RuntimeRunResult,
} from "@generative-ui/runtime-contract";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import DiagnosticsPanel from "../diagnostics/DiagnosticsPanel.vue";
import A2UIRenderer from "../renderer/A2UIRenderer.vue";
import A2UIRawViewer from "../renderer/A2UIRawViewer.vue";
import MarkdownRenderer from "../renderer/MarkdownRenderer.vue";
import PresentationResultViewer from "../renderer/PresentationResultViewer.vue";
import { probeRuntimeHealth } from "../runtime/health.js";
import { createHttpRuntimeClient } from "../runtime/http-runtime-client.js";
import {
  type ConnectionState,
  type RuntimeTransportClient,
  WorkbenchRuntimeError,
} from "../runtime/types.js";
import { createWebSocketRuntimeClient } from "../runtime/websocket-runtime-client.js";
import {
  createRuntimeEndpoints,
  resolveWorkbenchConfig,
  type WorkbenchConfig,
} from "../settings/runtime-config.js";
import { quickScenarios } from "./scenarios.js";

type TransportKind = "http" | "websocket";
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

const fallbackConfig: WorkbenchConfig = {
  environment: "invalid",
  runtimeHostUrl: window.location.origin,
};
const config = configResolution.config ?? fallbackConfig;
const endpoints = createRuntimeEndpoints(config.runtimeHostUrl);
const configurationError = configResolution.error;
const workbenchVersion = __WORKBENCH_VERSION__;

const transport = ref<TransportKind>("http");
const connectionState = ref<ConnectionState>("connecting");
const connectionNotice = ref("正在探测 Runtime Host");
const runState = ref<RunState>("idle");
const input = ref(quickScenarios[0]?.message ?? "");
const result = ref<RuntimeRunResult>();
const error = ref<DisplayError>();
const refreshNotice = ref("");
const lastMessage = ref("");
const activeController = ref<AbortController>();

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

const presentation = computed(() => result.value?.presentation);
const markdown = computed(() => {
  const value = presentation.value;
  return value && "mode" in value && value.mode === "markdown"
    ? value.markdown
    : undefined;
});
const a2uiOperations = computed(() => {
  const value = presentation.value;
  return value && "mode" in value && value.mode === "generative-ui"
    ? value.operations
    : undefined;
});
const a2uiPresentation = computed(() => {
  const value = presentation.value;
  return value && "mode" in value && value.mode === "generative-ui"
    ? value
    : undefined;
});
const canSend = computed(
  () =>
    input.value.trim().length > 0 &&
    runState.value !== "running" &&
    runState.value !== "rendering" &&
    (transport.value === "http" || connectionState.value === "connected") &&
    configurationError === undefined,
);
const activeEndpoint = computed(() =>
  transport.value === "http" ? endpoints.runs : endpoints.socket,
);

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
  if (generation === clientGeneration && transport.value === "http") {
    applyConnectionState(state);
  }
}

function configureTransport(): void {
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
    error.value = {
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

  if (transport.value === "http") {
    applyConnectionState("connecting");
    client = createHttpRuntimeClient({
      endpoint: endpoints.runs,
      onConnectionStateChange,
    });
    void probeHealth(generation);
    healthTimer = globalThis.setInterval(() => {
      void probeHealth(generation);
    }, 3_000);
    return;
  }

  client = createWebSocketRuntimeClient({
    endpoint: endpoints.socket,
    onConnectionStateChange,
  });
  client.connect();
}

function createRequest(message: string): RuntimeRunRequest {
  const requestId =
    globalThis.crypto.randomUUID?.() ??
    `request-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    protocolVersion: "1.0",
    requestId,
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

async function sendMessage(message = input.value): Promise<void> {
  const normalizedMessage = message.trim();
  if (!client || normalizedMessage === "" || !canSend.value) {
    return;
  }

  const controller = new AbortController();
  activeController.value = controller;
  error.value = undefined;
  result.value = undefined;
  runState.value = "running";
  lastMessage.value = normalizedMessage;

  try {
    const runtimeResult = await client.run(
      createRequest(normalizedMessage),
      controller.signal,
    );
    result.value = runtimeResult;
    error.value = platformErrorFromResult(runtimeResult);
    if (runtimeResult.status === "failed") {
      runState.value = "failed";
      return;
    }

    runState.value = "rendering";
    await nextTick();
    runState.value = runtimeResult.status;
  } catch (caught) {
    const displayError = displayErrorFromUnknown(caught);
    error.value = displayError;
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

function retryLastRequest(): void {
  if (lastMessage.value !== "") {
    input.value = lastMessage.value;
    void sendMessage(lastMessage.value);
  }
}

function selectScenario(message: string): void {
  input.value = message;
}

function handleA2UIAction(): void {
  // TASK-008 owns Runtime Host Action submission and Business Agent resume.
}

function reconnect(): void {
  if (transport.value === "websocket") {
    client?.connect();
  } else {
    void probeHealth(clientGeneration);
  }
}

watch(transport, configureTransport);

onMounted(() => {
  const navigation = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  if (navigation?.type === "reload") {
    refreshNotice.value =
      "页面已刷新，本地运行记录已重置，Runtime Host 配置已重新加载。";
  }
  configureTransport();
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

    <main class="workspace">
      <aside class="control-rail">
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
          <div class="transport-switch" aria-label="Transport">
            <button
              :class="{ active: transport === 'http' }"
              data-testid="transport-http"
              type="button"
              @click="transport = 'http'"
            >
              HTTP
            </button>
            <button
              :class="{ active: transport === 'websocket' }"
              data-testid="transport-websocket"
              type="button"
              @click="transport = 'websocket'"
            >
              WebSocket
            </button>
          </div>
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

        <section class="composer-card">
          <div class="composer-header">
            <div>
              <p class="eyebrow">PLAYGROUND</p>
              <h2>运行一次展示请求</h2>
            </div>
            <div class="run-state" :data-state="runState" data-testid="run-status">
              <span></span>{{ runLabels[runState] }}
            </div>
          </div>
          <textarea
            v-model="input"
            aria-label="用户输入"
            data-testid="message-input"
            maxlength="10000"
            placeholder="向 Runtime Host 发送一条消息…"
            @keydown.ctrl.enter="sendMessage()"
          ></textarea>
          <div class="composer-footer">
            <span>Ctrl + Enter 发送 · 防止重复提交 · 最长 10,000 字符</span>
            <div class="button-group">
              <button
                v-if="runState === 'running' || runState === 'rendering'"
                class="secondary-button"
                data-testid="cancel-run"
                type="button"
                @click="cancelRequest"
              >
                取消
              </button>
              <button
                class="primary-button"
                :disabled="!canSend"
                data-testid="send-run"
                type="button"
                @click="sendMessage()"
              >
                运行请求 <span>↗</span>
              </button>
            </div>
          </div>
        </section>

        <section v-if="error" class="error-card" data-testid="error-state">
          <div class="error-icon">!</div>
          <div class="error-copy">
            <p class="eyebrow">{{ error.stage ?? "error" }}</p>
            <h3>{{ error.code }}</h3>
            <p>{{ error.message }}</p>
            <code v-if="error.path">字段路径：{{ error.path }}</code>
          </div>
          <button
            v-if="error.retryable && lastMessage"
            class="secondary-button"
            type="button"
            @click="retryLastRequest"
          >
            重试上次请求
          </button>
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
            <MarkdownRenderer v-if="markdown" :markdown="markdown" />
            <A2UIRenderer
              v-else-if="a2uiPresentation"
              :presentation="a2uiPresentation"
              @action="handleA2UIAction"
            />
            <div v-else class="empty-result">
              PresentationResult 未包含可展示内容，请查看错误与诊断。
            </div>
          </section>

          <PresentationResultViewer :result="result" />
          <A2UIRawViewer
            v-if="a2uiOperations"
            :operations="a2uiOperations"
          />
          <DiagnosticsPanel :result="result" />
        </div>

        <section v-else class="empty-stage">
          <div class="empty-orbit"><span></span><span></span><span></span></div>
          <p class="eyebrow">READY</p>
          <h2>等待首个 PresentationResult</h2>
          <p>选择快捷场景或输入消息，Workbench 将通过当前 Transport 连接 Runtime Host。</p>
        </section>
      </section>
    </main>
  </div>
</template>
