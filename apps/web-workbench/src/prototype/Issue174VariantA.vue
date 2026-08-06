<script setup lang="ts">
import {
  prototypeConversations,
  prototypeStages,
  prototypeTurns,
} from "./issue-174-data.js";

defineProps<{ activeTurnId: string }>();
const emit = defineEmits<{ selectTurn: [turnId: string] }>();
</script>

<template>
  <div class="variant-a">
    <header class="a-header">
      <div><span class="mark">G</span><strong>Generative UI Workbench</strong></div>
      <nav><b>Conversations</b><span>Cases</span><span>Catalog</span><span>Scenarios</span></nav>
      <div class="runtime"><i></i> Runtime connected <button>Settings</button></div>
    </header>

    <main class="a-grid">
      <aside class="conversation-list">
        <div class="aside-heading"><div><small>DEBUG CONVERSATIONS</small><h1>会话</h1></div><button class="new">＋</button></div>
        <label class="search">⌕ <input placeholder="搜索会话" /></label>
        <button
          v-for="conversation in prototypeConversations"
          :key="conversation.id"
          class="conversation-item"
          :class="{ selected: conversation.id === 'conv-patrol-042' }"
        >
          <span class="conversation-icon">{{ conversation.title.slice(0, 1) }}</span>
          <span><strong>{{ conversation.title }}</strong><small>{{ conversation.turns }} Turns · {{ conversation.time }}</small></span>
          <i :data-state="conversation.status"></i>
        </button>
        <section class="utility-links">
          <small>WORKBENCH TOOLS</small>
          <button>▣ Cases <span>12</span></button>
          <button>◇ Catalog <span>24</span></button>
          <button>△ Scenarios <span>4</span></button>
        </section>
      </aside>

      <section class="chat-column">
        <header class="chat-heading">
          <div><small>ACTIVE CONVERSATION</small><h2>A 区巡防方案</h2><code>thread-patrol-042</code></div>
          <div><button>分享诊断</button><button>•••</button></div>
        </header>
        <div class="chat-scroll">
          <article
            v-for="turn in prototypeTurns"
            :key="turn.id"
            class="turn"
            :class="{ active: turn.id === activeTurnId }"
            @click="emit('selectTurn', turn.id)"
          >
            <div class="turn-meta"><b>T{{ turn.index }}</b><span :data-state="turn.status">{{ turn.status }}</span><button>Inspect ↗</button></div>
            <div class="user-message">{{ turn.userMessage }}</div>
            <div
              v-for="presentation in turn.presentations"
              :key="presentation.id"
              class="assistant-message"
              :data-kind="presentation.kind"
            >
              <div class="message-title"><span>✦</span><strong>{{ presentation.label }}</strong><small>{{ presentation.state }}</small></div>
              <p>{{ presentation.body }}</p>
              <div v-if="presentation.kind === 'surface'" class="surface-actions">
                <span>{{ presentation.id }}</span><button :disabled="presentation.state === 'historical'">取消</button><button :disabled="presentation.state === 'historical'">结构化确认</button>
              </div>
              <div v-else-if="presentation.kind === 'receipt'" class="progress"><i></i><span></span><small>Operation 正在执行</small></div>
            </div>
          </article>
        </div>
        <footer class="composer"><span>＋</span><input placeholder="向 Runtime Host 发送消息…" /><kbd>⌘ ↵</kbd></footer>
      </section>

      <aside class="inspector">
        <header><div><small>TURN INSPECTOR</small><h2>{{ activeTurnId.toUpperCase() }}</h2></div><button>×</button></header>
        <div class="tab-row"><b>Timeline</b><span>Artifacts</span><span>Raw</span></div>
        <section class="state-summary"><small>TURN STATE</small><strong>processing</strong><span>History persisted</span></section>
        <section><small>CORRELATION</small><dl><div><dt>operationId</dt><dd>op-c912</dd></div><div><dt>runId</dt><dd>run-991e</dd></div><div><dt>presentationId</dt><dd>pending</dd></div></dl></section>
        <section><small>STAGE TIMELINE</small><ol><li v-for="stage in prototypeStages" :key="stage.name"><i :data-state="stage.status"></i><span><strong>{{ stage.name }}</strong><small>{{ stage.status }}</small></span><code>{{ stage.duration }}</code></li></ol></section>
        <section class="boundary"><small>DISCLOSURE BOUNDARY</small><p>只展示公开契约数据。Provider 原始响应与私有 Checkpoint 不可见。</p></section>
      </aside>
    </main>
  </div>
