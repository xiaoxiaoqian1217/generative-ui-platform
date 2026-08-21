<script setup lang="ts">
import { computed, ref } from "vue";
import type { ConversationTurn } from "../conversation/conversation-store.js";
import {
  mapOperationSteps,
  type MapOperationStep,
} from "../conversation/map-operation-trace.js";
import {
  mapPlanActivityObservation,
  mapPlanFromTurn,
} from "../conversation/map-plan-activity.js";
import JsonTree from "../inspect/JsonTree.vue";
import SwimlaneTimeline from "../inspect/SwimlaneTimeline.vue";
import {
  correlationKeyOf,
  exchangeForObservation,
  formatObservedTime,
  OBSERVATION_SOURCE_LABELS,
  type TurnObservation,
} from "../inspect/turn-inspection.js";

/**
 * Issue #205 / #179 Resolution（变体 B）：Turn Inspector。
 * 定位层：泳道时间线展示平台自有诊断元数据（顺序 / 状态 / 耗时）；
 * 详情层：输入输出 Raw JSON 直通，UI 不解释业务语义，
 * 请求 / 返回配对只在真实存在对应关系时出现。
 */

const props = defineProps<{ turn: ConversationTurn }>();
defineEmits<{ close: [] }>();

const selectedId = ref<string>();
const copyState = ref<"" | "copied" | "failed">("");

const observations = computed(
  (): readonly TurnObservation[] => props.turn.observations ?? [],
);
const mapSteps = computed(() => mapOperationSteps(observations.value));
const mapPlan = computed(() => mapPlanFromTurn(props.turn));

const selected = computed(() =>
  observations.value.find((item) => item.id === selectedId.value),
);

const selectedExchange = computed(() =>
  selected.value === undefined
    ? undefined
    : exchangeForObservation(observations.value, selected.value),
);

const activeCorrelationKey = computed(() =>
  selected.value === undefined ? undefined : correlationKeyOf(selected.value),
);

type DetailSide = "request" | "response" | "raw";

interface DetailBlock {
  readonly payload: unknown;
  readonly side: DetailSide;
}

/** 未配对观察的单侧表达：请求类只显示请求，输出类只显示返回，不编造对侧。 */
const singleBlock = computed<DetailBlock | undefined>(() => {
  const item = selected.value;
  if (item === undefined || selectedExchange.value !== undefined)
    return undefined;
  if (item.payload === undefined) return undefined;
  if (
    item.type === "RUN_INPUT" ||
    item.type === "RESUME_INPUT" ||
    item.type === "FRONTEND_TOOL_INVOCATION"
  )
    return { payload: item.payload, side: "request" };
  if (item.hasArtifact) return { payload: item.payload, side: "response" };
  return { payload: item.payload, side: "raw" };
});

const SIDE_LABELS: Record<DetailSide, string> = {
  raw: "原始 AG-UI Event payload",
  request: "→ 请求",
  response: "← 返回",
};

function select(id: string): void {
  selectedId.value = id;
  copyState.value = "";
}

function selectMapStep(step: MapOperationStep): void {
  const invocation = observations.value.find(
    (observation) =>
      observation.type === "FRONTEND_TOOL_INVOCATION" &&
      observation.toolCallId === step.toolCallId,
  );
  if (invocation !== undefined) select(invocation.id);
}

function selectMapPlanActivity(): void {
  const activity = mapPlanActivityObservation(observations.value);
  if (activity !== undefined) select(activity.id);
}

async function copyJson(payload: unknown): Promise<void> {
  try {
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    copyState.value = "copied";
  } catch {
    copyState.value = "failed";
  }
}
</script>

