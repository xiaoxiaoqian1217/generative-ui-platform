<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import {
  type AgentTransportClient,
  type ConnectionState,
  createBusinessAgentClient,
  WorkbenchAgentError,
} from "../agent/business-agent-client.js";
import CopilotKitConversationProvider from "../conversation/CopilotKitConversationProvider.vue";
import {
  type ConversationState,
  createConversationState,
  failOperation,
  resolveRun,
  setConversationInput,
  startRun,
  type TurnFailure,
  type WorkbenchUserMessage,
} from "../conversation/conversation-store.js";
import { locateDevice } from "../features/frontend-tools/locate-device.js";
import type { Device } from "../features/map/devices.js";
import MapWorkspace from "../features/map/MapWorkspace.vue";
import { saveInspectionSnapshot } from "../inspect/inspection-snapshot.js";
import type {
  AgentEndpoints,
  WorkbenchConfig,
} from "../settings/agent-config.js";
import ConversationComposer from "../shell/ConversationComposer.vue";
import ConversationMainArea from "../shell/ConversationMainArea.vue";
import ConversationSidebar from "../shell/ConversationSidebar.vue";
import InspectPanel from "../shell/InspectPanel.vue";

type RunState = "idle" | "running" | "completed" | "failed" | "cancelled";

interface DisplayError {
  code: string;
  message: string;
  retryable: boolean;
  stage?: string;
}

interface LocalConversation {
  readonly conversationId: string;
  readonly state: ConversationState;
  readonly threadId: string;
  readonly title: string;
  readonly updatedAt: string;
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
const inspectedTurnId = ref<string>();
const activeController = ref<AbortController>();
const selectedDevice = ref<Device>();

const currentConversation = computed<LocalConversation | undefined>(() =>
  conversations.value.find(
    (item) => item.conversationId === selectedConversationId.value,
  ),
);
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
const inspectedTurn = computed(() =>
  conversation.value.turns.find(
    (turn) => turn.turnId === inspectedTurnId.value,
  ),
);
const isRunning = computed(() => runState.value === "running");
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

  const onConnectionStateChange = (state: ConnectionState) => {
    if (generation === clientGeneration) applyConnectionState(state);
  };

  applyConnectionState("connecting");
  client = createBusinessAgentClient({
    timeoutMs: props.requestTimeoutMs,
    onConnectionStateChange,
  });
  client.connect();
  window.setTimeout(() => {
    if (
      generation === clientGeneration &&
      connectionState.value === "connecting"
    ) {
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
  const current = currentConversation.value;
  if (!client || !current || normalized === "" || !canSend.value) return;

  const requestId = createId("message");
  const runId = createId("run");
  const userMessage: WorkbenchUserMessage = {
    id: requestId,
    role: "user",
    content: normalized,
  };
  const turnId = `turn-${requestId}`;
  const nextConversation = startRun(conversation.value, {
    message: userMessage,
    requestId,
    turnId,
  });
  if (nextConversation === conversation.value) return;
  conversation.value = nextConversation;
  const controller = new AbortController();
  activeController.value = controller;
  runState.value = "running";

  try {
    const result = await client.run(
      { message: userMessage, runId, threadId: current.threadId },
      controller.signal,
    );
    conversation.value = resolveRun(conversation.value, turnId, {
      messages: result.newMessages,
      runId,
      threadId: current.threadId,
    });
    saveInspectionSnapshot(window.sessionStorage, {
      messages: result.newMessages,
      requestId,
      runId,
      threadId: current.threadId,
    });
    runState.value = "completed";
  } catch (caught) {
    const displayError = displayErrorFromUnknown(caught);
    const cancelled = displayError.code === "WORKBENCH_REQUEST_CANCELLED";
    conversation.value = failOperation(
      conversation.value,
      turnId,
      turnFailure(displayError),
      cancelled ? "cancelled" : "failed",
    );
    runState.value = cancelled ? "cancelled" : "failed";
  } finally {
    if (activeController.value === controller)
      activeController.value = undefined;
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

function newConversation(): void {
  const id = createId("conversation");
  const now = new Date().toISOString();
  const next: LocalConversation = {
    conversationId: id,
    state: createConversationState(),
    threadId: createId("thread"),
    title: "新会话",
    updatedAt: now,
  };
  conversations.value = [...conversations.value, next];
  selectedConversationId.value = id;
  inspectedTurnId.value = undefined;
  runState.value = "idle";
}

function selectConversation(conversationId: string): void {
  selectedConversationId.value = conversationId;
  inspectedTurnId.value = undefined;
  runState.value = "idle";
}

function handleLocateDevice(deviceId: string): string {
  return JSON.stringify(
    locateDevice({ deviceId }, (device) => {
      selectedDevice.value = device;
    }),
  );
}

onMounted(() => {
  configureRuntime();
  if (conversations.value.length === 0) newConversation();
});

onBeforeUnmount(() => {
  clientGeneration += 1;
  activeController.value?.abort();
  client?.close();
});
</script>

<template>
  <CopilotKitConversationProvider
    :locate-device="handleLocateDevice"
    :runtime-url="endpoints.agUi"
  >
    <div class="shell" data-testid="conversation-shell">
      <ConversationSidebar
        :conversations="conversations"
        notice=""
        :selected-conversation-id="selectedConversationId"
        @new-conversation="newConversation"
        @select-conversation="selectConversation"
      />

      <main class="shell-stage">
        <ConversationMainArea
          :is-running="isRunning"
          :run-state="runState"
          :turns="conversation.turns"
          @inspect="inspectedTurnId = $event"
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

      <MapWorkspace
        :selected-device="selectedDevice"
        @locate-device="handleLocateDevice"
      />

      <InspectPanel
        v-if="inspectedTurn !== undefined"
        :turn="inspectedTurn"
        @close="inspectedTurnId = undefined"
      />
    </div>
  </CopilotKitConversationProvider>
</template>
