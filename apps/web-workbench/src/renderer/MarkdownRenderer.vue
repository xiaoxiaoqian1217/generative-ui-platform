<script setup lang="ts">
import { computed } from "vue";
import { renderSafeMarkdown } from "./markdown.js";

const props = defineProps<{ markdown: string }>();
const rendered = computed(() => renderSafeMarkdown(props.markdown));
</script>

<template>
  <article class="markdown-content" data-testid="markdown-result" v-html="rendered"></article>
</template>
