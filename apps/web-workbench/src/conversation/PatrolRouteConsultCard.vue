<script setup lang="ts">
import { ToolCallStatus } from "@copilotkit/core";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import type {
  PatrolRouteConsultRequest,
  PatrolRouteConsultResponse,
  PatrolRouteOption,
} from "./patrol-route-consult.js";
import {
  parsePatrolRouteConsultResponse,
  PATROL_ROUTE_REVISE_INSTRUCTION,
  patrolRouteConsultRequestSchema,
  patrolRouteConsultResult,
} from "./patrol-route-consult.js";

const props = defineProps<{
  args: Partial<PatrolRouteConsultRequest>;
  cancelConsultPreview: (toolCallId: string) => Promise<void>;
  completeConsult: (toolCallId: string) => void;
  invalidateConsult: (toolCallId: string) => void;
  isConsultActive: (toolCallId: string) => boolean;
  markConsultActive: (toolCallId: string) => void;
  previewOption: (
    toolCallId: string,
    option: PatrolRouteOption,
  ) => Promise<void>;
  respond?: ((result: unknown) => Promise<void>) | undefined;
  result?: string | undefined;
  status: ToolCallStatus;
  toolCallId: string;
}>();

const previewedOptionId = ref<string>();
const previewingOptionId = ref<string>();
const revisionInstruction = ref(PATROL_ROUTE_REVISE_INSTRUCTION);
const submitted = ref(false);
const validationError = ref<string>();
const request = computed(() =>
  patrolRouteConsultRequestSchema.safeParse(props.args),
);
const completedResult = computed(() => patrolRouteConsultResult(props.result));
const canRespond = computed(
  () =>
    props.status === ToolCallStatus.Executing &&
    props.respond !== undefined &&
    !submitted.value &&
    props.isConsultActive(props.toolCallId) &&
    request.value.success,
);

watch(
  () => props.status,
  (status) => {
    if (status === ToolCallStatus.Executing) {
      props.markConsultActive(props.toolCallId);
      return;
    }
    if (status === ToolCallStatus.Complete)
      props.completeConsult(props.toolCallId);
  },
  { immediate: true },
);

async function preview(option: PatrolRouteOption): Promise<void> {
  if (
    !canRespond.value ||
    previewedOptionId.value === option.id ||
    previewingOptionId.value === option.id
  )
    return;
  validationError.value = undefined;
  previewingOptionId.value = option.id;
  try {
    await props.previewOption(props.toolCallId, option);
    previewedOptionId.value = option.id;
  } catch (error) {
    validationError.value =
      error instanceof Error ? error.message : "路线预览失败。";
  } finally {
    if (previewingOptionId.value === option.id)
      previewingOptionId.value = undefined;
  }
}

async function submit(response: PatrolRouteConsultResponse): Promise<void> {
  if (
    !canRespond.value ||
    !request.value.success ||
    props.respond === undefined
  )
    return;
  validationError.value = undefined;
  try {
    const parsed = parsePatrolRouteConsultResponse(
      request.value.data,
      response,
    );
    submitted.value = true;
    if (parsed.action === "cancel")
      await props.cancelConsultPreview(props.toolCallId);
    await props.respond(parsed);
  } catch (error) {
    submitted.value = false;
    validationError.value =
      error instanceof Error ? error.message : "征询答复无效。";
  }
}

async function select(option: PatrolRouteOption): Promise<void> {
  if (previewedOptionId.value !== option.id) await preview(option);
  if (previewedOptionId.value !== option.id) return;
  await submit({ action: "select", selectedOptionId: option.id });
}

function revise(): void {
  if (revisionInstruction.value.trim() !== PATROL_ROUTE_REVISE_INSTRUCTION) {
    validationError.value = "当前确定性场景只支持示例中的固定修改要求。";
    return;
  }
  void submit({
    action: "revise",
    instruction: PATROL_ROUTE_REVISE_INSTRUCTION,
    selectedOptionId: "route-b",
  });
}

onBeforeUnmount(() => props.invalidateConsult(props.toolCallId));
</script>

<template>
  <section
    class="patrol-route-consult"
    :data-status="status"
    :data-testid="`patrol-route-consult-${toolCallId}`"
  >
    <header class="patrol-route-consult-header">
      <div>
        <p class="eyebrow">业务征询</p>
        <h3>{{ args.question || "正在准备候选路线..." }}</h3>
      </div>
      <span class="patrol-route-consult-status" data-testid="consult-status">
        {{ status }}
      </span>
    </header>

    <p v-if="!request.success" class="consult-validation-error" role="alert">
      候选路线数据尚未完整或不符合固定场景契约。
    </p>

    <div v-else class="patrol-route-options">
      <article
        v-for="option in request.data.options"
        :key="option.id"
        class="patrol-route-option"
        :data-previewing="previewedOptionId === option.id"
        :data-testid="`patrol-route-option-${option.id}`"
      >
        <div>
          <strong>{{ option.label }}</strong>
          <p>{{ option.summary }}</p>
        </div>
        <span v-if="previewedOptionId === option.id" class="previewing-label">
          地图正在预览
        </span>
        <div class="patrol-route-option-actions">
          <button
            class="secondary-button"
            :data-testid="`preview-${option.id}`"
            :disabled="!canRespond"
            type="button"
            @click="preview(option)"
            @focus="preview(option)"
            @mouseenter="preview(option)"
          >
            预览
          </button>
          <button
            class="primary-button"
            :data-testid="`select-${option.id}`"
            :disabled="!canRespond"
            type="button"
            @click="select(option)"
          >
            选择{{ option.label }}
          </button>
        </div>
      </article>
    </div>

    <form class="patrol-route-revision" @submit.prevent="revise">
      <label>
        修改要求
        <input
          v-model="revisionInstruction"
          data-testid="consult-revision-input"
          :disabled="!canRespond"
          maxlength="80"
          :placeholder="PATROL_ROUTE_REVISE_INSTRUCTION"
          type="text"
        />
      </label>
      <button
        class="secondary-button"
        data-testid="consult-revise"
        :disabled="
          !canRespond ||
          revisionInstruction.trim() !== PATROL_ROUTE_REVISE_INSTRUCTION
        "
        type="submit"
      >
        提交修改要求
      </button>
    </form>

    <div class="patrol-route-consult-footer">
      <button
        class="secondary-button"
        data-testid="consult-cancel"
        :disabled="!canRespond"
        type="button"
        @click="submit({ action: 'cancel' })"
      >
        取消选择
      </button>
      <p v-if="validationError" class="consult-validation-error" role="alert">
        {{ validationError }}
      </p>
      <p v-if="submitted && status !== ToolCallStatus.Complete" role="status">
        已提交，正在等待 Agent continuation。
      </p>
      <p
        v-if="status === ToolCallStatus.Complete"
        class="consult-complete-result"
        data-testid="consult-result"
      >
        <template v-if="completedResult?.action === 'select'">
          已记录选择 {{ completedResult.selectedOptionId }}。
        </template>
        <template v-else-if="completedResult?.action === 'cancel'">
          已取消，本次征询未选择路线。
        </template>
        <template v-else-if="completedResult?.action === 'revise'">
          已记录修改要求: {{ completedResult.instruction }}。
        </template>
        <template v-else>征询已完成。</template>
      </p>
    </div>
  </section>
</template>
