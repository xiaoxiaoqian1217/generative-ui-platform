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
  <div class="variant-c">
    <aside class="c-sidebar">
      <div class="c-logo">G<span>UI</span></div>
      <nav><button class="active" title="Conversations">◉</button><button title="Cases">▣</button><button title="Catalog">◇</button><button title="Scenarios">△</button></nav>
      <div class="sidebar-bottom"><button title="Settings">⚙</button><i></i></div>
    </aside>

    <main>
      <header class="c-header">
        <div><small>INVESTIGATION DESK</small><h1>A 区巡防方案</h1></div>
        <div class="breadcrumb"><span>Conversation</span><b>›</b><span>{{ activeTurnId }}</span><b>›</b><strong>op-c912</strong></div>
        <div class="header-actions"><span><i></i> LIVE</span><button>Export</button><button>•••</button></div>
      </header>

      <section class="workspace-c">
        <aside class="case-rail">
          <header><small>CONVERSATIONS</small><button>＋</button></header>
          <label><span>⌕</span><input placeholder="Filter" /></label>
          <button
            v-for="conversation in prototypeConversations"
            :key="conversation.id"
            :class="{ selected: conversation.id === 'conv-patrol-042' }"
          >
            <span :data-state="conversation.status"></span>
            <p><strong>{{ conversation.title }}</strong><small>{{ conversation.time }} · {{ conversation.turns }} turns</small></p>
          </button>
          <section class="saved-views"><small>SAVED VIEWS</small><button>正在运行 <b>3</b></button><button>失败与降级 <b>7</b></button><button>等待 Action <b>2</b></button></section>
        </aside>

        <section class="investigation-canvas">
          <div class="canvas-toolbar"><div><button class="active">Conversation</button><button>State graph</button></div><div><span>显示历史 Presentation</span><b>ON</b></div></div>
          <div class="transcript">
            <article v-for="turn in prototypeTurns" :key="turn.id" :class="{ active: turn.id === activeTurnId }" @click="emit('selectTurn', turn.id)">
              <header><span>T{{ turn.index }}</span><strong>{{ turn.status }}</strong><small>{{ turn.operations.length }} operation{{ turn.operations.length > 1 ? 's' : '' }}</small><button>Focus</button></header>
              <div class="turn-flow">
                <div class="avatar user">U</div><p class="user-copy">{{ turn.userMessage }}</p>
                <template v-for="presentation in turn.presentations" :key="presentation.id">
                  <div class="avatar assistant">G</div>
                  <section class="presentation" :data-state="presentation.state" :data-kind="presentation.kind">
                    <header><strong>{{ presentation.label }}</strong><span>{{ presentation.id }}</span></header>
                    <p>{{ presentation.body }}</p>
                    <footer v-if="presentation.kind === 'surface'"><span>{{ presentation.state === 'current' ? 'CURRENT · ACTIONABLE' : 'HISTORICAL · READ ONLY' }}</span><button :disabled="presentation.state === 'historical'">Review action</button></footer>
                    <footer v-else-if="presentation.kind === 'receipt'"><span>RECEIPT · ACCEPTED</span><div class="pulse"><i></i><i></i><i></i></div></footer>
                  </section>
                </template>
              </div>
            </article>
          </div>
          <footer class="c-composer"><button>＋</button><input placeholder="继续这个 Debug Conversation…" /><span>Runtime Host</span><button class="send">↑</button></footer>
        </section>

        <aside class="evidence-panel">
          <header><small>OPERATION EVIDENCE</small><h2>op-c912</h2><span>running</span></header>
          <div class="evidence-tabs"><b>Trace</b><span>Artifacts</span><span>Contract</span></div>
          <section class="identity"><small>IDENTITY CHAIN</small><div class="chain"><span>turn-03</span><i>→</i><span>op-c912</span><i>→</i><span>run-991e</span></div><p>sourcePresentation <code>pres-103</code></p></section>
          <section class="graph"><small>RUNTIME PATH</small><div class="node completed">Runtime Host <b>12ms</b></div><i></i><div class="node completed">Agent Adapter <b>34ms</b></div><i></i><div class="node running">Business Agent <b>812ms</b></div><i></i><div class="node queued">Presentation <b>queued</b></div></section>
          <section class="event-log"><small>EVENTS</small><div v-for="(stage, index) in prototypeStages" :key="stage.name"><b>{{ 21 + index }}</b><span>{{ stage.name }}</span><code>{{ stage.duration }}</code></div></section>
          <section class="persistence"><div><span>History persistence</span><b>persisted</b></div><div><span>Sequence continuity</span><b>complete</b></div><p>公开诊断与实时 Conversation 使用相同平台事件事实。</p></section>
        </aside>
      </section>
    </main>
  </div>
</template>

