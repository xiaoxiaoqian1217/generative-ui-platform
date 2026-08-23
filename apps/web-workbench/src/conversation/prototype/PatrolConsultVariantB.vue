<script setup lang="ts">
// PROTOTYPE - throwaway: Variant B uses direct map-anchored comments for revision input.
import { computed, nextTick, ref } from "vue";
import type {
  PrototypeCommentAnchor,
  PrototypeConsultDecision,
  PrototypeRouteId,
} from "./patrol-consult-prototype.js";
import {
  PROTOTYPE_REVISION_INSTRUCTION,
  PROTOTYPE_ROUTE_OPTIONS,
  prototypeDecisionLabel,
  prototypeRouteOption,
} from "./patrol-consult-prototype.js";
import PatrolConsultMap from "./PatrolConsultMap.vue";

const props = defineProps<{
  activeRouteId: PrototypeRouteId;
  decision: PrototypeConsultDecision;
  hoveredRouteId?: PrototypeRouteId | undefined;
}>();

const emit = defineEmits<{
  cancel: [];
  hover: [routeId: PrototypeRouteId | undefined];
  mode: [mode: "comment" | "compare"];
  preview: [routeId: PrototypeRouteId];
  reset: [];
  revise: [];
  select: [routeId: PrototypeRouteId];
}>();

const activeRoute = computed(() => prototypeRouteOption(props.activeRouteId));
const commentAnchor = ref<PrototypeCommentAnchor>();
const commentComposer = ref<HTMLTextAreaElement>();
const commentInstruction = ref(PROTOTYPE_REVISION_INSTRUCTION);
const commentOpen = ref(false);
const commentInstructionSupported = computed(
  () => commentInstruction.value.trim() === PROTOTYPE_REVISION_INSTRUCTION,
);

function openCoordinateComment(anchor: PrototypeCommentAnchor): void {
  if (props.decision.kind !== "awaiting") return;
  commentAnchor.value = anchor;
  commentInstruction.value = PROTOTYPE_REVISION_INSTRUCTION;
  commentOpen.value = true;
  emit("mode", "comment");
  void nextTick(() => commentComposer.value?.focus());
}

function closeCoordinateComment(): void {
  commentOpen.value = false;
  commentAnchor.value = undefined;
  emit("mode", "compare");
}

function submitCoordinateComment(): void {
  if (
    commentAnchor.value !== "under-bridge" ||
    !commentInstructionSupported.value
  )
    return;
  commentOpen.value = false;
  emit("mode", "compare");
  emit("revise");
}
</script>

