<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
} from "vue";
import {
  type AgentTransportClient,
  type ConnectionState,
  createBusinessAgentClient,
  WorkbenchAgentError,
} from "../agent/business-agent-client.js";
import type { ResumeEntry } from "@ag-ui/core";
import CopilotKitConversationProvider from "../conversation/CopilotKitConversationProvider.vue";
import { quickScenarios } from "./scenarios.js";
import {
  type ConversationState,
  createConversationState,
  failOperation,
  type InterruptResponse,
  resolveRun,
  resumeInterrupt,
  setConversationInput,
  startRun,
  type TurnFailure,
  type WorkbenchUserMessage,
} from "../conversation/conversation-store.js";
import { locateDevice } from "../features/frontend-tools/locate-device.js";
import type { Device } from "../features/map/devices.js";
import MapWorkspace from "../features/map/MapWorkspace.vue";
import { saveInspectionSnapshot } from "../inspect/inspection-snapshot.js";
import {
  createObservationRecorder,
  type ObservationRecorder,
  type TurnObservationInput,
} from "../inspect/turn-inspection.js";
import type {
  AgentEndpoints,
  WorkbenchConfig,
} from "../settings/agent-config.js";
import {
  AGENT_SOURCES,
  agentSourceProfile,
  type AgentSource,
} from "../settings/agent-source.js";
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
  agentSource: AgentSource;
  config: WorkbenchConfig;
  endpoints: AgentEndpoints;
  requestTimeoutMs: number;
}>();

const emit = defineEmits<{
  agentSourceChange: [source: AgentSource];
  connectionStateChange: [state: ConnectionState];
}>();

const connectionState = ref<ConnectionState>("connecting");
const runState = ref<RunState>("idle");
const conversations = shallowRef<LocalConversation[]>([]);
const selectedConversationId = ref<string>();
const inspectedTurnId = ref<string>();
const activeController = ref<AbortController>();
const selectedDevice = ref<Device>();
const selectedAgentSource = ref(props.agentSource);
const selectedAgentProfile = computed(() =>
  agentSourceProfile(selectedAgentSource.value),
);

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
let activeRecorder: ObservationRecorder | undefined;

// Issue #205：Frontend Tool handler 在 run 进行中异步触发，
// 通过该稳定委托把观察事实写入当前 active run 的 recorder。
function forwardObservation(input: TurnObservationInput): void {
  activeRecorder?.record(input);
}

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
    agentId: selectedAgentProfile.value.agentId,
    timeoutMs: props.requestTimeoutMs,
    onConnectionStateChange,
  });
  client.connect();
}

