<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref } from "vue";
import {
  BUILTIN_CASES,
  exportCustomCases,
  importCustomCases,
  loadCustomCases,
  loadCaseFailureDiagnosis,
  saveCustomCases,
  savePendingCase,
  type WorkbenchCase,
} from "../cases/case-library.js";
import {
  loadInspectionSnapshot,
  type InspectionSnapshot,
} from "../inspect/inspection-snapshot.js";
import {
  resolveWorkbenchRoute,
  workbenchRouteLabel,
  WORKBENCH_ROUTES,
  type WorkbenchRoute,
} from "./routes.js";
import WorkbenchTopNav from "../shell/WorkbenchTopNav.vue";
import {
  createAgentEndpoints,
  resolveWorkbenchConfig,
  type WorkbenchConfig,
} from "../settings/agent-config.js";
import {
  loadWorkbenchLocalSettings,
  saveWorkbenchLocalSettings,
} from "../settings/local-settings.js";
import type { ConnectionState } from "../agent/business-agent-client.js";
import type { AgentSource } from "../settings/agent-source.js";

const ConversationPage = defineAsyncComponent(
  () => import("./ConversationPage.vue"),
);
// PROTOTYPE - throwaway: Agent map-action perception variants, dev-only.
const MapAgentTracePrototype = defineAsyncComponent(
  () => import("../conversation/prototype/MapAgentTracePrototype.vue"),
);
const mapTracePrototypeVariant = new URLSearchParams(
  window.location.search,
).get("variant");
const showMapTracePrototype =
  import.meta.env.DEV &&
  (mapTracePrototypeVariant === "map-A" ||
    mapTracePrototypeVariant === "map-B" ||
    mapTracePrototypeVariant === "map-C");
const ScenarioLabPage = defineAsyncComponent(
  () => import("../features/scenario-lab/ScenarioLabPage.vue"),
);
// PROTOTYPE - throwaway: Scenario Lab UI variants, dev-only via ?variant=A|B|C.
const ScenarioLabPrototype = defineAsyncComponent(
  () => import("../features/scenario-lab/prototype/ScenarioLabPrototype.vue"),
);
const showScenarioLabPrototype =
  import.meta.env.DEV &&
  new URLSearchParams(window.location.search).has("variant");

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
          VITE_AGENT_URL: import.meta.env.VITE_AGENT_URL,
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
  agentUrl: window.location.origin,
};
const configured = configResolution.config ?? fallbackConfig;
const config =
  initialLocalSettings.agentUrl === undefined
    ? configured
    : resolveWorkbenchConfig(
        {
          environment: configured.environment,
          agentUrl: initialLocalSettings.agentUrl,
        },
        {},
        window.location.origin,
      );
const endpoints = createAgentEndpoints(config.agentUrl);
const configurationError = configResolution.error;
const workbenchVersion = __WORKBENCH_VERSION__;

const connectionState = ref<ConnectionState>("connecting");
const agentSource = ref<AgentSource>(initialLocalSettings.agentSource);
const route = ref<WorkbenchRoute>(
  resolveWorkbenchRoute(window.location.pathname),
);
const settingsAgentUrl = ref(config.agentUrl);
const settingsTimeoutMs = ref(String(initialLocalSettings.requestTimeoutMs));
const settingsShowDebugDetails = ref(initialLocalSettings.showDebugDetails);
const settingsNotice = ref("");
const customCases = ref<readonly WorkbenchCase[]>(
  loadCustomCases(window.localStorage),
);
const caseImport = ref("");
const caseNotice = ref("");
const latestCaseFailure = ref(loadCaseFailureDiagnosis(window.localStorage));
const allCases = computed(() => [...BUILTIN_CASES, ...customCases.value]);
const inspection = ref<InspectionSnapshot | undefined>(
  loadInspectionSnapshot(window.sessionStorage),
);

const connectionLabels: Record<ConnectionState, string> = {
  connected: "已连接",
  connecting: "正在连接",
  disconnected: "连接已关闭",
  reconnecting: "连接中断，正在重连",
  unavailable: "不可用",
};