<template>
  <div class="variant-b">
    <aside class="b-thread-rail">
      <header>
        <div class="thread-brand">A</div>
        <div>
          <span>当前会话</span>
          <strong>北侧通道巡逻</strong>
        </div>
      </header>

      <div class="thread-content">
        <div class="thread-user">帮我想想怎么巡逻北侧通道。</div>
        <div class="thread-agent">
          <i></i>
          <p>候选路线已放到地图上。点击路线直接比较，决定仍需你确认。</p>
        </div>
        <div
          class="thread-handoff"
          :data-resolved="decision.kind !== 'awaiting'"
          :data-comment="commentOpen"
        >
          <span>
            {{ commentOpen ? '正在添加地图评论' : decision.kind === 'awaiting' ? '等待你的决定' : '答复已记录' }}
          </span>
          <strong>
            {{ commentOpen ? '桥下区域已关联修改要求' : prototypeDecisionLabel(decision) }}
          </strong>
          <small>{{ commentOpen ? '评论输入框就在地图坐标旁' : '地图是当前征询的主操作区' }}</small>
        </div>
      </div>

      <footer>
        <span>Agent Source</span>
        <strong>AGUIMock</strong>
      </footer>
    </aside>

    <main class="b-map-stage">
      <header class="b-map-header">
        <div>
          <span>北侧通道 / 巡逻方案征询</span>
          <strong>{{ commentOpen ? '在地图坐标旁描述修改要求' : '在地图上比较候选路线' }}</strong>
        </div>
        <div class="map-mode" :data-comment="commentOpen">
          <i></i>
          {{ commentOpen ? '地图评论 - 桥下区域' : '点击观察点可提出修改' }}
        </div>
      </header>

      <div class="b-map-body">
        <div class="b-map-canvas">
          <PatrolConsultMap
            :active-route-id="activeRouteId"
            :commentable="decision.kind === 'awaiting'"
            :hovered-route-id="hoveredRouteId"
            :interactive="decision.kind === 'awaiting' && !commentOpen"
            @comment="openCoordinateComment"
            @hover="emit('hover', $event)"
            @preview="emit('preview', $event)"
          />

          <nav class="route-quick-switch" aria-label="候选路线">
            <button
              v-for="option in PROTOTYPE_ROUTE_OPTIONS"
              :key="option.id"
              :data-active="activeRouteId === option.id"
              :disabled="decision.kind !== 'awaiting' || commentOpen"
              type="button"
              @click="emit('preview', option.id)"
              @mouseenter="emit('hover', option.id)"
              @mouseleave="emit('hover', undefined)"
            >
              <i :data-route="option.id"></i>
              <span>{{ option.label }}</span>
              <b>{{ option.distance }}</b>
            </button>
          </nav>

          <form
            v-if="commentOpen"
            class="coordinate-comment-popover"
            aria-label="桥下区域修改评论"
            @submit.prevent="submitCoordinateComment"
          >
            <header>
              <span class="coordinate-comment-icon">▣</span>
              <div>
                <small>桥下区域</small>
                <strong>告诉 AI 这里需要怎么修改</strong>
              </div>
              <button type="button" aria-label="关闭评论" @click="closeCoordinateComment">×</button>
            </header>

            <textarea
              ref="commentComposer"
              v-model="commentInstruction"
              aria-label="修改评论"
              rows="3"
            ></textarea>

            <p v-if="!commentInstructionSupported" class="coordinate-comment-constraint" role="status">
              当前 fixture 只支持“{{ PROTOTYPE_REVISION_INSTRUCTION }}”。
            </p>
            <p v-else class="coordinate-comment-note">
              将携带桥下区域坐标和当前参考路线发送给 AI。
            </p>

            <footer>
              <button type="button" @click="closeCoordinateComment">取消</button>
              <button
                class="coordinate-comment-submit"
                :disabled="!commentInstructionSupported"
                type="submit"
              >
                发送给 AI
              </button>
            </footer>
          </form>
        </div>

        <section class="map-inspector">
          <header>
            <div>
              <span>当前预览</span>
              <h2>{{ activeRoute.label }}</h2>
            </div>
            <b :data-route="activeRoute.id">{{ activeRoute.id === 'route-a' ? 'A' : 'B' }}</b>
          </header>

          <p>{{ activeRoute.summary }}</p>

          <dl>
            <div>
              <dt>主要经过</dt>
              <dd>{{ activeRoute.via }}</dd>
            </div>
            <div>
              <dt>相对距离</dt>
              <dd>{{ activeRoute.distance }}</dd>
            </div>
            <div>
              <dt>东侧覆盖</dt>
              <dd>{{ activeRoute.coverage }}</dd>
            </div>
          </dl>

          <template v-if="decision.kind === 'awaiting'">
            <p class="inspector-comment-hint">
              <i>+</i>
              直接点击地图观察点，可在坐标旁输入修改评论。
            </p>
            <button
              class="inspector-primary"
              type="button"
              @click="emit('select', activeRouteId)"
            >
              选择{{ activeRoute.label }}
            </button>
            <button class="inspector-cancel" type="button" @click="emit('cancel')">
              取消本次征询
            </button>
          </template>
          <div v-else class="inspector-result">
            <span>征询结果</span>
            <strong>{{ prototypeDecisionLabel(decision) }}</strong>
            <button type="button" @click="emit('reset')">重新体验</button>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.variant-b {
  display: grid;
  grid-template-columns: 270px minmax(0, 1fr);
  width: 100%;
  height: 100%;
  min-height: 0;
  color: #22312c;
  background: #e9eee8;
}

.b-thread-rail {
  position: relative;
  z-index: 4;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  min-height: 0;
  border-right: 1px solid #dce2de;
  background: #fff;
  box-shadow: 8px 0 26px rgb(38 52 47 / 7%);
}

.b-thread-rail > header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px;
  border-bottom: 1px solid #e7eae8;
}

.thread-brand {
  display: grid;
  width: 33px;
  height: 33px;
  place-items: center;
  border-radius: 10px;
  color: #fff;
  background: #2e6959;
  font-size: 12px;
  font-weight: 850;
}

.b-thread-rail > header > div:last-child {
  display: grid;
  gap: 2px;
}

.b-thread-rail > header span,
.b-thread-rail > footer span {
  color: #8a9490;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.05em;
}

.b-thread-rail > header strong,
.b-thread-rail > footer strong {
  font-size: 12px;
}

.thread-content {
  padding: 18px 14px;
  overflow-y: auto;
}

.thread-user {
  margin-left: 32px;
  padding: 9px 11px;
  border-radius: 12px 12px 3px;
  color: #fff;
  background: #3451d1;
  font-size: 11px;
  line-height: 1.45;
}

.thread-agent {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 18px 0;
}