async function selectAgentSource(event: Event): Promise<void> {
  const source = (event.target as HTMLSelectElement).value as AgentSource;
  if (!AGENT_SOURCES.includes(source) || source === selectedAgentSource.value)
    return;
  selectedAgentSource.value = source;
  emit("agentSourceChange", source);
  conversations.value = [];
  selectedConversationId.value = undefined;
  runState.value = "idle";
  selectedDevice.value = undefined;
  await nextTick();
  configureRuntime();
  newConversation();
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

async function executeRun(
  turnId: string,
  threadId: string,
  request: {
    message?: WorkbenchUserMessage;
    requestId: string;
    resume?: readonly ResumeEntry[];
  },
): Promise<void> {
  const active = client;
  if (active === undefined) return;
  const runId = createId("run");
  const controller = new AbortController();
  activeController.value = controller;
  runState.value = "running";
  const recorder = createObservationRecorder();
  activeRecorder = recorder;

  try {
    const result = await active.run(
      {
        ...(request.message === undefined ? {} : { message: request.message }),
        observe: forwardObservation,
        ...(request.resume === undefined ? {} : { resume: request.resume }),
        runId,
        threadId,
      },
      controller.signal,
    );
    conversation.value = resolveRun(conversation.value, turnId, {
      agentState: result.state,
      eventTypes: result.eventTypes,
      ...(result.interrupts === undefined
        ? {}
        : { interrupts: result.interrupts }),
      messages: result.newMessages,
      observations: recorder.observations(),
      runResult: result.result,
      runId,
      threadId,
    });
    saveInspectionSnapshot(window.sessionStorage, {
      messages: result.newMessages,
      requestId: request.requestId,
      runId,
      threadId,
    });
    runState.value = result.interrupts?.length ? "idle" : "completed";
  } catch (caught) {
    const displayError = displayErrorFromUnknown(caught);
    const cancelled = displayError.code === "WORKBENCH_REQUEST_CANCELLED";
    conversation.value = failOperation(
      conversation.value,
      turnId,
      turnFailure(displayError),
      cancelled ? "cancelled" : "failed",
      recorder.observations(),
    );
    runState.value = cancelled ? "cancelled" : "failed";
  } finally {
    if (activeRecorder === recorder) activeRecorder = undefined;
    if (activeController.value === controller)
      activeController.value = undefined;
  }
}

async function sendMessage(
  message = input.value,
  options: { allowUnavailable?: boolean } = {},
): Promise<void> {
  const normalized = message.trim();
  const current = currentConversation.value;
  const canProbeUnavailable =
    options.allowUnavailable === true &&
    connectionState.value === "reconnecting";
  if (
    !client ||
    !current ||
    normalized === "" ||
    isRunning.value ||
    conversation.value.activeOperation !== undefined ||
    (connectionState.value !== "connected" && !canProbeUnavailable)
  )
    return;

  const requestId = createId("message");
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

  await executeRun(turnId, current.threadId, {
    message: userMessage,
    requestId,
  });
}

function respondToInterrupt(response: InterruptResponse): void {
  const current = currentConversation.value;
  if (!client || !current) return;
  const turn = conversation.value.turns.find(
    (item) => item.turnId === response.turnId,
  );
  if (
    turn?.status !== "interrupted" ||
    conversation.value.activeOperation !== undefined ||
    connectionState.value !== "connected"
  )
    return;
  const requestId = createId("message");
  const nextConversation = resumeInterrupt(conversation.value, turn.turnId, {
    requestId,
  });
  if (nextConversation === conversation.value) return;
  conversation.value = nextConversation;

  void executeRun(turn.turnId, current.threadId, {
    requestId,
    resume: [
      {
        interruptId: response.interruptId,
        status: response.status,
        ...(response.payload === undefined
          ? {}
          : { payload: response.payload }),
      },
    ],
  });
}

function cancelRequest(): void {
  activeController.value?.abort();
}

function retryTurn(turnId: string): void {
  const turn = conversation.value.turns.find((item) => item.turnId === turnId);
  if (turn === undefined || turn.failure?.retryable !== true) return;
  if (connectionState.value === "unavailable")
    applyConnectionState("reconnecting");
  input.value = turn.userMessage.content;
  void sendMessage(turn.userMessage.content, { allowUnavailable: true });
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
    :key="selectedAgentProfile.agentId"
    :a2ui-enabled="selectedAgentProfile.a2uiCatalogEnabled"
    :agent-id="selectedAgentProfile.agentId"
    :frontend-tools-enabled="selectedAgentProfile.frontendTools"
    :locate-device="handleLocateDevice"
    :observe="forwardObservation"
    :runtime-url="endpoints.agUi"
  >
    <div class="shell" data-testid="conversation-shell">
      <ConversationSidebar
        :conversations="conversations"
        notice=""
        :quick-scenarios="quickScenarios"
        :selected-conversation-id="selectedConversationId"
        @new-conversation="newConversation"
        @run-scenario="sendMessage"
        @select-conversation="selectConversation"
      />

      <main class="shell-stage">
        <section class="agent-source-bar" data-testid="agent-source-panel">
          <label>
            <span>Agent Source</span>
            <select
              :value="selectedAgentSource"
              data-testid="agent-source-select"
              @change="selectAgentSource"
            >
              <option
                v-for="source in AGENT_SOURCES"
                :key="source"
                :value="source"
              >
                {{ agentSourceProfile(source).label }}
              </option>
            </select>
          </label>
          <div>
            <p>{{ selectedAgentProfile.description }}</p>
            <p
              v-if="!selectedAgentProfile.frontendTools"
              class="agent-capability-gap"
              data-testid="frontend-tool-capability-gap"
            >
              Capability gap: this SACS profile does not support client-provided Frontend Tools.
            </p>
          </div>
        </section>
        <ConversationMainArea
          :is-running="isRunning"
          :run-state="runState"
          :turns="conversation.turns"
          @inspect="inspectedTurnId = $event"
          @respond-interrupt="respondToInterrupt"
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
