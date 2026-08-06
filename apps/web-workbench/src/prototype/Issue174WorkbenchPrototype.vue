<script setup lang="ts">
// Three variants of the Workbench conversation and diagnostics information architecture,
// switchable via ?variant=, on the existing /playground route.
import { computed, ref } from "vue";
import Issue174VariantA from "./Issue174VariantA.vue";
import Issue174VariantB from "./Issue174VariantB.vue";
import Issue174VariantC from "./Issue174VariantC.vue";
import PrototypeSwitcher from "./PrototypeSwitcher.vue";

const variants = [
  { key: "A", name: "对话优先三栏" },
  { key: "B", name: "Turn 账本" },
  { key: "C", name: "调查分屏" },
] as const;
type VariantKey = (typeof variants)[number]["key"];

function variantFromUrl(): VariantKey {
  const candidate = new URLSearchParams(window.location.search).get("variant");
  return variants.some((item) => item.key === candidate)
    ? (candidate as VariantKey)
    : "A";
}

const variant = ref<VariantKey>(variantFromUrl());
const activeTurnId = ref("turn-03");
const isDevelopment = import.meta.env.DEV;
const currentComponent = computed(() => ({
  A: Issue174VariantA,
  B: Issue174VariantB,
  C: Issue174VariantC,
})[variant.value]);

function selectVariant(key: string): void {
  if (!variants.some((item) => item.key === key)) return;
  variant.value = key as VariantKey;
  const url = new URL(window.location.href);
  url.searchParams.set("variant", variant.value);
  window.history.replaceState({}, "", url);
}
</script>

<template>
  <component
    :is="currentComponent"
    :active-turn-id="activeTurnId"
    @select-turn="activeTurnId = $event"
  />
  <PrototypeSwitcher
    v-if="isDevelopment"
    :current="variant"
    :variants="variants"
    @select="selectVariant"
  />
</template>
