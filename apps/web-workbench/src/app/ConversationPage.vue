<script setup lang="ts">
import type { RuntimeRunRequest, RuntimeRunResult } from "@generative-ui/runtime-contract";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import {
  createConversationState,
  failOperation,
  resolveAction,
  resolveRun,
  setConversationInput,
  startAction,
  startRun,
  type ConversationState,
  type TurnFailure,
} from "../conversation/conversation-store.js";
import CopilotKitConversationProvider from "../conversation/CopilotKitConversationProvider.vue";
import type { RenderedRuntimeAction } from "../renderer/a2ui.js";
import {
  createBusinessAgentClient,
  type AgentTransportClient,
  type ConnectionState,
  WorkbenchAgentError,
} from "../agent/business-agent-client.js";
import type { AgentEndpoints, WorkbenchConfig } from "../settings/agent-config.js";
import ConversationComposer from "../shell/ConversationComposer.vue";
import ConversationMainArea from "../shell/ConversationMainArea.vue";
import ConversationSidebar from "../shell/ConversationSidebar.vue";
import InspectPanel from "../shell/InspectPanel.vue";
import { saveInspectionSnapshot } from "../inspect/inspection-snapshot.js";

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
  retryable: boolean;
  stage?: string;
}

interface LocalConversation {
  readonly conversationId: string;
  readonly title: string;
  readonly updatedAt: string;
  readonly state: ConversationState;
}

interface LocalConversationInput {
  readonly conversationId: string;
  readonly title: string;
  readonly updatedAt: string;
  readonly state: ConversationState;
}

const props = defineProps<{
  config: WorkbenchConfig;
  endpoints: AgentEndpoints;
  requestTimeoutMs: number;
}>();

const emit = defineEmits<{
  connectionStateChange: [state: ConnectionState];
}>();

const connectionState = ref<ConnectionState>("connecting");
const runState = ref<RunState>("idle");
const conversations = shallowRef<LocalConversation[]>([]);
const selectedConversationId = ref<string>();
const sidebarNotice = ref("");
const inspectedTurnId = ref<string>();
const activeController = ref<AbortController>();

const currentConversation = computed<LocalConversation | undefined>(() => {
  const list: LocalConversation[] = conversations.value;
  const id: string | undefined = selectedConversationId.value;
  return list.find((item) => item.conversationId === id);
});
const conversation = computed({
  get: () => currentConversation.value?.state ?? createConversationState(),
  set: (next: ConversationState) => {
    const current = currentConversation.value;
    if (current === undefined) return;
    conversations.value = conversations.value.map((item) =>
      item.conversationId === current.conversationId
        ? { ...item, state: next, updatedAt: new Date().toISOString() }
        : item,
    );
  },
});

const input = computed({
  get: () => conversation.value.inputValue,
  set: (value: string) => {
    conversation.value = setConversationInput(conversation.value, value);
  },
});

const currentTurn = computed(() => conversation.value.turns.at(-1));
const result = computed(() => currentTurn.value?.runtimeResult);
const conversationThreadId = computed(() => {
  for (const turn of [...conversation.value.turns].reverse()) {
    if (turn.threadId !== undefined) return turn.threadId;
  }
  return undefined;
});
const inspectedTurn = computed(() =>
  conversation.value.turns.find((turn) => turn.turnId === inspectedTurnId.value),
);

const isRunning = computed(
  () => runState.value === "running" || runState.value === "rendering",
);
const canSend = computed(
  () =>
    input.value.trim().length > 0 &&
    !isRunning.value &&
    connectionState.value === "connected",
);
const isInputDisabled = computed(
  () =>
    connectionState.value !== "connected" ||
    conversation.value.activeOperation !== undefined,
);

let client: AgentTransportClient | undefined;
let clientGeneration = 0;
let healthTimer: ReturnType<typeof globalThis.setInterval> | undefined;

const connectionLabels: Record<ConnectionState, string> = {
  connected: "已连接",
  connecting: "正在连接",
  disconnected: "连接已关闭",
  reconnecting: "连接中断，正在重连",
  unavailable: "不可用",
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

function applyConnectionState(next: ConnectionState): void {
  connectionState.value = next;
  emit("connectionStateChange", next);
}

function configureRuntime(): void {
  clientGeneration += 1;
  const generation = clientGeneration;
  client?.close();
  client = undefined;
  activeController.value?.abort();
  if (healthTimer !== undefined) {
    globalThis.clearInterval(healthTimer);
    healthTimer = undefined;
  }

  const onConnectionStateChange = (state: ConnectionState) => {
    if (generation === clientGeneration) applyConnectionState(state);
  };

  applyConnectionState("connecting");
  client = createBusinessAgentClient({
    runtimeUrl: props.endpoints.agUi,
    timeoutMs: props.requestTimeoutMs,
    onConnectionStateChange,
  });
  client.connect();

  // Connection state is driven by CopilotKit core; no separate health endpoint.
  window.setTimeout(() => {
    if (generation === clientGeneration && connectionState.value === "connecting") {
      applyConnectionState("connected");
    }
  }, 1_000);
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
        viewport: { height: window.innerHeight, width: window.innerWidth },
      },
    },
  };
}

