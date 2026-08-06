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
  <div class="variant-b">
    <header class="command-bar">
      <div class="product"><span>G/UI</span><strong>Workbench</strong><small>development environment</small></div>
      <label>⌘ <input placeholder="搜索会话、Turn、Run 或 Artifact" /></label>
      <nav><button>Cases</button><button>Catalog</button><button>Scenarios</button><button>Settings</button></nav>
      <i></i>
    </header>

    <section class="conversation-strip">
      <div class="strip-title"><small>CONVERSATION INDEX</small><strong>4 / 128</strong></div>
      <button
        v-for="conversation in prototypeConversations"
        :key="conversation.id"
        :class="{ selected: conversation.id === 'conv-patrol-042' }"
      >
        <span>{{ conversation.status === 'active' ? '●' : conversation.status === 'failed' ? '×' : '✓' }}</span>
        <strong>{{ conversation.title }}</strong>
        <small>{{ conversation.turns }}T · {{ conversation.time }}</small>
      </button>
      <button class="create">＋ NEW</button>
    </section>

    <main>
      <header class="ledger-heading">
        <div><small>THREAD / CONV-PATROL-042</small><h1>A 区巡防方案</h1></div>
        <div class="summary"><span><small>Turns</small><b>03</b></span><span><small>Operations</small><b>04</b></span><span><small>Artifacts</small><b>11</b></span><button>Export bundle</button></div>
      </header>

      <section class="ledger">
        <div class="ledger-labels"><span>TURN</span><span>USER INTENT</span><span>OPERATIONS / RUNS</span><span>ASSISTANT PRESENTATIONS</span><span>STATE</span></div>
        <article
          v-for="turn in prototypeTurns"
          :key="turn.id"
          :class="{ active: turn.id === activeTurnId }"
          @click="emit('selectTurn', turn.id)"
        >
          <div class="turn-number"><strong>{{ String(turn.index).padStart(2, '0') }}</strong><small>{{ turn.id }}</small></div>
          <div class="intent"><p>{{ turn.userMessage }}</p><small>user · natural-language</small></div>
          <div class="operations">
            <div v-for="operation in turn.operations" :key="operation.id">
              <span :data-state="operation.outcome"></span>
              <p><strong>{{ operation.kind }}</strong><code>{{ operation.id }} → {{ operation.runId }}</code></p>
              <small>{{ operation.duration }}</small>
            </div>
          </div>
          <div class="presentations">
            <div v-for="presentation in turn.presentations" :key="presentation.id" :data-state="presentation.state">
              <b>{{ presentation.kind === 'receipt' ? '↻' : presentation.kind === 'surface' ? '▦' : '¶' }}</b>
              <p><strong>{{ presentation.label }}</strong><small>{{ presentation.id }} · {{ presentation.state }}</small></p>
              <button>Open</button>
            </div>
          </div>
          <div class="turn-state"><span :data-state="turn.status">{{ turn.status }}</span><button>Inspect</button></div>
        </article>
      </section>

      <section class="detail-drawer">
        <header><div><small>SELECTED TURN DETAIL</small><h2>{{ activeTurnId }} · Operation op-c912</h2></div><div class="tabs"><b>Timeline</b><span>Inputs / Outputs</span><span>Artifacts</span><span>Errors</span></div></header>
        <div class="drawer-grid">
          <section class="event-stream"><small>EVENT SEQUENCE</small><div v-for="(stage, index) in prototypeStages" :key="stage.name"><b>{{ 21 + index }}</b><i :data-state="stage.status"></i><span><strong>{{ stage.name }}</strong><small>{{ stage.status }}</small></span><code>{{ stage.duration }}</code></div></section>
          <section class="contract"><small>PUBLIC CONTRACT</small><div><span>RuntimeActionReceipt</span><b>accepted</b></div><div><span>OperationSnapshot</span><b>running</b></div><div><span>RuntimeActionResult</span><b>pending</b></div><p>三种投影共享 <code>operationId</code>，但分别进入提交反馈、诊断状态和对话结果。</p></section>
          <section class="artifact"><small>ARTIFACT PREVIEW</small><div class="json"><em>{</em><p><span>"operationId"</span>: "op-c912",</p><p><span>"phase"</span>: "running",</p><p><span>"historyPersistenceStatus"</span>: "persisted"</p><em>}</em></div></section>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.variant-b { min-height: 100vh; color: #dce6e2; background: #101716; font-family: "Cascadia Code", Consolas, monospace; font-size: 11px; }
button, input { font: inherit; }
button { color: inherit; cursor: pointer; }
.command-bar { display: grid; grid-template-columns: 260px minmax(280px, 1fr) auto 12px; align-items: center; gap: 20px; height: 58px; padding: 0 20px; border-bottom: 1px solid #2e3b38; background: #17201f; }
.product { display: flex; align-items: center; gap: 10px; }
.product span { padding: 7px; color: #101716; background: #e16a44; font-weight: 900; }
.product small { color: #62716d; }
.command-bar label { display: flex; gap: 10px; max-width: 620px; padding: 8px 12px; color: #74827e; border: 1px solid #34413f; background: #101716; }
.command-bar input { width: 100%; color: #dce6e2; border: 0; outline: 0; background: transparent; }
.command-bar nav { display: flex; gap: 4px; }
.command-bar nav button { padding: 8px 10px; border: 0; background: transparent; }
.command-bar > i { width: 8px; height: 8px; border-radius: 50%; background: #4fc08b; }
.conversation-strip { display: grid; grid-template-columns: 145px repeat(4, minmax(150px, 1fr)) 80px; height: 68px; border-bottom: 1px solid #2a3634; background: #131b1a; }
.strip-title, .conversation-strip button { display: grid; align-content: center; padding: 0 14px; border: 0; border-right: 1px solid #283432; background: transparent; text-align: left; }
.strip-title { gap: 3px; color: #75837f; }
.conversation-strip button { grid-template-columns: 14px 1fr; column-gap: 7px; overflow: hidden; }
.conversation-strip button strong { overflow: hidden; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.conversation-strip button small { grid-column: 2; color: #65736f; }
.conversation-strip button.selected { box-shadow: inset 0 -2px #e16a44; background: #1b2624; }
.conversation-strip button.selected > span { color: #55bf8d; }
.conversation-strip .create { display: block; padding: 0; color: #e88c70; text-align: center; }
main { padding: 22px 24px 90px; }
.ledger-heading { display: flex; align-items: end; justify-content: space-between; margin-bottom: 17px; }
small { color: #687772; font-size: 8px; letter-spacing: .08em; }
h1, h2 { margin: 4px 0 0; font-family: Inter, sans-serif; letter-spacing: -.03em; }
h1 { font-size: 24px; }
h2 { font-size: 14px; }
.summary { display: flex; align-items: stretch; gap: 1px; }
.summary span { display: grid; min-width: 70px; padding: 8px 12px; background: #192321; }
.summary b { margin-top: 3px; color: #f1f5f3; font-size: 15px; }
.summary button { padding: 0 14px; color: #161d1c; border: 0; background: #dce5e0; font-weight: 800; }
.ledger { border: 1px solid #303d3a; background: #141c1b; }
.ledger-labels, .ledger article { display: grid; grid-template-columns: 70px minmax(180px, 1.2fr) minmax(250px, 1.5fr) minmax(250px, 1.5fr) 105px; }
.ledger-labels { color: #697874; border-bottom: 1px solid #303d3a; background: #1a2422; font-size: 8px; font-weight: 800; letter-spacing: .08em; }
.ledger-labels span { padding: 9px 12px; border-right: 1px solid #303d3a; }
.ledger article { min-height: 92px; border-bottom: 1px solid #293532; cursor: pointer; }
.ledger article:last-child { border-bottom: 0; }
.ledger article.active { background: #1a2523; box-shadow: inset 3px 0 #e16a44; }
.ledger article > div { padding: 12px; border-right: 1px solid #293532; }
.turn-number { display: grid; align-content: center; text-align: center; }
.turn-number strong { color: #e16a44; font-size: 20px; }
.intent p { margin: 0 0 12px; color: #e4ebe8; font-family: Inter, sans-serif; line-height: 1.5; }
.operations, .presentations { display: grid; gap: 6px; }
.operations > div, .presentations > div { display: grid; grid-template-columns: 8px 1fr auto; align-items: center; gap: 7px; }
.operations > div > span { width: 6px; height: 6px; border: 1px solid #59b98d; border-radius: 50%; background: #59b98d; }
.operations > div > span[data-state="running"] { border-color: #e79a66; background: transparent; box-shadow: 0 0 0 3px rgb(231 154 102 / 10%); }
.operations p, .presentations p { display: grid; gap: 3px; margin: 0; }
.operations code { color: #788783; font-size: 8px; }
.operations > div > small { color: #9aa6a2; }
.presentations > div { padding: 6px 8px; border: 1px solid #30403c; background: #111817; }
.presentations > div[data-state="current"] { border-color: #8f573e; }
.presentations b { color: #e1805f; }
.presentations button { padding: 4px 6px; color: #95a19e; border: 1px solid #394844; background: transparent; font-size: 8px; }
.turn-state { display: grid; align-content: center; gap: 10px; }
.turn-state span { padding: 5px; color: #86bfa5; border: 1px solid #355c4a; text-align: center; font-size: 8px; }
.turn-state span[data-state="processing"] { color: #e9a77a; border-color: #704a36; }
.turn-state button { color: #9ca9a5; border: 0; background: transparent; font-size: 8px; }
.detail-drawer { margin-top: 18px; border: 1px solid #303d3a; background: #17201f; }
.detail-drawer header { display: flex; justify-content: space-between; padding: 13px 16px; border-bottom: 1px solid #303d3a; }
.tabs { display: flex; align-items: end; gap: 20px; color: #778681; }
.tabs b { color: #e7eeeb; }
.drawer-grid { display: grid; grid-template-columns: 1.2fr .9fr 1fr; }
.drawer-grid > section { min-height: 180px; padding: 16px; border-right: 1px solid #2c3936; }
.event-stream > div { display: grid; grid-template-columns: 24px 8px 1fr auto; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid #283431; }
.event-stream b { color: #5f6f6a; }
.event-stream i { width: 6px; height: 6px; border-radius: 50%; background: #4fb783; }
.event-stream i[data-state="running"] { background: #e6905b; }
.event-stream i[data-state="queued"] { border: 1px solid #64726e; background: transparent; }
.event-stream span { display: grid; }
.contract > div { display: flex; justify-content: space-between; margin-top: 8px; padding: 9px; background: #101817; }
.contract b { color: #db8c69; }
.contract p { color: #86938f; line-height: 1.6; }
.json { margin-top: 10px; padding: 12px; color: #b7c3bf; background: #0e1514; }
.json p { margin: 5px 0 5px 18px; }
.json span { color: #df8b6d; }
@media (max-width: 1100px) { .conversation-strip { grid-template-columns: 130px repeat(2, 1fr) 70px; } .conversation-strip button:nth-of-type(3), .conversation-strip button:nth-of-type(4) { display: none; } .ledger-labels, .ledger article { grid-template-columns: 60px 1fr 1.2fr 1.2fr; } .turn-state { display: none; } .drawer-grid { grid-template-columns: 1fr 1fr; } .artifact { display: none; } }
</style>
