<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import {
  createInitialState,
  dispatchLabAction,
  getPresentation,
  type LabAction,
  type LabRequest,
  type LabRoad,
} from "./model.js";
import { LAB_SCENARIOS, type ScenarioStep } from "./scenarios.js";

type DisplayMode = "fixed" | "dynamic";
type InteractionRecord = {
  sequence: number;
  at: string;
  elapsedMs: number;
  mode: DisplayMode;
  kind: string;
  detail: string;
};

const defaultScenario =
  LAB_SCENARIOS.find((scenario) => scenario.id === "observation-cooperation") ??
  LAB_SCENARIOS[0]!;
const mode = ref<DisplayMode>("dynamic");
const scenarioId = ref(defaultScenario.id);
const runningScenarioId = ref(scenarioId.value);
const state = ref(createInitialState("fixture-run", defaultScenario.collaboration));
const cursor = ref(0);
const executionQueue = ref<ScenarioStep[]>([...defaultScenario.steps]);
const branchNotice = ref("");
const started = ref(false);
const notice = ref("");
const selectedRoadId = ref("r-a");
const constraintRoadId = ref("r-c");
const constraintNote = ref("");
const priorityStepId = ref("s-c");
const fieldValues = ref<Record<string, Record<string, string>>>({});
const observationPointValues = ref<Record<string, string>>({});
const inputActions = ref<LabAction[]>([]);
const telemetry = ref<InteractionRecord[]>([]);
const exportPreview = ref("");
const replaying = ref(false);
let replayTimer: number | undefined;
let actionSequence = 0;
let startedAt = performance.now();

const selectedScenario = computed(
  () => LAB_SCENARIOS.find((item) => item.id === scenarioId.value)!,
);
const runningScenario = computed(
  () => LAB_SCENARIOS.find((item) => item.id === runningScenarioId.value)!,
);
const presentation = computed(() => getPresentation(state.value));
const pending = computed(() => presentation.value.pendingRequests);
const collaboration = computed(() => presentation.value.collaboration);
const orderedSteps = computed(() => {
  const order = collaboration.value?.stepOrder;
  return order === undefined
    ? state.value.steps
    : order
        .map((id) => state.value.steps.find((step) => step.id === id))
        .filter((step) => step !== undefined);
});
const upcomingSteps = computed(() =>
  orderedSteps.value.filter((step) => step.status === "pending"),
);
const nextScheduledStep = computed(() => upcomingSteps.value[0]);
watch(upcomingSteps, (steps) => {
  if (!steps.some((step) => step.id === priorityStepId.value))
    priorityStepId.value = steps[0]?.id ?? "";
});
const currentStep = computed(() =>
  state.value.steps.find((step) => step.status === "running"),
);
const completedStepCount = computed(
  () => state.value.steps.filter((step) => step.status === "completed").length,
);
const selectedRoad = computed(
  () => state.value.roads.find((road) => road.id === selectedRoadId.value)!,
);
const nextStep = computed(() => executionQueue.value[cursor.value]);
const waitingForOperator = computed(
  () => nextStep.value?.scriptedOperator === true && pending.value.length > 0,
);
const stateJson = computed(() => JSON.stringify(state.value, null, 2));
const fixtureJson = computed(() =>
  JSON.stringify(executionQueue.value, null, 2),
);
const nextEventLabel = computed(() => {
  if (nextStep.value?.scriptedOperator && pending.value.length === 0)
    return "保留你的实际选择，继续下一个仿真事件";
  return !runningScenario.value.collaboration &&
    nextStep.value?.action.type === "finish-task" &&
    state.value.steps.some(
      (step) => step.status === "pending" || step.status === "running",
    )
    ? "注入仍待完成分支的成功 fixture，再结束（仿真）"
    : (nextStep.value?.label ?? "事件已注入完毕");
});
const phaseLabels = {
  ready: "准备",
  running: "执行中",
  waiting: "等待处理",
  ended: "本次执行结束",
} as const;
const stepLabels = {
  pending: "尚未开始",
  running: "当前执行",
  completed: "已完成",
  failed: "执行失败",
  deferred: "暂缓查验",
  cancelled: "本次不检查",
} as const;
const typeLabels = {
  confirm: "确认",
  choice: "选择",
  supplement: "补充",
  control: "控制",
} as const;
const requestLabels = {
  pending: "待处理",
  resolved: "已处理",
  obsolete: "已失效",
} as const;
const commandLabels = {
  queued: "已登记 · 尚未发送",
  sent: "已发送 · 等待设备确认",
  acknowledged: "设备已确认",
} as const;
const buildings = [
  [27, 13, 16, 20],
  [48, 13, 18, 20],
  [82, 13, 10, 18],
  [5, 27, 7, 14],
  [28, 56, 16, 21],
  [48, 57, 18, 15],
  [81, 55, 13, 18],
  [28, 82, 23, 8],
  [58, 82, 9, 9],
];