function platformErrorFromResult(value: RuntimeRunResult): DisplayError | undefined {
  if (value.status !== "failed") return undefined;
  return {
    code: value.error.code,
    message: value.error.message,
    retryable: value.error.retryable,
    stage: "agent",
  };
}

function displayErrorFromUnknown(value: unknown): DisplayError {
  if (value instanceof WorkbenchAgentError) {
    return {
      code: value.code,
      message: value.message,
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
  const normalized = message.trim();
  if (!client || normalized === "" || !canSend.value) return;

  const request = createRequest(normalized);
  const turnId = `turn-${request.requestId}`;
  const nextConversation = startRun(conversation.value, {
    message: normalized,
    requestId: request.requestId,
    turnId,
  });
  if (nextConversation === conversation.value) return;
  conversation.value = nextConversation;
  const controller = new AbortController();
  activeController.value = controller;
  runState.value = "running";

  try {
    const runtimeResult = await client.run(request, controller.signal);
    saveInspectionSnapshot(window.sessionStorage, runtimeResult);
    if (runtimeResult.status === "failed") {
      const failure = platformErrorFromResult(runtimeResult);
      if (failure !== undefined)
        conversation.value = failOperation(conversation.value, turnId, turnFailure(failure));
      runState.value = "failed";
      return;
    }

    conversation.value = resolveRun(conversation.value, turnId, runtimeResult);
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
      displayError.code === "WORKBENCH_REQUEST_CANCELLED" ? "cancelled" : "failed";
  } finally {
    if (activeController.value === controller) activeController.value = undefined;
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
    // Business Agent action is sent as a follow-up run in the same thread.
    const actionResult = await client.run(
      {
        protocolVersion: "1.0",
        requestId,
        runId: createId("run"),
        threadId: turn.runtimeResult.threadId,
        message: {
          role: "user",
          content: `Action: ${rendered.action.actionId}`,
        },
        presentation: {
          context: {
            locale: navigator.language,
            theme: "workbench",
            viewport: { height: window.innerHeight, width: window.innerWidth },
          },
        },
      },
      controller.signal,
    );
    saveInspectionSnapshot(window.sessionStorage, actionResult);
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
      displayError.code === "WORKBENCH_REQUEST_CANCELLED" ? "cancelled" : "failed";
  } finally {
    if (activeController.value === controller) activeController.value = undefined;
  }
}

function newConversation(): void {
  const id = createId("conversation");
  const now = new Date().toISOString();
  const next: LocalConversationInput = {
    conversationId: id,
    title: "新会话",
    updatedAt: now,
    state: createConversationState(),
  };
  conversations.value = [...conversations.value, next as LocalConversation];
  selectedConversationId.value = id;
  inspectedTurnId.value = undefined;
  runState.value = "idle";
}

function selectConversation(conversationId: string): void {
  selectedConversationId.value = conversationId;
  inspectedTurnId.value = undefined;
  runState.value = "idle";
}

function inspectTurn(turnId: string): void {
  inspectedTurnId.value = turnId;
}

function closeInspect(): void {
  inspectedTurnId.value = undefined;
}

onMounted(() => {
  configureRuntime();
  if (conversations.value.length === 0) {
    newConversation();
  }
});

onBeforeUnmount(() => {
  clientGeneration += 1;
  activeController.value?.abort();
  client?.close();
  if (healthTimer !== undefined) globalThis.clearInterval(healthTimer);
});
</script>

<template>
  <CopilotKitConversationProvider :runtime-url="endpoints.agUi">
    <div class="shell" data-testid="conversation-shell">
      <ConversationSidebar
        :conversations="conversations"
        :notice="sidebarNotice"
        :selected-conversation-id="selectedConversationId"
        @new-conversation="newConversation"
        @select-conversation="selectConversation"
      />

      <main class="shell-stage">
        <ConversationMainArea
          :actions-disabled="conversation.activeOperation !== undefined"
          :is-running="isRunning"
          :run-state="runState"
          :turns="conversation.turns"
          @action="handleA2UIAction"
          @inspect="inspectTurn"
          @retry="retryTurn"
        />

        <ConversationComposer
          :can-send="canSend"
          :input-value="input"
          :is-input-disabled="isInputDisabled"
          :is-running="isRunning"
          @input-change="input = $event"
          @stop="cancelRequest"
          @submit="sendMessage($event)"
        />
      </main>

      <InspectPanel
        v-if="inspectedTurn !== undefined"
        :turn="inspectedTurn"
        @close="closeInspect"
      />
    </div>
  </CopilotKitConversationProvider>
</template>
