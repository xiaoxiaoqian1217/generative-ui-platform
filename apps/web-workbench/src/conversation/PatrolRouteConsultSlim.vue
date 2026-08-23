<script setup lang="ts">
import { ToolCallStatus } from "@copilotkit/core";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import {
  activeConsultSession,
  clearConsultRevisionAnchor,
  consultOutcome,
  consultRevisionAnchor,
  consultRevisionMode,
  resetConsultInteractionUi,
} from "./consult-session.js";
import type { ConsultVariant } from "./consult-variant.js";
import type {
  PatrolRouteConsultRequest,
  PatrolRouteConsultResponse,
} from "./patrol-route-consult.js";
import {
  parsePatrolRouteConsultResponse,
  patrolRouteConsultRequestSchema,
  patrolRouteConsultResult,
} from "./patrol-route-consult.js";

/**
 * PROTOTYPE (variants B and C): the conversation keeps only a slim pending
 * record and the final decision record; the decision UI lives on the map
 * overlay (popup for B, decision dock for C). This component registers the
 * active consultation into the shared consult-session store so the map side
 * can drive preview, tentative pick, confirm, cancel and revise.
 */
const props = defineProps<{
  args: Partial<PatrolRouteConsultRequest>;
  cancelConsultPreview: (toolCallId: string) => Promise<void>;
  completeConsult: (toolCallId: string) => void;
  invalidateConsult: (toolCallId: string) => void;
  isConsultActive: (toolCallId: string) => boolean;
  markConsultActive: (toolCallId: string) => void;
  respond?: ((result: unknown) => Promise<void>) | undefined;
  result?: string | undefined;
  status: ToolCallStatus;
  toolCallId: string;
  variant: ConsultVariant;
}>();

const submitted = ref(false);
const validationError = ref<string>();
const request = computed(() =>
  patrolRouteConsultRequestSchema.safeParse(props.args),
);
const completedResult = computed(() => patrolRouteConsultResult(props.result));
const isComplete = computed(() => props.status === ToolCallStatus.Complete);
const canRespond = computed(
  () =>
    props.status === ToolCallStatus.Executing &&
    props.respond !== undefined &&
    !submitted.value &&
    props.isConsultActive(props.toolCallId) &&
    request.value.success,
);

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

watch(
  () => [props.status, request.value.success] as const,
  ([status, success]) => {
    if (status === ToolCallStatus.Executing) {
      props.markConsultActive(props.toolCallId);
      if (success && request.value.success) {
        if (consultOutcome.value?.toolCallId === props.toolCallId)
          consultOutcome.value = undefined;
        clearConsultRevisionAnchor();
        activeConsultSession.value = {
          request: request.value.data,
          submit,
          toolCallId: props.toolCallId,
        };
      }
      return;
    }
    if (status === ToolCallStatus.Complete) {
      props.completeConsult(props.toolCallId);
      const result = patrolRouteConsultResult(props.result);
      if (result !== undefined && request.value.success) {
        consultOutcome.value = {
          request: request.value.data,
          response: result,
          toolCallId: props.toolCallId,
        };
      }
      if (activeConsultSession.value?.toolCallId === props.toolCallId)
        activeConsultSession.value = undefined;
      resetConsultInteractionUi();
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  props.invalidateConsult(props.toolCallId);
  if (activeConsultSession.value?.toolCallId === props.toolCallId) {
    activeConsultSession.value = undefined;
    resetConsultInteractionUi();
    clearConsultRevisionAnchor();
  }
});

function startRevision(): void {
  if (!canRespond.value) return;
  consultRevisionMode.value = true;
}

const hintText = computed(() => {
  if (consultRevisionMode.value)
    return "修改模式: 在地图上点击位置或路线添加锚点, 然后描述修改要求。";
  return props.variant === "b"
    ? "在地图上比较两条候选路线, 点击路线查看并确认。"
    : "先在地图下方的决策坞中选择路线, 再点击地图中的同一路线提出修改, 或直接确认选择。";
});
const doneText = computed(() => {
  const result = completedResult.value;
  if (result === undefined) return "征询已完成。";
  if (result.action === "select") {
    const option = request.value.success
      ? request.value.data.options.find(
          (candidate) => candidate.id === result.selectedOptionId,
        )
      : undefined;
    return `已选定 ${option?.label ?? result.selectedOptionId}, 决定已记录。`;
  }
  if (result.action === "cancel") return "已取消, 本次征询未选择路线。";
  const anchorNote =
    consultRevisionAnchor.value !== undefined ? "锚点已保留在地图上。" : "";
  return `已记录修改要求: ${result.instruction}。${anchorNote}`;
});
</script>

<template>
  <section
    class="consult-slim"
    :data-done="isComplete"
    :data-testid="`patrol-route-consult-slim-${toolCallId}`"
  >
    <span class="consult-slim-wait" aria-hidden="true"></span>
    <div class="consult-slim-body">
      <p v-if="!isComplete">
        <strong>等待你的决定: 选择候选巡逻路线。</strong>
        {{ hintText }}
      </p>
      <p v-else>
        <strong>征询已答复。</strong>
        {{ doneText }}
      </p>
      <div v-if="!isComplete && variant === 'b'" class="consult-slim-actions">
        <button
          class="link-button"
          data-testid="consult-slim-revise"
          :disabled="!canRespond || consultRevisionMode"
          type="button"
          @click="startRevision"
        >
          修改要求
        </button>
        <button
          class="link-button"
          data-testid="consult-slim-cancel"
          :disabled="!canRespond"
          type="button"
          @click="submit({ action: 'cancel' })"
        >
          取消选择
        </button>
      </div>
      <p v-if="validationError" class="consult-validation-error" role="alert">
        {{ validationError }}
      </p>
      <p v-if="!request.success" class="consult-validation-error" role="alert">
        候选路线数据尚未完整或不符合固定场景契约。
      </p>
    </div>
  </section>
</template>