function record(kind: string, detail: string): void {
  telemetry.value.push({
    sequence: telemetry.value.length + 1,
    at: new Date().toISOString(),
    elapsedMs: Math.round(performance.now() - startedAt),
    mode: mode.value,
    kind,
    detail,
  });
}

function uid(prefix: string): string {
  actionSequence += 1;
  return `ui-${prefix}-${actionSequence}`;
}

function apply(action: LabAction, source: string): void {
  const attributed: LabAction = {
    ...action,
    provenance: source === "fixture-event" ? "fixture-event" : "interactive",
  };
  inputActions.value.push(attributed);
  state.value = dispatchLabAction(state.value, attributed);
  const entry = state.value.logs.at(-1);
  notice.value = entry?.detail ?? "状态已更新。";
  record(
    source,
    `${action.type}: ${entry?.accepted ? "accepted" : "rejected"}`,
  );
  exportPreview.value = "";
}

function stopReplay(): void {
  if (replayTimer !== undefined) window.clearInterval(replayTimer);
  replayTimer = undefined;
  replaying.value = false;
}

function start(): void {
  stopReplay();
  runningScenarioId.value = scenarioId.value;
  state.value = createInitialState(
    `lab:${crypto.randomUUID()}`,
    runningScenario.value.collaboration,
  );
  cursor.value = 0;
  executionQueue.value = [...runningScenario.value.steps];
  branchNotice.value = "";
  started.value = true;
  inputActions.value = [];
  telemetry.value = [];
  fieldValues.value = {};
  observationPointValues.value = {};
  priorityStepId.value = "s-c";
  selectedRoadId.value = runningScenario.value.collaboration ? "r-a" : "r-b";
  exportPreview.value = "";
  actionSequence = 0;
  startedAt = performance.now();
  notice.value = "已开始本地实验。通过下一事件推进仿真；人工事项由你操作。";
  record("start", runningScenarioId.value);
  advance();
}

function skipScriptedOperatorSteps(): void {
  while (executionQueue.value[cursor.value]?.scriptedOperator === true) {
    if (pending.value.length > 0) return;
    record("skip-scripted-answer", executionQueue.value[cursor.value]!.label);
    cursor.value += 1;
  }
}

function belongsToExcludedStep(action: LabAction): boolean {
  if (
    action.type === "start-step" ||
    action.type === "local-detour" ||
    action.type === "complete-step" ||
    action.type === "navigation-failed"
  ) {
    const step = state.value.steps.find((item) => item.id === action.stepId);
    return step?.status === "cancelled" || step?.status === "deferred";
  }
  if (action.type === "observe-road") {
    const related = state.value.steps.filter(
      (item) => item.roadId === action.roadId,
    );
    return (
      related.length > 0 &&
      related.every(
        (item) => item.status === "cancelled" || item.status === "deferred",
      )
    );
  }
  return false;
}

function insertRemainingFixtureChecks(): void {
  const unfinished = state.value.steps.filter(
    (step) => step.status === "pending" || step.status === "running",
  );
  if (unfinished.length === 0) return;
  const inserted: ScenarioStep[] = [];
  for (const step of unfinished) {
    if (step.status === "pending")
      inserted.push({
        label: `分支预设：重新开始${step.label}（仿真）`,
        action: {
          type: "start-step",
          actionId: uid("branch-start"),
          stepId: step.id,
        },
      });
    inserted.push(
      {
        label: `分支预设：注入${step.label}成功观测（仿真）`,
        action: {
          type: "observe-road",
          actionId: uid("branch-observe"),
          roadId: step.roadId,
          condition: "passable",
          detail:
            "分支成功fixture：预设该模拟UGV所需通道观测可通过，仅验证任务状态闭环，不代表真实重试成功。",
        },
      },
      {
        label: `分支预设：完成${step.label}（仿真）`,
        action: {
          type: "complete-step",
          actionId: uid("branch-complete"),
          stepId: step.id,
        },
      },
    );
  }
  executionQueue.value.splice(cursor.value, 0, ...inserted);
  branchNotice.value = `你选择的分支仍需完成：${unfinished.map((step) => step.label).join("、")}。已追加逐步注入的成功 fixture，用于验证任务闭环；不表示真实设备恢复成功。`;
  record("append-branch-fixture", branchNotice.value);
}

