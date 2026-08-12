<script setup lang="ts">
import type { ConversationTurn } from "../conversation/conversation-store.js";
import DiagnosticsPanel from "../diagnostics/DiagnosticsPanel.vue";
import A2UIRawViewer from "../renderer/A2UIRawViewer.vue";
import PresentationResultViewer from "../renderer/PresentationResultViewer.vue";

defineProps<{
  turn?: ConversationTurn | undefined;
}>();

const emit = defineEmits<{
  close: [];
}>();

function a2uiOperations(turn: ConversationTurn | undefined) {
  const presentation = turn?.presentation;
  if (
    presentation === undefined ||
    !("mode" in presentation) ||
    presentation.mode !== "generative-ui"
  )
    return undefined;
  return presentation.operations;
}
</script>

<template>
  <aside class="inspect-panel" data-testid="inspect-panel">
    <div class="inspect-panel-header">
      <div>
        <p class="eyebrow">TURN INSPECT</p>
        <h2>Presentation Trace</h2>
      </div>
      <button
        aria-label="关闭 Inspect"
        class="secondary-button"
        data-testid="inspect-close"
        type="button"
        @click="emit('close')"
      >
        ×
      </button>
    </div>

    <p v-if="turn === undefined" class="inspect-empty" data-testid="inspect-empty">
      未选择 Turn。
    </p>

    <div v-else class="inspect-body">
      <dl class="inspect-ids">
        <div>
          <dt>turnId</dt>
          <dd>{{ turn.turnId }}</dd>
        </div>
        <div>
          <dt>requestId</dt>
          <dd>{{ turn.requestId }}</dd>
        </div>
        <div v-if="turn.runId !== undefined">
          <dt>runId</dt>
          <dd>{{ turn.runId }}</dd>
        </div>
        <div v-if="turn.threadId !== undefined">
          <dt>threadId</dt>
          <dd>{{ turn.threadId }}</dd>
        </div>
        <div>
          <dt>status</dt>
          <dd>{{ turn.status }}</dd>
        </div>
        <div v-if="turn.presentationRequestId !== undefined">
          <dt>presentationRequestId</dt>
          <dd>{{ turn.presentationRequestId }}</dd>
        </div>
      </dl>

      <template v-if="turn.runtimeResult !== undefined">
        <PresentationResultViewer :result="turn.runtimeResult" />
        <A2UIRawViewer :operations="a2uiOperations(turn) ?? []" />
        <DiagnosticsPanel :result="turn.runtimeResult" />
      </template>
      <p v-else class="inspect-empty">该 Turn 尚无运行结果。</p>
    </div>
  </aside>
</template>
