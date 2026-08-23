<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import {
  activeConsultSession,
  consultEmphasizedOptionId,
  consultOutcome,
  consultPopupAnchor,
  consultRevisionAnchor,
  consultRevisionMode,
  consultRevisionPopup,
  consultTentativeOptionId,
} from "./consult-session.js";
import { consultVariant } from "./consult-variant.js";
import { PATROL_ROUTE_REVISE_INSTRUCTION } from "./patrol-route-consult.js";

/**
 * Map-overlay decision UI for the patrol-route consultation. Reads the active
 * consultation registered by the slim chat
 * record and renders:
 *   - a persistent pending / outcome pill (B and C)
 *   - the decision dock (C)
 *   - the anchored route popup (B)
 *   - the revision popup with the comment form (B and C, revision mode)
 * The wrapper is pointer-events: none so map hover / click reach MapLibre;
 * only interactive children re-enable pointer events.
 */
const session = activeConsultSession;
const sessionCanRespond = computed(
  () => session.value?.canRespond() === true,
);

const showPill = computed(
  () =>
    consultVariant.value !== "a" &&
    (session.value !== undefined || consultOutcome.value !== undefined),
);
const pillDone = computed(
  () => session.value === undefined && consultOutcome.value !== undefined,
);
const tentativeOption = computed(() =>
  session.value?.request.options.find(
    (option) => option.id === consultTentativeOptionId.value,
  ),
);
const pillText = computed(() => {
  if (session.value !== undefined) {
    if (!sessionCanRespond.value) return "正在提交决定...";
    if (consultRevisionMode.value) {
      if (consultVariant.value === "c")
        return `修改 ${tentativeOption.value?.label ?? "已选路线"}: 请描述修改要求`;
      return "修改模式: 点击地图或路线添加锚点";
    }
    return "等待你的决定";
  }
  const outcome = consultOutcome.value;
  if (outcome === undefined) return "";
  if (outcome.response.action === "select") {
    const option = outcome.request.options.find(
      (candidate) =>
        outcome.response.action === "select" &&
        candidate.id === outcome.response.selectedOptionId,
    );
    return `✓ 已选定 ${option?.label ?? "候选路线"}`;
  }
  if (outcome.response.action === "cancel") return "已取消选择";
  const revisedOption = outcome.request.options.find(
    (option) =>
      outcome.response.action === "revise" &&
      option.id === outcome.response.selectedOptionId,
  );
  return `已记录 ${revisedOption?.label ?? "候选路线"} 修改要求`;
});

/* ---------------- variant C: decision dock ---------------- */
/* The dock is the decision locus: it stays visible while the anchored
   revision popup is open, so clicking a route never makes the decision UI
   disappear underneath the user. */
const showDock = computed(
  () => consultVariant.value === "c" && session.value !== undefined,
);

function hoverOption(optionId: string): void {
  if (!sessionCanRespond.value) return;
  consultEmphasizedOptionId.value = optionId;
}
function pickOption(optionId: string): void {
  if (!sessionCanRespond.value) return;
  consultTentativeOptionId.value = optionId;
  consultEmphasizedOptionId.value = optionId;
  discardRevisionDraft();
}
function discardRevisionDraft(): void {
  consultRevisionMode.value = false;
  consultRevisionPopup.value = undefined;
  consultRevisionAnchor.value = undefined;
}
async function confirmTentative(): Promise<void> {
  const option = tentativeOption.value;
  if (
    session.value === undefined ||
    option === undefined ||
    !sessionCanRespond.value
  )
    return;
  discardRevisionDraft();
  await session.value.submit({ action: "select", selectedOptionId: option.id });
}
async function cancelConsult(): Promise<void> {
  if (!sessionCanRespond.value) return;
  discardRevisionDraft();
  await session.value?.submit({ action: "cancel" });
}

/* ---------------- variant B: anchored popup ---------------- */
const popupOption = computed(() => {
  const anchor = consultPopupAnchor.value;
  if (anchor === undefined) return undefined;
  return session.value?.request.options.find(
    (option) => option.id === anchor.optionId,
  );
});
const showPopup = computed(
  () =>
    consultVariant.value === "b" &&
    session.value !== undefined &&
    sessionCanRespond.value &&
    !consultRevisionMode.value &&
    popupOption.value !== undefined,
);
const popupStyle = computed(() => {
  const anchor = consultPopupAnchor.value;
  if (anchor === undefined) return {};
  return {
    left: `clamp(30px, ${Math.round(anchor.x)}px, calc(100% - 232px))`,
    top: `clamp(190px, ${Math.round(anchor.y)}px, 100%)`,
  };
});