function saveSettings(): void {
  const parsedTimeout = Number(settingsTimeoutMs.value);
  try {
    const agentUrl = new URL(settingsAgentUrl.value);
    if (
      (agentUrl.protocol !== "http:" && agentUrl.protocol !== "https:") ||
      agentUrl.username !== "" ||
      agentUrl.password !== "" ||
      !Number.isSafeInteger(parsedTimeout) ||
      parsedTimeout < 1_000 ||
      parsedTimeout > 300_000
    )
      throw new Error("invalid-settings");
    saveWorkbenchLocalSettings(window.localStorage, {
      agentSource: agentSource.value,
      agentUrl: settingsAgentUrl.value,
      requestTimeoutMs: parsedTimeout,
      showDebugDetails: settingsShowDebugDetails.value,
    });
    settingsNotice.value = "设置已保存在此浏览器。正在重新加载连接配置。";
    window.setTimeout(() => window.location.reload(), 100);
  } catch {
    settingsNotice.value =
      "设置无效。Agent 地址必须是 HTTP(S) 地址，超时必须在 1,000 到 300,000 毫秒之间。";
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
  window.location.assign("/conversation");
}

function navigate(nextRoute: WorkbenchRoute): void {
  if (nextRoute === "/inspect")
    inspection.value = loadInspectionSnapshot(window.sessionStorage);
  route.value = nextRoute;
  window.history.pushState({}, "", nextRoute);
}

function onConversationConnectionStateChange(next: ConnectionState): void {
  connectionState.value = next;
}

function onAgentSourceChange(next: AgentSource): void {
  agentSource.value = next;
  saveWorkbenchLocalSettings(window.localStorage, {
    ...loadWorkbenchLocalSettings(window.localStorage),
    agentSource: next,
  });
}

onMounted(() => {
  window.addEventListener("popstate", () => {
    route.value = resolveWorkbenchRoute(window.location.pathname);
  });
});
</script>

<template>
  <div class="shell-root">
    <WorkbenchTopNav
      :connection-label="connectionLabels[connectionState]"
      :connection-state="connectionState"
      :environment="config.environment"
      :route="route"
      :version="workbenchVersion"
      @navigate="navigate"
    />

    <main
      v-if="route === '/conversation' && showMapTracePrototype"
      class="shell-route"
    >
      <MapAgentTracePrototype />
    </main>

    <main v-else-if="route === '/conversation'" class="shell-route">
      <ConversationPage
        :agent-source="agentSource"
        :config="config"
        :endpoints="endpoints"
        :request-timeout-ms="initialLocalSettings.requestTimeoutMs"
        @connection-state-change="onConversationConnectionStateChange"
        @agent-source-change="onAgentSourceChange"
      />
    </main>

    <main
      v-else-if="route === '/scenarios' && showScenarioLabPrototype"
      class="shell-prototype-page"
    >
      <ScenarioLabPrototype />
    </main>

    <main v-else-if="route === '/scenarios'" class="shell-scenario-page">
      <ScenarioLabPage
        :runtime-url="endpoints.agUi"
        :scenario-lab-url="endpoints.scenarioLab"
      />
    </main>

    <main v-else class="shell-static-page">
      <section class="shell-static-card">
        <h2>{{ workbenchRouteLabel(route) }}</h2>
        <template v-if="route === '/inspect'">
          <p>选择或重放一次运行后，在此查看已脱敏的阶段、关联 ID、耗时、展示决策和降级信息。</p>
          <div v-if="inspection" data-testid="inspection-summary">
            <p>{{ inspection.status }} · {{ inspection.outputKind }}</p>
            <dl><div><dt>requestId</dt><dd>{{ inspection.requestId }}</dd></div><div><dt>runId</dt><dd>{{ inspection.runId }}</dd></div><div><dt>Assistant 消息</dt><dd>{{ inspection.assistantMessageCount }}</dd></div><div><dt>地图操作</dt><dd>{{ inspection.mapOperationCount }}</dd></div></dl>
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
          <p>此页当前不可用。Catalog 元数据由 Business Agent 通过 AG-UI 提供，暂未实现。</p>
        </template>
        <form v-else class="settings-form" @submit.prevent="saveSettings">
          <p>本地设置仅保存 Agent Source、Agent 地址、超时和调试显示；不保存模型、密钥或任何凭证。</p>
          <label>Business Agent 地址 <input v-model="settingsAgentUrl" data-testid="settings-agent-url" type="url" required /></label>
          <label>请求超时（毫秒） <input v-model="settingsTimeoutMs" data-testid="settings-timeout" type="number" min="1000" max="300000" required /></label>
          <label><input v-model="settingsShowDebugDetails" data-testid="settings-debug" type="checkbox" /> 显示本地调试详情</label>
          <button class="primary-button" data-testid="save-settings" type="submit">保存设置</button>
          <p v-if="settingsNotice" data-testid="settings-notice">{{ settingsNotice }}</p>
        </form>
      </section>
    </main>
  </div>
</template>

<style scoped>
.shell-scenario-page {
  flex: 1;
  min-height: 0;
  padding: 20px 24px;
  overflow: hidden;
}

/* PROTOTYPE - throwaway: full-height host for the Scenario Lab UI variants. */
.shell-prototype-page {
  flex: 1;
  min-height: 0;
  padding: 20px 24px 72px;
  overflow: hidden;
}

@media (max-width: 1250px) {
  .shell-scenario-page {
    overflow-y: auto;
  }
}
</style>