.thread-agent i {
  width: 7px;
  height: 7px;
  flex: 0 0 auto;
  margin-top: 5px;
  border-radius: 50%;
  background: #2e6959;
  box-shadow: 0 0 0 4px #e3efeb;
}

.thread-agent p {
  margin: 0;
  color: #66736e;
  font-size: 11px;
  line-height: 1.55;
}

.thread-handoff {
  display: grid;
  gap: 5px;
  padding: 13px;
  border: 1px solid #b9d1c9;
  border-radius: 12px;
  background: #edf6f2;
}

.thread-handoff[data-resolved="true"] {
  border-color: #cfdbd7;
  background: #f6f8f7;
}

.thread-handoff[data-comment="true"] {
  border-color: #e1b794;
  background: #fff7f0;
}

.thread-handoff[data-comment="true"] span {
  color: #a65d2f;
}

.thread-handoff span {
  color: #2f6d5b;
  font-size: 9px;
  font-weight: 850;
  letter-spacing: 0.04em;
}

.thread-handoff strong {
  font-size: 12px;
  line-height: 1.4;
}

.thread-handoff small {
  color: #7b8682;
  font-size: 9px;
}

.b-thread-rail > footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 15px;
  border-top: 1px solid #e7eae8;
}

.b-map-stage {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
}

.b-map-header {
  display: flex;
  min-height: 64px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 19px;
  border-bottom: 1px solid #d9e0dc;
  background: rgb(255 255 255 / 96%);
}

.b-map-header > div:first-child {
  display: grid;
  gap: 2px;
}

.b-map-header span {
  color: #7b8682;
  font-size: 9px;
}

.b-map-header strong {
  font-size: 14px;
}

.map-mode {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 9px;
  border-radius: 8px;
  color: #4d5c56;
  background: #f0f3f1;
  font-size: 10px;
  font-weight: 650;
}

.map-mode i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2e705d;
  box-shadow: 0 0 0 3px #d6e8e2;
}

.map-mode[data-comment="true"] {
  color: #8f4d27;
  background: #fff0e5;
}

.map-mode[data-comment="true"] i {
  background: #cf6d37;
  box-shadow: 0 0 0 3px #f2d9c9;
}

.b-map-body {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  min-height: 0;
  overflow: hidden;
}

