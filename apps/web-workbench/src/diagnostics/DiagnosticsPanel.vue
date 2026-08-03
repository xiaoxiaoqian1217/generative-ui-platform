<script setup lang="ts">
import type { RuntimeRunResult } from "@generative-ui/runtime-contract";

defineProps<{ result: RuntimeRunResult }>();
</script>

<template>
  <section class="diagnostics-card" data-testid="diagnostics-panel">
    <div class="viewer-heading">
      <div>
        <p class="eyebrow">DIAGNOSTICS</p>
        <h3>安全诊断摘要</h3>
      </div>
      <span class="safe-badge">不展示原始业务载荷</span>
    </div>
    <dl class="correlation-grid">
      <div>
        <dt>requestId</dt>
        <dd>{{ result.requestId }}</dd>
      </div>
      <div>
        <dt>threadId</dt>
        <dd>{{ result.threadId }}</dd>
      </div>
      <div>
        <dt>runId</dt>
        <dd>{{ result.runId }}</dd>
      </div>
      <div>
        <dt>presentationRequestId</dt>
        <dd>{{ result.presentationRequestId ?? "—" }}</dd>
      </div>
      <div>
        <dt>agentId</dt>
        <dd>{{ result.diagnostics?.correlation?.agentId ?? "—" }}</dd>
      </div>
      <div>
        <dt>surfaceId</dt>
        <dd>{{ result.diagnostics?.correlation?.surfaceId ?? "—" }}</dd>
      </div>
      <div>
        <dt>actionId</dt>
        <dd>{{ result.diagnostics?.correlation?.actionId ?? "—" }}</dd>
      </div>
      <div>
        <dt>decision / UI Plan</dt>
        <dd>{{ result.diagnostics?.presentationDecisionMode ?? "—" }} / {{ result.diagnostics?.uiPlanValidationStatus ?? "—" }}</dd>
      </div>
      <div>
        <dt>degradation reason</dt>
        <dd>{{ result.diagnostics?.degradationReasonCode ?? "—" }}</dd>
      </div>
      <div>
        <dt>model / compiler latency</dt>
        <dd>{{ result.diagnostics?.modelLatencyMs ?? "—" }} / {{ result.diagnostics?.compilerLatencyMs ?? "—" }} ms</dd>
      </div>
    </dl>
    <div v-if="result.diagnostics?.stages.length" class="stages">
      <div v-for="stage in result.diagnostics.stages" :key="stage.name" class="stage-row">
        <span class="stage-name">{{ stage.name }}</span>
        <span class="stage-status" :data-status="stage.status">{{ stage.status }}</span>
        <span class="stage-duration">{{ stage.durationMs === undefined ? "—" : `${stage.durationMs} ms` }}</span>
        <code>{{ stage.errorCode ?? "" }}</code>
      </div>
    </div>
    <p v-else class="empty-inline">Runtime Host 未返回阶段诊断。</p>
  </section>
</template>