<style scoped>
.variant-c { display: grid; grid-template-columns: 58px 1fr; min-height: 100vh; color: #26302e; background: #e7ebe7; font-family: Inter, sans-serif; font-size: 12px; }
button, input { font: inherit; }
button { color: inherit; cursor: pointer; }
.c-sidebar { display: flex; z-index: 2; flex-direction: column; align-items: center; min-height: 100vh; color: #dfe8e4; background: #1a2422; }
.c-logo { display: grid; width: 58px; height: 58px; place-items: center; border-bottom: 1px solid #34413e; font-family: Georgia, serif; font-size: 16px; }
.c-logo span { color: #e36b46; font-size: 8px; }
.c-sidebar nav { display: grid; gap: 7px; margin-top: 18px; }
.c-sidebar button { display: grid; width: 36px; height: 36px; place-items: center; color: #869590; border: 0; border-radius: 5px; background: transparent; }
.c-sidebar button.active { color: white; background: #35423f; box-shadow: inset 2px 0 #e36b46; }
.sidebar-bottom { display: grid; gap: 14px; margin-top: auto; margin-bottom: 20px; place-items: center; }
.sidebar-bottom i { width: 8px; height: 8px; border-radius: 50%; background: #51bd88; }
.variant-c > main { display: grid; grid-template-rows: 58px 1fr; min-width: 0; }
.c-header { display: grid; grid-template-columns: 280px 1fr auto; align-items: center; gap: 18px; padding: 0 18px; border-bottom: 1px solid #cbd3cd; background: #f6f8f5; }
small { color: #74817d; font-size: 8px; font-weight: 800; letter-spacing: .1em; }
h1, h2 { margin: 2px 0 0; letter-spacing: -.03em; }
h1 { font-family: Georgia, serif; font-size: 17px; font-weight: 500; }
h2 { font-size: 16px; }
.breadcrumb, .header-actions { display: flex; align-items: center; gap: 10px; color: #83908c; font-size: 10px; }
.breadcrumb strong { color: #303c39; }
.header-actions > span { padding: 6px 9px; color: #317a59; border: 1px solid #bcd1c6; background: #edf7f1; font-size: 8px; font-weight: 800; }
.header-actions i { display: inline-block; width: 6px; height: 6px; margin-right: 5px; border-radius: 50%; background: #3aa575; }
.header-actions button { padding: 7px 10px; border: 1px solid #ccd4ce; background: white; }
.workspace-c { display: grid; grid-template-columns: 220px minmax(460px, 1fr) 310px; height: calc(100vh - 58px); min-height: 0; }
.case-rail, .evidence-panel { overflow: auto; background: #f4f6f3; }
.case-rail { padding: 15px 12px; border-right: 1px solid #ccd4ce; }
.case-rail header { display: flex; align-items: center; justify-content: space-between; padding: 0 5px 12px; }
.case-rail header button { width: 26px; height: 26px; color: white; border: 0; background: #df633e; }
.case-rail label { display: flex; gap: 7px; margin-bottom: 10px; padding: 8px; border: 1px solid #d1d8d2; background: white; }
.case-rail input { min-width: 0; border: 0; outline: 0; }
.case-rail > button { display: grid; grid-template-columns: 8px 1fr; align-items: start; width: 100%; gap: 7px; padding: 11px 8px; border: 0; border-radius: 5px; background: transparent; text-align: left; }
.case-rail > button.selected { background: #e4e9e4; }
.case-rail > button > span { width: 7px; height: 7px; margin-top: 4px; border: 1px solid #87948f; border-radius: 50%; }
.case-rail > button > span[data-state="active"] { border-color: #3ca674; background: #3ca674; }
.case-rail > button > span[data-state="failed"] { border-color: #c75a45; background: #c75a45; }
.case-rail p { display: grid; gap: 4px; margin: 0; }
.case-rail strong { font-size: 10px; }
.saved-views { display: grid; gap: 4px; margin-top: 18px; padding-top: 16px; border-top: 1px solid #d2d9d3; }
.saved-views > small { margin: 0 8px 5px; }
.saved-views button { display: flex; justify-content: space-between; padding: 7px 8px; border: 0; background: transparent; font-size: 10px; }
.saved-views b { color: #7e8a86; }
.investigation-canvas { display: grid; grid-template-rows: 42px 1fr auto; min-width: 0; overflow: hidden; background: #eef1ed; }
.canvas-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 0 16px; border-bottom: 1px solid #ccd4ce; }
.canvas-toolbar button { height: 42px; padding: 0 12px; color: #77837f; border: 0; border-bottom: 2px solid transparent; background: transparent; }
.canvas-toolbar button.active { color: #25312e; border-bottom-color: #df633e; font-weight: 700; }
.canvas-toolbar > div:last-child { display: flex; align-items: center; gap: 8px; color: #7e8986; font-size: 9px; }
.canvas-toolbar b { padding: 3px 6px; color: #36765a; background: #dceae2; }
.transcript { overflow: auto; padding: 14px 24px 90px; }
.transcript article { margin: 0 auto 12px; max-width: 720px; border: 1px solid #d0d7d1; border-radius: 6px; background: #f9faf7; }
.transcript article.active { border-color: #c1846d; box-shadow: 0 8px 28px rgb(60 78 71 / 8%); }
.transcript article > header { display: flex; align-items: center; gap: 9px; padding: 9px 12px; border-bottom: 1px solid #dce1dd; background: #f1f4f0; }
.transcript article > header > span { display: grid; width: 24px; height: 19px; place-items: center; color: white; background: #374440; font-size: 8px; }
.transcript article > header strong { color: #9e5c37; font-size: 9px; }
.transcript article > header button { margin-left: auto; color: #7a8682; border: 0; background: transparent; font-size: 8px; }
.turn-flow { display: grid; grid-template-columns: 27px 1fr; gap: 8px 10px; padding: 13px; }
.avatar { display: grid; width: 25px; height: 25px; place-items: center; border-radius: 50%; font-size: 9px; font-weight: 800; }
.avatar.user { color: white; background: #34413e; }
.avatar.assistant { color: #9e4529; border: 1px solid #e0a38e; background: #fff1ea; }
.user-copy { margin: 0; padding: 6px 0; font-weight: 600; }
.presentation { overflow: hidden; border: 1px solid #d8ded9; border-radius: 5px; background: white; }
.presentation[data-state="historical"] { opacity: .7; }
.presentation[data-kind="receipt"] { border-color: #e5cfaa; background: #fffaf0; }
.presentation > header, .presentation footer { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; background: #f4f6f3; }
.presentation > header span { color: #87918e; font-family: monospace; font-size: 8px; }
.presentation > p { margin: 0; padding: 12px 10px; line-height: 1.55; }
.presentation footer { border-top: 1px solid #dce2dd; color: #74817d; font-size: 8px; }
.presentation footer button { padding: 5px 7px; color: white; border: 0; background: #de633e; }
.presentation footer button:disabled { color: #909a96; background: #dfe4e0; }
.pulse { display: flex; gap: 3px; }
.pulse i { width: 5px; height: 5px; border-radius: 50%; background: #d77a42; }
.pulse i:nth-child(2) { opacity: .55; }.pulse i:nth-child(3) { opacity: .25; }
.c-composer { display: flex; align-items: center; gap: 9px; margin: 0 18px 16px; padding: 8px 10px; border: 1px solid #c7d0c9; border-radius: 6px; background: white; box-shadow: 0 12px 30px rgb(44 63 56 / 10%); }
.c-composer button { width: 28px; height: 28px; border: 0; background: transparent; }
.c-composer input { width: 100%; border: 0; outline: 0; }
.c-composer span { color: #7b8783; font-size: 8px; white-space: nowrap; }
.c-composer button.send { color: white; border-radius: 4px; background: #df633e; }
.evidence-panel { padding: 16px; border-left: 1px solid #ccd4ce; }
.evidence-panel > header { display: grid; grid-template-columns: 1fr auto; align-items: end; }
.evidence-panel > header small { grid-column: 1 / -1; }
.evidence-panel > header span { padding: 4px 7px; color: #a56037; border: 1px solid #d7ad92; background: #fff3ea; font-size: 8px; }
.evidence-tabs { display: grid; grid-template-columns: repeat(3, 1fr); margin: 15px 0; border-bottom: 1px solid #d3dad4; text-align: center; }
.evidence-tabs > * { padding: 8px; color: #7b8783; font-size: 9px; }
.evidence-tabs b { color: #27322f; border-bottom: 2px solid #df633e; }
.evidence-panel section { margin-bottom: 17px; }
.chain { display: flex; align-items: center; gap: 5px; margin-top: 8px; }
.chain span { padding: 5px; border: 1px solid #ccd4ce; background: white; font-family: monospace; font-size: 8px; }
.chain i { color: #9da7a3; }
.identity p { color: #7c8784; font-size: 9px; }
.graph { display: grid; }
.graph > i { width: 1px; height: 11px; margin-left: 13px; background: #bbc5bf; }
.node { display: flex; justify-content: space-between; padding: 8px 10px; border-left: 3px solid #4bab7d; background: white; font-size: 9px; }
.node.running { border-left-color: #db7842; background: #fff6ef; }
.node.queued { color: #84908c; border-left-color: #abb6b0; }
.event-log > div { display: grid; grid-template-columns: 22px 1fr auto; padding: 7px 0; border-bottom: 1px solid #dce1dd; font-size: 8px; }
.event-log b { color: #8c9793; }.event-log code { color: #77837f; }
.persistence { padding: 10px; border: 1px solid #cad7cf; background: #edf6f0; }
.persistence div { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 9px; }
.persistence b { color: #337455; }
.persistence p { margin: 8px 0 0; color: #668074; font-size: 9px; line-height: 1.5; }
@media (max-width: 1100px) { .workspace-c { grid-template-columns: 190px 1fr; } .evidence-panel { display: none; } .c-header { grid-template-columns: 230px 1fr; } .breadcrumb { display: none; } }
</style>