function advance(): void {
  if (!started.value || state.value.phase === "ended") {
    stopReplay();
    return;
  }
  skipScriptedOperatorSteps();
  while (
    nextStep.value !== undefined &&
    belongsToExcludedStep(nextStep.value.action)
  ) {
    record("skip-excluded-fixture-event", nextStep.value.label);
    cursor.value += 1;
    skipScriptedOperatorSteps();
  }
  if (
    !runningScenario.value.collaboration &&
    nextStep.value?.action.type === "finish-task"
  )
    insertRemainingFixtureChecks();
  const step = executionQueue.value[cursor.value];
  if (step === undefined) {
    stopReplay();
    notice.value = "案例事件已注入完毕。仍待处理的事项和未查明路段保留在页面。";
    return;
  }
  if (step.scriptedOperator === true) {
    stopReplay();
    notice.value = "等待你处理当前事项；案例中的脚本答复不会自动代你执行。";
    return;
  }
  let action: LabAction = { ...step.action, actionId: uid("event") };
  if (action.type === "respond")
    action = { ...action, runId: state.value.runId };
  if (action.type === "device-ack") {
    const command = [...state.value.commands]
      .reverse()
      .find((item) => item.status !== "acknowledged");
    if (command !== undefined) action = { ...action, commandId: command.id };
  }
  apply(action, "fixture-event");
  cursor.value += 1;
  if (
    pending.value.length > 0 ||
    cursor.value >= executionQueue.value.length ||
    presentation.value.phase === "ended"
  )
    stopReplay();
}

function toggleReplay(): void {
  if (replaying.value) {
    stopReplay();
    record("stop-replay", "operator");
    return;
  }
  if (!started.value) start();
  if (pending.value.length > 0 && nextStep.value?.scriptedOperator === true) {
    notice.value = "先处理待决事项，再继续事件回放。";
    return;
  }
  replaying.value = true;
  record("start-replay", "1 event / 1.2 seconds");
  replayTimer = window.setInterval(advance, 1200);
}

function respond(request: LabRequest, optionId: string): void {
  stopReplay();
  apply(
    {
      type: "respond",
      actionId: uid("response"),
      requestId: request.id,
      runId: request.runId,
      requestVersion: request.version,
      optionId,
      ...(request.requiredInput.kind === "fields"
        ? { values: fieldValues.value[request.id] ?? {} }
        : {}),
    },
    "operator-response",
  );
  if (state.value.phase === "ended") {
    executionQueue.value = executionQueue.value.slice(0, cursor.value);
    record(
      "stop-on-end",
      "未注入的剩余fixture事件已清除。原案例脚本仍保留在scenario定义。",
    );
  }
}

function updateField(requestId: string, key: string, value: string): void {
  fieldValues.value = {
    ...fieldValues.value,
    [requestId]: { ...fieldValues.value[requestId], [key]: value },
  };
}

function isObservationRequest(request: LabRequest): boolean {
  return request.options.some(
    (option) => option.effect === "provide-observation-point",
  );
}

function addConstraint(): void {
  stopReplay();
  const road = state.value.roads.find(
    (item) => item.id === constraintRoadId.value,
  )!;
  apply(
    {
      type: "add-constraint",
      actionId: uid("constraint"),
      text: `本次不检查${road.name}${constraintNote.value.trim() ? `。说明：${constraintNote.value.trim()}` : ""}`,
      roadIds: [road.id],
    },
    "operator-constraint",
  );
  constraintNote.value = "";
}

function pauseCommand(): void {
  stopReplay();
  apply(
    {
      type: "pause-command",
      actionId: uid("pause"),
      commandId: uid("command"),
    },
    "operator-command",
  );
}

function prioritizeStep(): void {
  stopReplay();
  apply(
    {
      type: "prioritize-step",
      actionId: uid("priority"),
      runId: state.value.runId,
      planVersion: state.value.planVersion,
      stepId: priorityStepId.value,
    },
    "operator-priority",
  );
}

function stepName(id: string): string {
  return state.value.steps.find((step) => step.id === id)?.label ?? id;
}

function contributionFeedback(stepIds: string[]): string {
  const steps = state.value.steps.filter((step) => stepIds.includes(step.id));
  return steps
    .map((step) => {
      const road = state.value.roads.find((item) => item.id === step.roadId);
      return `${step.label}：${stepLabels[step.status]}${road?.status === "observed" ? "，模拟观测反馈已到达" : "，道路仍未查明"}`;
    })
    .join("；");
}

function rejectOldResponse(request: LabRequest): void {
  apply(
    {
      type: "respond",
      actionId: uid("old-response"),
      requestId: request.id,
      runId: request.runId,
      requestVersion: request.version,
      optionId: request.options[0]?.id ?? "approve",
    },
    "stale-response-probe",
  );
}

function switchMode(nextMode: DisplayMode): void {
  mode.value = nextMode;
  record("switch-mode", nextMode);
  notice.value = "仅改变信息位置和聚焦，同一任务状态、事实及可用操作保持不变。";
}