function closePopup(): void {
  consultPopupAnchor.value = undefined;
}
async function selectPopupOption(): Promise<void> {
  const option = popupOption.value;
  if (
    session.value === undefined ||
    option === undefined ||
    !sessionCanRespond.value
  )
    return;
  await session.value.submit({ action: "select", selectedOptionId: option.id });
}

/**
 * B popup is dual-purpose: the same route click that shows the select action
 * can convert into an anchored comment about that route, one gesture with
 * two explicit actions, no separate mode entry needed.
 */
function switchPopupToRevision(): void {
  const anchor = consultPopupAnchor.value;
  const option = popupOption.value;
  if (
    anchor === undefined ||
    option === undefined ||
    !sessionCanRespond.value
  )
    return;
  consultRevisionAnchor.value = {
    featureId: option.target.featureId,
    lat: anchor.lat,
    lng: anchor.lng,
  };
  consultRevisionPopup.value = { x: anchor.x, y: anchor.y };
  consultTentativeOptionId.value = option.id;
  consultPopupAnchor.value = undefined;
  consultRevisionMode.value = true;
}

/* ---------------- revision mode: anchored comment form ---------------- */
const revisionInstruction = ref(PATROL_ROUTE_REVISE_INSTRUCTION);
const revisionError = ref<string>();
const revisionInstructionInput = ref<HTMLTextAreaElement>();
const showRevisionPopup = computed(
  () =>
    session.value !== undefined &&
    sessionCanRespond.value &&
    consultRevisionMode.value &&
    consultRevisionPopup.value !== undefined &&
    consultRevisionAnchor.value !== undefined,
);
const revisionPopupStyle = computed(() => {
  const anchor = consultRevisionPopup.value;
  if (anchor === undefined) return {};
  return {
    left: `clamp(30px, ${Math.round(anchor.x)}px, calc(100% - 262px))`,
    top: `clamp(230px, ${Math.round(anchor.y)}px, 100%)`,
  };
});
const revisionAnchorLabel = computed(() => {
  const anchor = consultRevisionAnchor.value;
  if (anchor === undefined) return "";
  if (anchor.featureId !== undefined) {
    const option = session.value?.request.options.find(
      (candidate) => candidate.target.featureId === anchor.featureId,
    );
    if (option !== undefined) return option.label;
  }
  return "地图位置";
});
const revisionInstructionSupported = computed(
  () => revisionInstruction.value.trim() === PATROL_ROUTE_REVISE_INSTRUCTION,
);

watch(showRevisionPopup, async (visible) => {
  if (visible) {
    revisionInstruction.value = PATROL_ROUTE_REVISE_INSTRUCTION;
    revisionError.value = undefined;
    await nextTick();
    revisionInstructionInput.value?.focus();
  }
});

async function closeRevisionPopup(): Promise<void> {
  const featureId = tentativeOption.value?.target.featureId;
  consultRevisionPopup.value = undefined;
  consultRevisionAnchor.value = undefined;
  consultRevisionMode.value = false;
  await nextTick();
  if (featureId !== undefined) {
    document
      .querySelector<HTMLButtonElement>(
        `[data-testid="consult-route-badge-${featureId}"]`,
      )
      ?.focus();
  }
}

async function submitRevision(): Promise<void> {
  if (session.value === undefined || !sessionCanRespond.value) return;
  const selectedOption = tentativeOption.value;
  if (selectedOption === undefined) {
    revisionError.value = "请先选择要修改的候选路线。";
    return;
  }
  if (!revisionInstructionSupported.value) {
    revisionError.value =
      "当前确定性场景只支持示例中的固定修改要求。";
    return;
  }
  consultRevisionPopup.value = undefined;
  consultRevisionMode.value = false;
  await session.value.submit({
    action: "revise",
    instruction: PATROL_ROUTE_REVISE_INSTRUCTION,
    selectedOptionId: selectedOption.id,
  });
}
</script>

