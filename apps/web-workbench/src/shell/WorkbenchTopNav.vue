<script setup lang="ts">
import {
  workbenchRouteLabel,
  WORKBENCH_ROUTES,
  type WorkbenchRoute,
} from "../app/routes.js";
import type { ConnectionState } from "../agent/business-agent-client.js";

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
  <header class="shell-topbar">
    <strong class="shell-topbar-brand">Workbench</strong>
    <nav class="shell-topbar-nav" aria-label="工具">
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
    <span
      class="shell-topbar-status"
      :data-state="connectionState"
      data-testid="agent-connection-status"
    >
      ENV {{ environment }} · {{ connectionLabel }}
    </span>
  </header>
</template>