function roadNames(ids: string[]): string {
  return (
    ids
      .map((id) => state.value.roads.find((road) => road.id === id)?.name ?? id)
      .join("、") || "全任务"
  );
}

function roadLabel(road: LabRoad): string {
  if (road.status === "unchecked") return "未查明";
  return road.condition === "blocked"
    ? "观测到受阻"
    : "观测可通行（仅模拟 UGV）";
}

function roadPoints(road: LabRoad): string {
  return road.polyline.map((point) => `${point.x},${point.y}`).join(" ");
}

function isMapFocus(id: string): boolean {
  return (
    id === selectedRoadId.value ||
    (mode.value === "dynamic" &&
      (presentation.value.focusRoadIds.includes(id) ||
        (collaboration.value !== undefined && currentStep.value?.roadId === id)))
  );
}

function exportRun(): void {
  record(
    "export",
    "state + raw actions + application log + interaction telemetry",
  );
  const document = {
    schemaVersion: "intervention-lab-export/v1",
    experiment: "deterministic-simulation",
    connectedToRealDevice: false,
    connectedToRealAgent: false,
    scenarioId: runningScenarioId.value,
    displayMode: mode.value,
    eventCursor: cursor.value,
    eventCount: executionQueue.value.length,
    originalFixtureEventCount: runningScenario.value.steps.length,
    executionQueue: executionQueue.value,
    state: state.value,
    inputActions: inputActions.value,
    interactionTelemetry: telemetry.value,
    measurementNote:
      "交互耗时为本浏览器的实际操作记录。没有参与者对照实验，不能据此主张效率改善。",
  };
  exportPreview.value = JSON.stringify(document, null, 2);
  const url = URL.createObjectURL(
    new Blob([exportPreview.value], { type: "application/json" }),
  );
  const link = window.document.createElement("a");
  link.href = url;
  link.download = `intervention-lab-${runningScenarioId.value}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  notice.value = "已导出原始动作、处理日志、完整状态和交互记录，可对照复测。";
}

onUnmounted(stopReplay);
</script>

<template>
  <div class="lab" :data-mode="mode" data-testid="intervention-lab">
    <header class="lab-heading">
      <div>
        <p class="eyebrow">COLLABORATIVE TASK PANEL · 专利交互验证</p>
        <h1>道路探查 · 人与 Agent 一起完成任务</h1>
        <p class="scope-note" data-testid="lab-simulation-label">确定性仿真 / 未连接真实设备或 LLM · 虚构街区 · 实验页面</p>
      </div>
      <button type="button" class="subtle" data-testid="lab-export" @click="exportRun">↓ 导出原始记录</button>
    </header>

    <section class="experiment-controls" aria-label="实验设置">
      <label class="scenario-select">验证案例
        <select v-model="scenarioId" data-testid="lab-scenario-select" @change="notice = '所选案例已改变，点击开始或重新开始后才切换运行；当前状态继续保留。'">
          <option v-for="scenario in LAB_SCENARIOS" :key="scenario.id" :value="scenario.id">{{ scenario.title }}</option>
        </select>
      </label>
      <button type="button" class="primary" data-testid="lab-start" @click="start">{{ started ? '重新开始所选案例' : '开始案例' }}</button>
      <button type="button" class="subtle" data-testid="lab-next" :data-action-type="nextStep?.action.type ?? 'none'" :data-scripted-operator="nextStep?.scriptedOperator === true" :data-cursor="cursor" :disabled="!started || state.phase === 'ended' || nextStep === undefined || waitingForOperator" @click="advance">下一仿真事件 →</button>
      <button type="button" class="subtle" data-testid="lab-autoplay" :disabled="started && (state.phase === 'ended' || nextStep === undefined || waitingForOperator)" @click="toggleReplay">{{ replaying ? '停止回放' : '自动回放' }}</button>
      <div class="mode-switch" aria-label="信息组织方式">
        <button type="button" :aria-pressed="mode === 'fixed'" data-testid="lab-mode-fixed" @click="switchMode('fixed')">固定组织</button>
        <button type="button" :aria-pressed="mode === 'dynamic'" data-testid="lab-mode-dynamic" @click="switchMode('dynamic')">动态组织</button>
      </div>
    </section>
    <p class="case-description" data-testid="lab-case-description">{{ selectedScenario.description }}</p>
    <div class="run-line">
      <span><i class="dot" /> {{ phaseLabels[state.phase] }} <span class="muted">· 计划 v{{ state.planVersion }}</span></span>
      <span data-testid="lab-cursor">事件 {{ cursor }}/{{ executionQueue.length }} <span class="muted">· {{ state.phase === 'ended' ? '本次已结束，不再注入后续事件' : waitingForOperator ? '等待人工处理，脚本答复不自动执行' : nextEventLabel }}</span></span>
    </div>
    <p v-if="started && scenarioId !== runningScenarioId" class="case-description">当前运行仍是「{{ runningScenario.title }}」；开始所选案例会重置这次实验。</p>
    <p v-if="branchNotice" class="branch-note" data-testid="lab-branch-note">{{ branchNotice }}</p>

    <section class="mission-strip" aria-label="持续任务概览" data-testid="lab-continuous-panel">
      <div class="mission-goal"><span class="panel-label">这次要完成</span><strong data-testid="lab-task-goal">{{ state.goal }}</strong><small>同一任务持续更新 · {{ state.phase === 'ready' ? '尚未开始' : phaseLabels[state.phase] }}</small></div>
      <div class="mission-current"><span class="panel-label">Agent 当前在做</span><strong data-testid="lab-current-step">{{ currentStep?.label ?? (state.phase === 'ended' ? '本次执行已结束' : pending.length ? '等待协作后继续' : started ? '准备下一步' : '等待开始') }}</strong><small>{{ pending.length ? `有 ${pending.length} 件事需要你参与` : '执行反馈会更新当前步骤和道路证据' }}</small></div>
      <div class="mission-progress"><span class="panel-label">当前取得的结果</span><strong data-testid="lab-progress">已完成 {{ completedStepCount }}/{{ state.steps.length }} 步</strong><small data-testid="lab-coverage">已查明 {{ state.roads.length - presentation.uncheckedRoadIds.length }}/{{ state.roads.length }} 条路 · {{ presentation.uncheckedRoadIds.length }} 条未查明</small></div>
    </section>

    <div class="workspace">
      <section class="map-card" aria-label="任务关联地图">
        <div class="card-heading"><strong>街区道路状态</strong><span>虚构示意 / 非实测地图</span></div>
        <div class="map-wrap">
          <svg viewBox="0 0 100 100" role="img" aria-label="虚构街区道路图，点击道路查看关联证据" data-testid="lab-map">
            <defs><pattern id="lab-grid" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M 5 0 L 0 0 0 5" fill="none" stroke="#23312e" stroke-width=".12" /></pattern></defs>
            <rect width="100" height="100" fill="url(#lab-grid)" />
            <g class="buildings"><rect v-for="(building, index) in buildings" :key="index" :x="building[0]" :y="building[1]" :width="building[2]" :height="building[3]" rx=".6" /></g>
            <text class="map-area-label" x="31" y="43">示意街区</text>
            <g v-for="road in state.roads" :key="road.id" :data-testid="`lab-road-${road.id}`" :data-condition="road.condition" :data-status="road.status" :data-focused="isMapFocus(road.id)" tabindex="0" role="button" :aria-label="`${road.name}，${roadLabel(road)}`" @click="selectedRoadId = road.id; record('inspect-road', road.id)" @keydown.enter="selectedRoadId = road.id; record('inspect-road', road.id)">
              <polyline :points="roadPoints(road)" fill="none" class="road-halo" :class="{ focused: isMapFocus(road.id) }" />
              <polyline :points="roadPoints(road)" fill="none" class="road-body" :class="[road.status, road.condition]" />
              <polyline :points="roadPoints(road)" fill="none" stroke="transparent" stroke-width="9" />
            </g>
            <text class="road-name" x="9" y="18">A</text><text class="road-name" x="48" y="52">B</text><text class="road-name" x="80" y="42">C</text>
            <g v-if="collaboration?.observationInput?.selectedPointId" class="observation-point" data-testid="lab-selected-point-marker">
              <template v-for="point in collaboration.observationInput.points.filter((item) => item.id === collaboration?.observationInput?.selectedPointId)" :key="point.id">
                <circle :cx="point.position.x" :cy="point.position.y" r="2.2" /><text :x="point.position.x + 3" :y="point.position.y - 2">观测点参数</text>
              </template>
            </g>
            <g :transform="`translate(${state.device.position.x},${state.device.position.y})`" class="ugv-marker">
              <circle r="3.5" /><rect x="-1.8" y="-1.6" width="3.6" height="3.2" rx=".5" /><text x="5" y="1">UGV</text>
            </g>
            <text class="north" x="93" y="8">N ↑</text>
          </svg>
          <div class="map-key"><span><i class="key-unknown" />未查明</span><span><i class="key-observed" />观测可通行</span><span><i class="key-blocked" />观测受阻</span></div>
          <div class="map-time" data-testid="lab-map-position">{{ state.device.link === 'offline' || state.device.execution === 'unknown' ? '最后确认位置' : '模拟位置' }} · 最后确认逻辑时刻 {{ state.device.lastConfirmedAt }}</div>
        </div>
        <div class="map-facts" data-testid="lab-map-facts">
          <div class="card-heading"><strong>{{ selectedRoad.name }}</strong><span :class="{ amber: selectedRoad.status === 'unchecked' }">{{ roadLabel(selectedRoad) }}</span></div>
          <p v-if="selectedRoad.evidence.length === 0">尚无道路观测证据。导航失败不能直接写成道路不可通行。</p>
          <ul v-else><li v-for="(evidence, index) in selectedRoad.evidence" :key="index">{{ evidence.detail }} <small>{{ evidence.source }} · 逻辑时刻 {{ evidence.logicalTime }}</small></li></ul>
          <p v-for="step in state.steps.filter((item) => item.roadId === selectedRoad.id && item.failureReason)" :key="step.id" class="failure-reason">执行反馈：{{ step.failureReason }}</p>
        </div>
      </section>

      <div class="task-column">
        <section class="task-card overview-card" data-testid="lab-task-state">
          <div class="card-heading"><strong>任务与执行顺序</strong><span>计划 v{{ state.planVersion }}</span></div>
          <p class="goal">{{ state.goal }}</p>
          <div class="next-step-row" data-testid="lab-next-scheduled-step"><span>当前步骤之后</span><strong>{{ nextScheduledStep?.label ?? '没有尚未开始的步骤' }}</strong><small>{{ collaboration ? '按下方实际顺序调度' : '按案例事件推进' }}</small></div>
          <ol class="step-list" data-testid="lab-step-order"><li v-for="(step, index) in orderedSteps" :key="step.id" :class="step.status" :data-testid="`lab-step-${step.id}`" :data-status="step.status" :data-order="index + 1"><span class="step-symbol">{{ step.status === 'completed' ? '✓' : step.status === 'running' ? '●' : index + 1 }}</span><span>{{ step.label }}</span><small>{{ stepLabels[step.status] }}</small></li></ol>
          <p v-if="collaboration?.executionOrder.length" class="execution-trace" data-testid="lab-execution-order">实际已开始：{{ collaboration.executionOrder.map(stepName).join(' → ') }}</p>
          <div class="outcome" data-testid="lab-outcome"><strong>{{ state.outcome === 'complete' ? '本次目标已完成（仿真）' : state.outcome === 'partial' ? '本次结束，仍有未查明路段' : '结果持续更新中' }}</strong><span>未查明 {{ presentation.uncheckedRoadIds.length }}/{{ state.roads.length }} 条 · 未观察的事实始终保留</span></div>
        </section>

        <section class="task-card intervention-card" :class="{ needsAttention: pending.length > 0 }" data-testid="lab-interventions">
          <div class="card-heading"><strong>Agent 需要你参与 <b class="count">{{ pending.length }}</b></strong><span>{{ mode === 'dynamic' ? '随当前状态聚焦' : '固定区域' }}</span></div>
          <p v-if="pending.length === 0" class="empty-note">当前没有待处理的协作请求。你仍可以主动调整后续任务。</p>
          <article v-for="request in pending" :key="`${request.id}-${request.version}`" class="request" :data-testid="`lab-request-${request.id}`" :data-request-type="request.type">
            <div class="request-title"><span class="type-tag">{{ typeLabels[request.type] }}型</span><h2>{{ request.title }}</h2></div>
            <p>{{ request.reason }}</p>
            <dl class="request-facts"><div><dt>关联道路</dt><dd>{{ roadNames(request.roadIds) }}</dd></div><div><dt>处理依据</dt><dd>{{ request.basis }}</dd></div><div><dt>请求版本</dt><dd>第 {{ request.version }} 版 · 基于生成时的计划第 {{ request.createdPlanVersion }} 版</dd></div></dl>
            <button class="text-button" type="button" :disabled="request.roadIds.length === 0" @click="selectedRoadId = request.roadIds[0]!; record('locate-request', request.id)">定位关联道路 ↗</button>
            <div v-if="request.requiredInput.kind === 'fields'" class="request-fields">
              <p class="empty-note">提交内容只记录本次不检查关联道路的要求；实际应用范围为 {{ roadNames(request.roadIds) }}，不会执行文本中的其他指令。</p>
              <label v-for="field in request.requiredInput.fields" :key="field.key">{{ field.label }}{{ field.required ? '（必填）' : '' }}<input :value="fieldValues[request.id]?.[field.key] ?? ''" :data-testid="`lab-field-${request.id}-${field.key}`" @input="updateField(request.id, field.key, ($event.target as HTMLInputElement).value)" /></label>
            </div>
            <form v-if="isObservationRequest(request)" class="observation-input-form" data-testid="lab-observation-point-form" @submit.prevent="respond(request, observationPointValues[request.id] ?? '')">
              <label>提供这一步需要的观测点<select :value="observationPointValues[request.id] ?? ''" data-testid="lab-observation-point" @change="observationPointValues[request.id] = ($event.target as HTMLSelectElement).value"><option value="">请选择预设观测点</option><option v-for="option in request.options" :key="option.id" :value="option.id">{{ option.label }}</option></select></label>
              <p class="empty-note">选择会写入当前步骤的执行参数。未选点时提交会被拒绝，任务仍等待你的补充。</p>
              <button type="submit" class="primary" data-testid="lab-submit-observation">提交观测点，继续协作</button>
            </form>
            <div v-else class="request-actions"><button v-for="option in request.options" :key="option.id" type="button" :data-testid="`lab-response-${request.id}-${option.id}`" :class="option.id === 'reject' || option.effect === 'end-task' ? 'subtle' : 'primary'" @click="respond(request, option.id)">{{ option.label }}</button></div>
          </article>
        </section>

        <section class="task-card lab-device-card" data-testid="lab-device-state">
          <div class="card-heading"><strong>{{ state.device.name }}</strong><span :class="{ amber: state.device.link === 'offline' }">{{ state.device.link === 'offline' ? '链路失联' : '模拟链路正常' }}</span></div>
          <div class="device-row"><span>设备执行反馈</span><strong>{{ state.device.execution === 'unknown' ? '当前执行状态未知' : state.device.execution === 'paused' ? '设备已确认暂停' : state.phase === 'ready' ? '仿真尚未开始' : '执行中（仿真）' }}</strong></div>
          <p v-if="state.device.link === 'offline'" class="empty-note amber">保留最后有效位置。链路中断不能直接推定设备已停下。</p>
          <button type="button" class="subtle" data-testid="lab-pause" :disabled="!started || state.phase === 'ended' || state.device.execution === 'paused' || state.commands.some((command) => command.status !== 'acknowledged')" @click="pauseCommand">Ⅱ 请求暂停设备</button>
          <div v-for="command in state.commands" :key="command.id" class="command-row" :data-testid="`lab-command-${command.id}`" :data-status="command.status"><code>{{ command.id }}</code><span>{{ commandLabels[command.status] }}</span></div>
        </section>

        <section class="task-card constraint-card" data-testid="lab-active-constraint">
          <div class="card-heading"><strong>主动调整任务</strong><span>始终可见</span></div>
          <form v-if="collaboration" class="priority-form" @submit.prevent="prioritizeStep" data-testid="lab-active-priority">
            <label>当前步骤完成后，优先做哪一步<select v-model="priorityStepId" data-testid="lab-priority-step" :disabled="upcomingSteps.length === 0"><option v-if="upcomingSteps.length === 0" value="">没有待执行步骤</option><option v-for="step in upcomingSteps" :key="step.id" :value="step.id">{{ step.label }}</option></select></label>
            <p v-if="started && priorityStepId === nextScheduledStep?.id" class="empty-note">当前计划已把这一步排在待执行首位。</p>
            <p class="empty-note">你可以在 Agent 执行时调整后续安排。只改变尚未开始步骤的顺序，当前步骤继续执行；下一次调度会读取修改后的顺序。</p>
            <button type="submit" class="primary" data-testid="lab-prioritize" :disabled="!started || state.phase === 'ended' || priorityStepId === nextScheduledStep?.id || !upcomingSteps.some((step) => step.id === priorityStepId)">应用优先顺序</button>
          </form>
          <form @submit.prevent="addConstraint">
            <label>本次不检查的路段<select v-model="constraintRoadId" data-testid="lab-constraint-road"><option v-for="road in state.roads" :key="road.id" :value="road.id">{{ road.name }}</option></select></label>
            <label>补充说明（记录用途）<input v-model="constraintNote" data-testid="lab-constraint-note" maxlength="300" placeholder="例如：该段本次暂缓，保留未查明结果" /></label>
            <p class="empty-note">仅直接修改尚未执行的关联步骤；执行中步骤需先确认暂停。说明文字不作为任意自然语言指令。已取得的观测结果保留。</p>
            <button type="submit" class="primary" data-testid="lab-add-constraint" :disabled="!started || state.phase === 'ended'">应用路段约束</button>
          </form>
          <ul v-if="state.constraints.length" class="constraint-list"><li v-for="constraint in state.constraints" :key="constraint.id">{{ constraint.text }}</li></ul>
        </section>

        <section v-if="collaboration" class="task-card collaboration-card" :class="{ hasContributions: collaboration.contributions.length > 0 }" data-testid="lab-collaboration-feedback">
          <div class="card-heading"><strong>协作之后，任务怎样变化</strong><span>输入 → 应用 → 执行反馈</span></div>
          <div v-if="collaboration.observationInput" class="parameter-state" data-testid="lab-observation-input" :data-status="collaboration.observationInput.status">
            <span class="panel-label">{{ stepName(collaboration.observationInput.stepId) }}的观测点参数</span>
            <strong>{{ collaboration.observationInput.selectedPointId ? collaboration.observationInput.points.find((point) => point.id === collaboration?.observationInput?.selectedPointId)?.label : collaboration.observationInput.status === 'requested' ? 'Agent 已请求你提供观测点' : '尚未提供，不能写入道路观测结果' }}</strong>
            <p class="empty-note">{{ collaboration.observationInput.selectedPointId ? '你的选择已写入这一步的执行参数。后续仿真观测反馈到达后，才会更新位置、道路证据和查明结果。' : 'Agent 负责继续执行和取得反馈；你负责选择本案例中预设的观测点。按钮答复本身不等于已完成观测。' }}</p>
          </div>
          <div class="contribution-list" data-testid="lab-contributions">
            <p v-if="collaboration.contributions.length === 0" class="empty-note">尚无已应用的协作输入。你做出的选择和主动调整会留在这里，并关联到后续执行状态。</p>
            <article v-for="contribution in collaboration.contributions" :key="contribution.actionId" class="contribution" :data-testid="`lab-contribution-${contribution.actionId}`" :data-kind="contribution.kind">
              <strong>{{ contribution.kind === 'observation-input' ? '你补充了执行信息' : '你调整了后续优先顺序' }}</strong>
              <p>{{ contribution.detail }}</p>
              <small>已应用到计划 v{{ contribution.planVersion }} · 逻辑时刻 {{ contribution.logicalTime }}</small>
              <div class="contribution-feedback">后续步骤反馈：{{ contributionFeedback(contribution.stepIds) }}</div>
            </article>
          </div>
          <p class="empty-note">这里核对协作输入是否接回执行。能力和质量是否提升，需要真实任务与人员评测。</p>
        </section>
      </div>
    </div>

    <p class="status-notice" role="status" aria-live="polite" data-testid="lab-notice">{{ notice || '选择案例并开始；可随时切换两种布局，对比同一状态的信息组织。' }}</p>

    <div class="evidence-panels">
      <section class="task-card history-card">
        <div class="card-heading"><strong>处理记录与旧请求核查</strong><span>不隐藏失效事项</span></div>
        <p v-if="state.requests.length === 0" class="empty-note">尚无人工请求。</p>
        <article v-for="request in state.requests" :key="request.id" class="history-request" :data-testid="`lab-history-${request.id}`" :data-status="request.status"><div><strong>{{ request.title }}</strong><span :class="{ amber: request.status === 'pending' }">{{ requestLabels[request.status] }} · v{{ request.version }}</span></div><p>{{ request.resolution || request.reason }}</p><button v-if="request.status !== 'pending'" type="button" class="text-button" :data-testid="`lab-stale-${request.id}`" @click="rejectOldResponse(request)">注入旧答复，检查是否被拒绝</button></article>
      </section>
      <section class="task-card logs-card">
        <div class="card-heading"><strong>原始处理日志</strong><span>逻辑时间 / 非设备实测</span></div>
        <div class="log-list" data-testid="lab-logs"><p v-if="state.logs.length === 0" class="empty-note">尚未注入事件。</p><div v-for="log in [...state.logs].reverse()" :key="log.sequence" class="log-entry" :class="{ rejected: !log.accepted }"><code>{{ log.sequence }} · {{ log.actionType }}</code><span>{{ log.accepted ? '接受' : '拒绝' }} · {{ log.detail }}</span></div></div>
      </section>
    </div>

    <details class="inspection">
      <summary>实验规则与完整状态 · 可审计</summary>
      <p>以下为本实验的明确处理约定，不是军事规范、真实战例或已验证的通用风险判据。页面不调用 Nav2、真实设备、真实 LLM 或真实 AG-UI 服务。</p>
      <ul><li v-for="rule in presentation.rules" :key="rule.id"><strong>{{ rule.id }}</strong> {{ rule.rule }} <small>依据：{{ rule.basis }}</small></li></ul>
      <p>两种布局共享同一状态、数据和操作。浏览器交互记录可以支持复测；尚未进行真人对照试验，不能据此声称更快、更安全或更好用。</p>
      <label>当前完整状态<textarea readonly rows="12" :value="stateJson" data-testid="lab-state-json" spellcheck="false" /></label>
      <label>当前执行事件队列（含明确标注的分支 fixture）<textarea readonly rows="12" :value="fixtureJson" data-testid="lab-fixture-json" spellcheck="false" /></label>
      <label v-if="exportPreview">最近导出内容<textarea readonly rows="12" :value="exportPreview" data-testid="lab-export-json" spellcheck="false" /></label>
    </details>
  </div>
</template>

<style scoped src="./intervention-lab.css"></style>