<template>
  <aside class="inspect-panel" data-testid="inspect-panel">
    <header>
      <div>
        <p class="eyebrow">TURN {{ turn.turnId }}</p>
        <h2>Turn Inspect</h2>
      </div>
      <button data-testid="inspect-close" type="button" @click="$emit('close')">
        关闭
      </button>
    </header>

    <dl class="inspect-ids">
      <div>
        <dt>threadId</dt>
        <dd data-testid="inspect-turn-thread-id">{{ turn.threadId ?? '-' }}</dd>
      </div>
      <div>
        <dt>runId</dt>
        <dd data-testid="inspect-turn-run-id">{{ turn.runId ?? '-' }}</dd>
      </div>
      <div><dt>status</dt><dd>{{ turn.status }}</dd></div>
    </dl>

    <section
      v-if="mapSteps.length > 0 || mapPlan !== undefined"
      class="inspect-map-operations"
      data-testid="inspect-map-operations"
    >
      <header>
        <div>
          <p class="eyebrow">USER-VISIBLE PROJECTION</p>
          <h3>地图操作记录</h3>
        </div>
        <span>{{ mapSteps.length }} 项操作</span>
      </header>
      <p class="inspect-map-operations-note">
        公开计划来自真实 map-plan Activity；操作和状态来自真实 Frontend Tool 调用与返回。两者均不代表 Agent 内部推理。
      </p>
      <button
        v-if="mapPlan !== undefined"
        class="inspect-map-plan"
        data-testid="inspect-map-plan"
        type="button"
        @click="selectMapPlanActivity"
      >
        <span>
          <small class="inspect-map-plan-label">公开计划</small>
          <strong>{{ mapPlan.goal }}</strong>
        </span>
        <span>{{ mapPlan.steps.length }} 个阶段</span>
      </button>
      <ol>
        <li v-for="(step, index) in mapSteps" :key="step.toolCallId">
          <button
            :data-status="step.status"
            :data-testid="`inspect-map-operation-${step.toolCallId}`"
            type="button"
            @click="selectMapStep(step)"
          >
            <span class="inspect-map-operation-index">{{ index + 1 }}</span>
            <span class="inspect-map-operation-copy">
              <strong>{{ step.label }}</strong>
              <code>{{ step.toolName }}</code>
            </span>
            <span class="inspect-map-operation-status">{{ step.status }}</span>
          </button>
        </li>
      </ol>
    </section>

    <div class="lane-layout">
      <SwimlaneTimeline
        :active-correlation-key="activeCorrelationKey"
        :observations="observations"
        :selected-id="selectedId"
        @select="select"
      />

      <section
        v-if="selected !== undefined"
        :key="selected.id"
        class="event-detail"
        data-testid="inspect-detail"
      >
        <p class="eyebrow">EVENT #{{ selected.observedIndex }}</p>
        <h3>{{ selected.type }}</h3>
        <dl>
          <div>
            <dt>参与方</dt>
            <dd>{{ OBSERVATION_SOURCE_LABELS[selected.source] }}</dd>
          </div>
          <div>
            <dt>观察时间</dt>
            <dd>{{ formatObservedTime(selected.observedAt) }}</dd>
          </div>
          <div v-if="selected.status">
            <dt>状态</dt>
            <dd :data-status="selected.status">{{ selected.status }}</dd>
          </div>
          <div v-if="selected.durationMs !== undefined">
            <dt>耗时</dt>
            <dd>{{ selected.durationMs }}ms</dd>
          </div>
          <div v-if="selected.toolCallId">
            <dt>toolCall</dt>
            <dd data-testid="inspect-tool-call-id">{{ selected.toolCallId }}</dd>
          </div>
          <div v-if="selected.runId">
            <dt>run</dt>
            <dd data-testid="inspect-run-id">{{ selected.runId }}</dd>
          </div>
          <div v-if="selected.threadId">
            <dt>thread</dt>
            <dd data-testid="inspect-thread-id">{{ selected.threadId }}</dd>
          </div>
          <div v-if="selected.interruptId">
            <dt>interrupt</dt>
            <dd>{{ selected.interruptId }}</dd>
          </div>
        </dl>

        <p
          v-if="!selected.hasArtifact"
          class="ctx-note"
          data-testid="inspect-no-artifact"
        >
          过程事件（{{ selected.type }}）：不产生契约边界
          Artifact；以下为该事件的原始公开 payload。
        </p>

        <template v-if="selectedExchange !== undefined">
          <h5>输入与输出（原始 JSON 直通）</h5>
          <div
            v-if="selectedExchange.request?.payload !== undefined"
            class="ctx-block"
            data-testid="inspect-exchange-request"
          >
            <div class="ctx-side">
              <span>{{ SIDE_LABELS.request }}</span>
              <span class="ctx-type">{{
                selectedExchange.request?.type
              }}</span>
              <button
                class="ctx-copy"
                data-testid="inspect-copy-request"
                type="button"
                @click="copyJson(selectedExchange.request?.payload)"
              >
                复制
              </button>
            </div>
            <JsonTree :data="selectedExchange.request?.payload" />
          </div>
          <div
            v-if="selectedExchange.response?.payload !== undefined"
            class="ctx-block"
            data-testid="inspect-exchange-response"
          >
            <div class="ctx-side">
              <span>{{ SIDE_LABELS.response }}</span>
              <span class="ctx-type">{{
                selectedExchange.response?.type
              }}</span>
              <button
                class="ctx-copy"
                data-testid="inspect-copy-response"
                type="button"
                @click="copyJson(selectedExchange.response?.payload)"
              >
                复制
              </button>
            </div>
            <JsonTree :data="selectedExchange.response?.payload" />
          </div>
        </template>

        <template v-else-if="singleBlock !== undefined">
          <h5>
            {{
              singleBlock.side === "raw"
                ? SIDE_LABELS.raw
                : `输入与输出（原始 JSON 直通）`
            }}
          </h5>
          <div class="ctx-block" data-testid="inspect-payload">
            <div class="ctx-side">
              <span>{{ SIDE_LABELS[singleBlock.side] }}</span>
              <span class="ctx-type">{{ selected.type }}</span>
              <button
                class="ctx-copy"
                data-testid="inspect-copy"
                type="button"
                @click="copyJson(singleBlock.payload)"
              >
                复制
              </button>
            </div>
            <JsonTree :data="singleBlock.payload" />
          </div>
        </template>

        <p v-if="copyState === 'copied'" data-testid="inspect-copy-state">
          已复制。
        </p>
        <p
          v-else-if="copyState === 'failed'"
          data-testid="inspect-copy-state"
        >
          复制失败。
        </p>
      </section>

      <section v-else class="event-detail event-detail-empty">
        <p class="eyebrow">EVENT DETAIL</p>
        <p class="ctx-note" data-testid="inspect-detail-hint">
          点击左侧任一事件查看其真实公开 payload；请求 / 返回配对只在真实成对时出现。
        </p>
      </section>
    </div>
  </aside>
</template>
