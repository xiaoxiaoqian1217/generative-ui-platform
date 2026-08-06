<script setup lang="ts">
// PROTOTYPE(issue-179)：六节点 Execution Map 与 Node Detail 原型挂载点。
// 三个变体对比同一组合成 TurnDetailsResponse 数据，经 ?variant=&scenario= 切换。
import { computed } from "vue";
import PrototypeSwitcher from "../PrototypeSwitcher.vue";
import ScenarioBar from "./ScenarioBar.vue";
import VariantAPipeline from "./VariantAPipeline.vue";
import VariantBSwimlane from "./VariantBSwimlane.vue";
import VariantCHybrid from "./VariantCHybrid.vue";
import { resolvePrototypeScenario } from "./model.js";

const VARIANT_NAMES: Record<string, string> = {
  A: "管道优先",
  B: "泳道时间线",
  C: "混合",
};
const VARIANTS = Object.keys(VARIANT_NAMES);

const params = new URLSearchParams(window.location.search);
const variant = computed(() => {
  const value = params.get("variant") ?? "A";
  return VARIANTS.includes(value) ? value : "A";
});
const scenario = computed(() => resolvePrototypeScenario(params.get("scenario") ?? undefined));

function syncUrl(nextVariant: string, nextScenario: string): void {
  const next = new URLSearchParams(window.location.search);
  next.set("variant", nextVariant);
  next.set("scenario", nextScenario);
  window.location.search = next.toString();
}
</script>

<template>
  <div class="prototype-execution-map">
    <p class="prototype-tag">PROTOTYPE · issue #179 · 六节点 Execution Map 与 Node Detail（合成数据，不连接真实写操作）</p>
    <ScenarioBar :current="scenario.id" @select="syncUrl(variant, $event)" />
    <p class="scenario-description">{{ scenario.description }}</p>

    <VariantAPipeline v-if="variant === 'A'" :scenario="scenario" />
    <VariantBSwimlane v-else-if="variant === 'B'" :scenario="scenario" />
    <VariantCHybrid v-else :scenario="scenario" />

    <PrototypeSwitcher
      :variants="VARIANTS"
      :names="VARIANT_NAMES"
      :current="variant"
      @change="syncUrl($event, scenario.id)"
    />
  </div>
</template>

<style scoped>
.prototype-execution-map {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: 72px;
}

.prototype-tag {
  margin: 0 0 10px;
  padding: 6px 10px;
  border: 1px dashed var(--amber);
  border-radius: 8px;
  color: var(--amber);
  background: color-mix(in srgb, var(--amber) 7%, white);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.scenario-description {
  margin: 0 0 12px;
  color: var(--muted);
  font-size: 0.8rem;
}
</style>
