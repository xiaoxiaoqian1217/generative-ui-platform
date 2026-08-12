<script setup lang="ts">
import {
  workbenchRouteLabel,
  WORKBENCH_ROUTES,
  type WorkbenchRoute,
} from "../app/routes.js";
import type { ConnectionState } from "../runtime/types.js";

defineProps<{
  connectionLabel: string;
  connectionState: ConnectionState;
  environment: string;
  route: WorkbenchRoute;
  version: string;
}>();

const emit = defineEmits<{
  navigate: [route: WorkbenchRoute];
}>();

function navigate(event: MouseEvent, route: WorkbenchRoute): void {
  event.preventDefault();
  emit("navigate", route);
}
</script>

<template>
  <header class="topnav">
    <div class="topnav-brand">
      <div class="brand-mark" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
      <div class="topnav-title">
        <p class="eyebrow">GENERATIVE UI PLATFORM</p>
        <h1>Workbench</h1>
      </div>
    </div>

    <nav class="topnav-nav" aria-label="Workbench">
      <a
        v-for="item in WORKBENCH_ROUTES"
        :key="item"
        :class="{ active: route === item }"
        :href="item"
        @click="navigate($event, item)"
      >
        {{ workbenchRouteLabel(item) }}
      </a>
    </nav>

    <div class="topnav-status">
      <div class="banner" data-testid="environment-banner">
        <span class="banner-label">ENV</span>
        <strong>{{ environment }}</strong>
        <span class="banner-divider"></span>
        <span class="banner-label">VERSION</span>
        <strong>v{{ version }}</strong>
      </div>
      <div
        class="agent-status"
        :data-state="connectionState"
        data-testid="agent-connection-status"
      >
        <span class="status-dot" :data-state="connectionState"></span>
        <span class="agent-status-label">{{ connectionLabel }}</span>
      </div>
    </div>
  </header>
</template>