.b-map-canvas {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.route-quick-switch {
  position: absolute;
  top: 18px;
  left: 66px;
  z-index: 5;
  display: flex;
  gap: 7px;
}

.route-quick-switch button {
  display: grid;
  grid-template-columns: auto auto auto;
  align-items: center;
  gap: 7px;
  min-height: 34px;
  padding: 0 10px;
  border: 1px solid rgb(42 58 52 / 16%);
  border-radius: 9px;
  color: #45514d;
  background: rgb(255 255 255 / 93%);
  box-shadow: 0 5px 16px rgb(35 48 43 / 10%);
  cursor: pointer;
  font-size: 10px;
}

.route-quick-switch button[data-active="true"] {
  border-color: #4c776a;
  color: #243a33;
  box-shadow: 0 0 0 3px rgb(46 105 89 / 11%);
}

.route-quick-switch button:disabled {
  cursor: default;
  opacity: 0.58;
}

.route-quick-switch i {
  width: 13px;
  height: 4px;
  border-radius: 4px;
  background: #3767ca;
}

.route-quick-switch i[data-route="route-b"] {
  background: #cb6d35;
}

.route-quick-switch b {
  color: #818b87;
  font-size: 9px;
}

.coordinate-comment-popover {
  position: absolute;
  top: 67%;
  left: 46%;
  z-index: 7;
  display: grid;
  gap: 10px;
  width: min(286px, calc(100% - 28px));
  padding: 12px;
  border: 1px solid rgb(83 55 39 / 20%);
  border-radius: 12px;
  color: #283832;
  background: rgb(255 255 255 / 97%);
  box-shadow: 0 16px 38px rgb(35 46 42 / 20%);
  transform: translate(30px, -50%);
  backdrop-filter: blur(10px);
}

.coordinate-comment-popover::before {
  position: absolute;
  top: calc(50% - 7px);
  left: -8px;
  width: 14px;
  height: 14px;
  border-bottom: 1px solid rgb(83 55 39 / 20%);
  border-left: 1px solid rgb(83 55 39 / 20%);
  background: #fff;
  content: "";
  transform: rotate(45deg);
}

.coordinate-comment-popover > header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.coordinate-comment-icon {
  display: grid;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 8px;
  color: #fff;
  background: #cf6d37;
  font-size: 10px;
  font-weight: 850;
}

.coordinate-comment-popover > header > div {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.coordinate-comment-popover > header small {
  color: #98725c;
  font-size: 8px;
  font-weight: 750;
}

.coordinate-comment-popover > header strong {
  font-size: 10px;
}

.coordinate-comment-popover > header button {
  display: grid;
  width: 26px;
  height: 26px;
  flex: 0 0 auto;
  margin-left: auto;
  place-items: center;
  padding: 0;
  border: 1px solid #d7ddda;
  border-radius: 7px;
  color: #68736e;
  background: #fff;
  cursor: pointer;
  font-size: 15px;
}

.coordinate-comment-popover textarea {
  width: 100%;
  min-height: 72px;
  resize: vertical;
  padding: 8px 9px;
  border: 1px solid #cbd4d0;
  border-radius: 8px;
  color: #2d3b36;
  background: #fff;
  font-size: 10px;
  line-height: 1.5;
}

.coordinate-comment-note,
.coordinate-comment-constraint {
  margin: -3px 0 0;
  font-size: 8px;
  line-height: 1.45;
}

.coordinate-comment-note {
  color: #71807a;
}

.coordinate-comment-constraint {
  color: #a14236;
}

.coordinate-comment-popover > footer {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.coordinate-comment-popover > footer button {
  min-height: 30px;
  padding: 0 10px;
  border: 1px solid #ced6d2;
  border-radius: 7px;
  color: #34443e;
  background: #fff;
  cursor: pointer;
  font-size: 9px;
  font-weight: 750;
}

.coordinate-comment-popover > footer .coordinate-comment-submit {
  border-color: #3451d1;
  color: #fff;
  background: #3451d1;
}

.coordinate-comment-popover > footer button:disabled {
  cursor: default;
  opacity: 0.42;
}

.map-inspector {
  position: relative;
  z-index: 5;
  display: grid;
  align-content: start;
  gap: 13px;
  min-width: 0;
  padding: 20px 18px;
  border-left: 1px solid rgb(31 52 45 / 14%);
  background: rgb(255 255 255 / 97%);
  box-shadow: -12px 0 30px rgb(27 43 37 / 10%);
}

.map-inspector > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.map-inspector > header span,
.inspector-result span {
  color: #78847f;
  font-size: 9px;
  font-weight: 850;
  letter-spacing: 0.07em;
}

.map-inspector h2 {
  margin: 3px 0 0;
  font-size: 19px;
}

.map-inspector > header b {
  display: grid;
  width: 35px;
  height: 35px;
  place-items: center;
  border-radius: 50%;
  color: #3767ca;
  border: 3px solid currentColor;
  font-size: 13px;
}

.map-inspector > header b[data-route="route-b"] {
  color: #cb6d35;
}

.map-inspector > p {
  margin: 0;
  color: #65716c;
  font-size: 11px;
  line-height: 1.55;
}

.map-inspector dl {
  display: grid;
  margin: 0;
  border-top: 1px solid #e5e9e7;
}

.map-inspector dl div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #e5e9e7;
}

.map-inspector dt {
  color: #7b8581;
  font-size: 10px;
}

.map-inspector dd {
  margin: 0;
  font-size: 10px;
  font-weight: 750;
}

.inspector-comment-hint {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 10px;
  border: 1px solid #ead6c7;
  border-radius: 9px;
  color: #75513c !important;
  background: #fff9f4;
  font-size: 9px;
  line-height: 1.5;
}

.inspector-comment-hint i {
  display: grid;
  width: 19px;
  height: 19px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  background: #cf6d37;
  font-style: normal;
  font-weight: 850;
}

.map-inspector button {
  min-height: 34px;
  padding: 0 11px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 10px;
  font-weight: 750;
}

.inspector-primary {
  border: 1px solid #3451d1;
  color: #fff;
  background: #3451d1;
}

.inspector-cancel,
.inspector-result button {
  border: 1px solid #ced6d2;
  color: #34443e;
  background: #fff;
}

.inspector-cancel {
  min-height: 26px !important;
  border: 0 !important;
  color: #77817d !important;
  background: transparent !important;
}

.inspector-result {
  display: grid;
  gap: 8px;
  padding: 11px;
  border-radius: 10px;
  background: #edf5f2;
}

.inspector-result strong {
  font-size: 11px;
}

@media (width <= 1100px) {
  .variant-b {
    grid-template-columns: 210px minmax(0, 1fr);
  }

  .b-map-body {
    grid-template-columns: minmax(0, 1fr) 280px;
  }

  .coordinate-comment-popover {
    right: 12px;
    left: auto;
    transform: translateY(-50%);
  }

  .coordinate-comment-popover::before {
    display: none;
  }
}

@media (width <= 900px) {
  .variant-b {
    grid-template-columns: 175px minmax(0, 1fr);
  }

  .b-map-body {
    grid-template-columns: minmax(0, 1fr) 260px;
  }
}
</style>
