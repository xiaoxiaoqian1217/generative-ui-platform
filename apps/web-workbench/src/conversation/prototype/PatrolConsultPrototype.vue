<script setup lang="ts">
// PROTOTYPE - throwaway: three consultation variants on /conversation via ?variant=consult-A|consult-B|consult-C.
import { computed, onBeforeUnmount, onMounted, ref, type Component } from "vue";
import type {
  PrototypeConsultDecision,
  PrototypeRouteId,
} from "./patrol-consult-prototype.js";
import PatrolConsultVariantA from "./PatrolConsultVariantA.vue";
import PatrolConsultVariantB from "./PatrolConsultVariantB.vue";
import PatrolConsultVariantC from "./PatrolConsultVariantC.vue";

type PatrolConsultVariant = "consult-A" | "consult-B" | "consult-C";

const variants = [
  {
    component: PatrolConsultVariantA,
    id: "consult-A",
    label: "A - 对话内征询卡",
    note: "决定留在消息流，地图作为预览反馈",
  },
  {
    component: PatrolConsultVariantB,
    id: "consult-B",
    label: "B - 地图上下文检查器",
    note: "Felt-inspired，地图是比较与决策主场",
  },
  {
    component: PatrolConsultVariantC,
    id: "consult-C",
    label: "C - 底部对比工作台",
    note: "逐项并排比较，再执行确认",
  },
] as const satisfies readonly {
  component: Component;
  id: PatrolConsultVariant;
  label: string;
  note: string;
}[];

function resolveVariant(value: string | null): PatrolConsultVariant {
  if (value === "consult-B" || value === "consult-C") return value;
  return "consult-A";
}

const currentVariant = ref<PatrolConsultVariant>(
  resolveVariant(new URLSearchParams(window.location.search).get("variant")),
);
const activeRouteId = ref<PrototypeRouteId>("route-a");
const hoveredRouteId = ref<PrototypeRouteId>();
const decision = ref<PrototypeConsultDecision>({ kind: "awaiting" });
const interactionMode = ref<"comment" | "compare">("compare");

const selectedVariant = computed(
  () =>
    variants.find((variant) => variant.id === currentVariant.value) ??
    variants[0],
);

function selectVariant(variantId: PatrolConsultVariant): void {
  currentVariant.value = variantId;
  interactionMode.value = "compare";
  const url = new URL(window.location.href);
  url.searchParams.set("variant", variantId);
  window.history.replaceState({}, "", url);
}

function cycleVariant(delta: number): void {
  const index = variants.findIndex(
    (variant) => variant.id === currentVariant.value,
  );
  const next = variants[(index + delta + variants.length) % variants.length];
  if (next !== undefined) selectVariant(next.id);
}

function preview(routeId: PrototypeRouteId): void {
  if (decision.value.kind !== "awaiting") return;
  activeRouteId.value = routeId;
}

function select(routeId: PrototypeRouteId): void {
  if (decision.value.kind !== "awaiting") return;
  activeRouteId.value = routeId;
  decision.value = { kind: "selected", routeId };
}

function revise(): void {
  if (decision.value.kind !== "awaiting") return;
  activeRouteId.value = "route-b";
  interactionMode.value = "compare";
  decision.value = { kind: "revision" };
}

function cancel(): void {
  if (decision.value.kind !== "awaiting") return;
  decision.value = { kind: "cancelled" };
}

function reset(): void {
  activeRouteId.value = "route-a";
  hoveredRouteId.value = undefined;
  interactionMode.value = "compare";
  decision.value = { kind: "awaiting" };
}

function onKeydown(event: KeyboardEvent): void {
  const target = event.target;
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  )
    return;
  if (event.key === "ArrowLeft") cycleVariant(-1);
  if (event.key === "ArrowRight") cycleVariant(1);
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <div class="patrol-consult-prototype">
    <component
      :is="selectedVariant.component"
      :active-route-id="activeRouteId"
      :decision="decision"
      :hovered-route-id="hoveredRouteId"
      @cancel="cancel"
      @hover="hoveredRouteId = $event"
      @mode="interactionMode = $event"
      @preview="preview"
      @reset="reset"
      @revise="revise"
      @select="select"
    />

    <aside class="prototype-state" aria-label="原型状态">
      <strong>PROTOTYPE STATE</strong>
      <span>variant <b>{{ currentVariant }}</b></span>
      <span>activePreview <b>{{ activeRouteId }}</b></span>
      <span>hovered <b>{{ hoveredRouteId ?? 'none' }}</b></span>
      <span>mode <b>{{ interactionMode }}</b></span>
      <span>decision <b>{{ decision.kind }}</b></span>
    </aside>

    <nav class="consult-prototype-switcher" aria-label="征询原型版本">
      <button type="button" aria-label="上一个方案" @click="cycleVariant(-1)">←</button>
      <div>
        <strong>{{ selectedVariant.label }}</strong>
        <span>{{ selectedVariant.note }}</span>
      </div>
      <button type="button" aria-label="下一个方案" @click="cycleVariant(1)">→</button>
      <a href="/conversation">退出原型</a>
    </nav>
  </div>
</template>

<style scoped>
.patrol-consult-prototype {
  position: relative;
  width: 100%;
  min-width: 0;
  height: 100%;
  min-height: 0;
  padding-bottom: 66px;
  overflow: hidden;
}

.prototype-state {
  position: fixed;
  bottom: 13px;
  left: 14px;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: calc(50vw - 250px);
  min-height: 40px;
  padding: 7px 10px;
  overflow-x: auto;
  border: 1px solid rgb(44 57 53 / 15%);
  border-radius: 10px;
  color: #69736f;
  background: rgb(255 255 255 / 94%);
  box-shadow: 0 8px 22px rgb(24 34 31 / 12%);
  font-family: ui-monospace, monospace;
  font-size: 8px;
  white-space: nowrap;
}

.prototype-state strong {
  color: #2e3b37;
  font-size: 8px;
  letter-spacing: 0.06em;
}

.prototype-state b {
  color: #2f6d5b;
}

.consult-prototype-switcher {
  position: fixed;
  right: 50%;
  bottom: 11px;
  z-index: 101;
  display: grid;
  grid-template-columns: auto minmax(210px, auto) auto auto;
  align-items: center;
  gap: 5px;
  max-width: calc(100vw - 28px);
  padding: 6px;
  border: 1px solid rgb(15 24 21 / 20%);
  border-radius: 14px;
  background: rgb(24 33 30 / 95%);
  box-shadow: 0 15px 38px rgb(17 25 22 / 28%);
  transform: translateX(50%);
  backdrop-filter: blur(12px);
}

.consult-prototype-switcher button {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 9px;
  color: #fff;
  background: #3d4b46;
  cursor: pointer;
  font-size: 15px;
}

.consult-prototype-switcher > div {
  display: grid;
  gap: 1px;
  padding: 0 8px;
}

.consult-prototype-switcher strong {
  color: #fff;
  font-size: 10px;
}

.consult-prototype-switcher span {
  color: #b9c2be;
  font-size: 8px;
}

.consult-prototype-switcher a {
  padding: 7px 9px;
  border-left: 1px solid #46534f;
  color: #c7cfcb;
  font-size: 9px;
  font-weight: 700;
  text-decoration: none;
}

@media (width <= 1040px) {
  .prototype-state {
    display: none;
  }
}
</style>