</template>

<style scoped>
.variant-a { min-height: 100vh; color: #172322; background: #eef1ed; font-size: 13px; }
button, input { font: inherit; }
button { color: inherit; cursor: pointer; }
.a-header { display: grid; grid-template-columns: 290px 1fr auto; align-items: center; height: 64px; padding: 0 22px; color: #edf3ef; background: #182422; }
.a-header > div, .a-header nav, .runtime { display: flex; align-items: center; gap: 20px; }
.mark { display: grid; width: 30px; height: 30px; place-items: center; color: #172322; background: #e56640; font-family: Georgia, serif; font-size: 17px; }
.a-header nav { justify-content: center; height: 100%; color: #9caaa6; }
.a-header nav b { display: grid; height: 100%; place-items: center; color: white; border-bottom: 2px solid #e56640; }
.runtime { color: #b9c5c1; font-size: 11px; }
.runtime i { width: 7px; height: 7px; border-radius: 50%; background: #5bc48f; box-shadow: 0 0 0 4px rgb(91 196 143 / 12%); }
.runtime button, .chat-heading button { padding: 7px 10px; color: inherit; border: 1px solid rgb(255 255 255 / 14%); background: transparent; }
.a-grid { display: grid; grid-template-columns: 270px minmax(480px, 1fr) 330px; height: calc(100vh - 64px); }
.conversation-list, .inspector { overflow: auto; background: #f7f9f6; }
.conversation-list { padding: 20px 14px; border-right: 1px solid #d6ddd7; }
.aside-heading, .chat-heading, .inspector header, .message-title, .surface-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
small { color: #74817e; font-size: 9px; font-weight: 800; letter-spacing: .1em; }
h1, h2 { margin: 3px 0 0; letter-spacing: -.03em; }
h1 { font-size: 24px; font-family: Georgia, serif; font-weight: 500; }
h2 { font-size: 17px; }
.new { width: 32px; height: 32px; color: white; border: 0; background: #e15f38; font-size: 18px; }
.search { display: flex; gap: 8px; margin: 18px 0 12px; padding: 9px 10px; border: 1px solid #d6ddd7; background: white; }
.search input { width: 100%; border: 0; outline: 0; }
.conversation-item { display: grid; grid-template-columns: 35px 1fr 8px; align-items: center; width: 100%; gap: 10px; padding: 12px 9px; border: 0; border-left: 2px solid transparent; background: transparent; text-align: left; }
.conversation-item.selected { border-left-color: #e15f38; background: #edf0eb; }
.conversation-item > span:nth-child(2) { display: grid; gap: 4px; min-width: 0; }
.conversation-item strong { overflow: hidden; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.conversation-icon { display: grid; width: 34px; height: 34px; place-items: center; color: #53615e; border: 1px solid #cbd4cd; background: white; font-family: Georgia, serif; }
.conversation-item i { width: 6px; height: 6px; border-radius: 50%; background: #8b9693; }
.conversation-item i[data-state="active"] { background: #3aa477; }
.conversation-item i[data-state="failed"] { background: #c65140; }
.utility-links { display: grid; gap: 5px; margin-top: 24px; padding-top: 18px; border-top: 1px solid #d6ddd7; }
.utility-links > small { margin: 0 8px 6px; }
.utility-links button { display: flex; justify-content: space-between; padding: 8px; border: 0; background: transparent; text-align: left; }
.chat-column { display: grid; grid-template-rows: auto 1fr auto; overflow: hidden; background: #fbfcf9; }
.chat-heading { padding: 16px 24px; border-bottom: 1px solid #d6ddd7; }
.chat-heading > div:first-child { display: grid; grid-template-columns: auto auto; column-gap: 10px; align-items: end; }
.chat-heading small { grid-column: 1 / -1; }
.chat-heading code { color: #7d8986; font-size: 10px; }
.chat-heading > div:last-child { display: flex; gap: 7px; }
.chat-heading button { color: #33413f; border-color: #d1d8d2; background: white; }
.chat-scroll { overflow: auto; padding: 18px max(30px, 7vw) 80px; }
.turn { padding: 14px 0 24px; border-left: 2px solid transparent; }
.turn.active { border-left-color: #e7b19e; }
.turn-meta { display: flex; align-items: center; gap: 8px; margin: 0 0 9px 6px; }
.turn-meta b { display: grid; width: 26px; height: 20px; place-items: center; color: white; background: #33413f; font-size: 9px; }
.turn-meta span { padding: 3px 7px; color: #60706c; border-radius: 999px; background: #e7ece7; font-size: 9px; }
.turn-meta span[data-state="processing"] { color: #975426; background: #fff0df; }
.turn-meta button { margin-left: auto; color: #62706e; border: 0; background: transparent; font-size: 10px; }
.user-message { max-width: 76%; margin-left: auto; padding: 11px 14px; border-radius: 15px 3px 15px 15px; background: #253330; color: white; line-height: 1.5; }
.assistant-message { max-width: 88%; margin: 12px 0 0; padding: 14px 16px; border: 1px solid #d3dad4; border-radius: 3px 15px 15px 15px; background: white; box-shadow: 0 5px 18px rgb(32 48 43 / 5%); }
.assistant-message[data-kind="surface"] { border-left: 3px solid #e15f38; }
.assistant-message[data-kind="receipt"] { background: #fff8ec; border-color: #ead9bd; }
.assistant-message p { margin: 10px 0; line-height: 1.6; }
.message-title > span { color: #e15f38; }
.message-title strong { margin-right: auto; font-size: 11px; }
.message-title small { padding: 3px 6px; background: #edf0ed; }
.surface-actions { margin: 12px -16px -14px; padding: 10px 14px; border-top: 1px solid #e1e6e1; background: #fafbf8; }
.surface-actions span { margin-right: auto; color: #86908e; font-family: monospace; font-size: 9px; }
.surface-actions button { padding: 6px 9px; border: 1px solid #c9d1ca; background: white; font-size: 10px; }
.surface-actions button:last-child { color: white; border-color: #d95731; background: #d95731; }
.surface-actions button:disabled { color: #99a29f; border-color: #dce1dd; background: #edf0ed; }
.progress { display: grid; grid-template-columns: 8px 1fr auto; align-items: center; gap: 8px; }
.progress i { width: 7px; height: 7px; border-radius: 50%; background: #dd7b32; }
.progress span { height: 3px; overflow: hidden; background: linear-gradient(90deg, #e06a3f 42%, #e8ddd0 42%); }
.composer { display: flex; align-items: center; gap: 10px; margin: 0 24px 20px; padding: 12px 15px; border: 1px solid #cbd4cd; border-radius: 12px; background: white; box-shadow: 0 12px 30px rgb(32 48 43 / 9%); }
.composer input { width: 100%; border: 0; outline: 0; }
.composer kbd { color: #89928f; font-size: 9px; }
.inspector { padding: 18px; border-left: 1px solid #d6ddd7; }
.inspector header button { border: 0; background: transparent; font-size: 18px; }
.tab-row { display: grid; grid-template-columns: repeat(3, 1fr); margin: 18px 0; border-bottom: 1px solid #d5dcd6; text-align: center; }
.tab-row > * { padding: 9px; color: #7b8683; font-size: 10px; }
.tab-row b { color: #172322; border-bottom: 2px solid #e15f38; }
.inspector section { margin-bottom: 20px; }
.state-summary { display: grid; grid-template-columns: 1fr auto; gap: 8px; padding: 13px; background: #edf1ec; }
.state-summary small { grid-column: 1 / -1; }
.state-summary strong { color: #a45827; }
.state-summary span { color: #4f695e; font-size: 9px; }
dl { display: grid; gap: 7px; }
dl div { display: flex; justify-content: space-between; gap: 10px; }
dt { color: #75807d; font-size: 10px; }
dd { margin: 0; font-family: monospace; font-size: 10px; }
ol { padding: 0; list-style: none; }
li { display: grid; grid-template-columns: 10px 1fr auto; gap: 8px; padding: 10px 0; border-bottom: 1px solid #e0e5e1; }
li i { width: 7px; height: 7px; margin-top: 4px; border: 1px solid #74a991; border-radius: 50%; background: #64b28b; }
li i[data-state="running"] { border-color: #d58346; background: #e0995e; }
li i[data-state="queued"] { border-color: #aab3b0; background: transparent; }
li span { display: grid; gap: 3px; }
li strong, li code { font-size: 9px; }
.boundary { padding: 12px; border: 1px solid #d9d4c5; background: #fffaf0; }
.boundary p { margin: 7px 0 0; color: #6c6b61; font-size: 10px; line-height: 1.5; }
@media (max-width: 1050px) { .a-grid { grid-template-columns: 230px 1fr; } .inspector { display: none; } }
</style>
