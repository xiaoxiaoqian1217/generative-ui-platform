<script setup lang="ts">
/**
 * PROTOTYPE - throwaway. Host for the Scenario Lab UI variants.
 * Question: "Scenario Lab 三栏 IDE 骨架下,编辑 / 预览 / 评估哪个做主角最顺?"
 * Switch via ?variant=A|B|C on the existing /scenarios route, the bottom
 * bar, or the ← / → arrow keys.
 */
import { ref } from "vue";
import PrototypeSwitcher from "./PrototypeSwitcher.vue";
import VariantA from "./VariantA.vue";
import VariantB from "./VariantB.vue";
import VariantC from "./VariantC.vue";
import VariantD from "./VariantD.vue";
import "./prototype.css";

const variant = ref(
  new URLSearchParams(window.location.search).get("variant") ?? "A",
);

function navigate(next: string): void {
  variant.value = next;
  const url = new URL(window.location.href);
  url.searchParams.set("variant", next);
  window.history.pushState({}, "", url);
}
</script>

<template>
  <div class="scenario-lab-prototype">
    <VariantA v-if="variant === 'A'" />
    <VariantB v-else-if="variant === 'B'" />
    <VariantC v-else-if="variant === 'C'" />
    <VariantD v-else />
    <PrototypeSwitcher :current="variant" @navigate="navigate" />
  </div>
</template>

<style scoped>
.scenario-lab-prototype {
  height: 100%;
  min-height: 0;
}
</style>
