<script setup lang="ts">
import type { ConversationTurn } from "../conversation/conversation-store.js";
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
  <div class="shell-overlay" data-testid="inspect-panel" @click.self="emit('close')">
    <section class="shell-overlay-card">
      <header>
        <strong>Inspect / {{ turn?.turnId ?? "—" }}</strong>
        <button
          aria-label="关闭 Inspect"
          data-testid="inspect-close"
          type="button"
          @click="emit('close')"
        >
          ✕ 关闭
        </button>
      </header>

      <p v-if="turn === undefined" class="shell-inspect-empty" data-testid="inspect-empty">
        未选择 Turn。
      </p>

      <div v-else class="shell-inspect-body">
        <dl class="shell-inspect-ids">
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
        </dl>

        <template v-if="turn.runtimeResult !== undefined">
          <PresentationResultViewer :result="turn.runtimeResult" />
          <A2UIRawViewer
            v-if="a2uiOperations(turn) !== undefined"
            :operations="a2uiOperations(turn) ?? []"
          />
        </template>
        <p v-else class="shell-inspect-empty">该 Turn 尚无运行结果。</p>
      </div>
    </section>
  </div>
</template>