<template>
  <div class="consult-map-overlay" aria-hidden="false">
    <div
      v-if="showPill"
      class="consult-map-pill"
      :data-done="pillDone"
      data-testid="consult-map-pill"
      role="status"
    >
      {{ pillText }}
    </div>

    <section
      v-if="showDock"
      class="consult-dock"
      data-testid="consult-dock"
      aria-label="选择候选巡逻路线"
    >
      <div class="consult-dock-title">
        <h4>选择候选巡逻路线</h4>
        <span>
          {{
            tentativeOption === undefined
              ? "第 1 步: 先选择路线 A 或路线 B"
              : `第 2 步: 点击地图中的${tentativeOption.label}，然后提出修改`
          }}
        </span>
      </div>
      <div class="consult-dock-options">
        <button
          v-for="option in session?.request.options ?? []"
          :key="option.id"
          class="consult-dock-option"
          :data-tentative="consultTentativeOptionId === option.id"
          :data-testid="`dock-option-${option.id}`"
          :disabled="!sessionCanRespond"
          type="button"
          @click="pickOption(option.id)"
          @focus="hoverOption(option.id)"
          @mouseenter="hoverOption(option.id)"
        >
          <span class="consult-dock-check" aria-hidden="true">✓</span>
          <strong>{{ option.label }}</strong>
          <p>{{ option.summary }}</p>
        </button>
      </div>
      <div class="consult-dock-footer">
        <button
          class="link-button"
          data-testid="dock-cancel"
          :disabled="!sessionCanRespond"
          type="button"
          @click="cancelConsult"
        >
          取消选择
        </button>
        <p class="consult-dock-instruction" role="status">
          {{
            tentativeOption === undefined
              ? "选择后才能在地图上提出修改"
              : !sessionCanRespond
                ? "正在提交决定..."
                : `已暂定 ${tentativeOption.label}`
          }}
        </p>
        <span class="consult-dock-spacer"></span>
        <button
          class="primary-button"
          data-testid="dock-confirm"
          :disabled="tentativeOption === undefined || !sessionCanRespond"
          type="button"
          @click="confirmTentative"
        >
          {{
            tentativeOption === undefined
              ? "先选择一条路线"
              : `确认选择${tentativeOption.label}`
          }}
        </button>
      </div>
    </section>

    <section
      v-if="showPopup"
      class="consult-popup"
      data-testid="consult-popup"
      :style="popupStyle"
      aria-label="候选路线详情"
    >
      <header>
        <h4>{{ popupOption?.label }}</h4>
        <button
          class="consult-popup-close"
          data-testid="popup-close"
          title="关闭"
          type="button"
          @click="closePopup"
        >
          ×
        </button>
      </header>
      <p>{{ popupOption?.summary }}</p>
      <button
        class="primary-button consult-popup-select"
        data-testid="popup-select"
        type="button"
        @click="selectPopupOption"
      >
        选择{{ popupOption?.label }}
      </button>
      <button
        class="link-button consult-popup-revise"
        data-testid="popup-revise"
        type="button"
        @click="switchPopupToRevision"
      >
        提出修改
      </button>
    </section>

    <section
      v-if="showRevisionPopup"
      class="consult-popup consult-revision-popup"
      data-testid="consult-revision-popup"
      :style="revisionPopupStyle"
      aria-label="提出修改要求"
      aria-labelledby="consult-revision-title"
      aria-describedby="consult-revision-anchor"
      role="dialog"
      @keydown.esc.stop.prevent="closeRevisionPopup"
    >
      <header>
        <h4 id="consult-revision-title">提出修改</h4>
        <button
          class="consult-popup-close"
          data-testid="revision-popup-close"
          aria-label="取消修改"
          title="取消修改"
          type="button"
          @click="closeRevisionPopup"
        >
          ×
        </button>
      </header>
      <p
        id="consult-revision-anchor"
        class="consult-revision-anchor"
        data-testid="revision-anchor-label"
      >
        锚点: {{ revisionAnchorLabel }}
      </p>
      <label class="consult-revision-field">
        修改要求
        <textarea
          ref="revisionInstructionInput"
          v-model="revisionInstruction"
          data-testid="revision-instruction"
          rows="3"
        ></textarea>
      </label>
      <p
        v-if="!revisionInstructionSupported"
        class="consult-validation-error"
        role="alert"
      >
        当前确定性场景只支持示例中的固定修改要求。
      </p>
      <p v-if="revisionError" class="consult-validation-error" role="alert">
        {{ revisionError }}
      </p>
      <button
        class="primary-button consult-popup-select"
        data-testid="revision-submit"
        :disabled="!revisionInstructionSupported"
        type="button"
        @click="submitRevision"
      >
        提交修改要求
      </button>
    </section>
  </div>
</template>
