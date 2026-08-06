<script setup lang="ts">
// PROTOTYPE(issue #174)——外壳已定为 B(顶栏工具 + 侧栏纯会话列表);
// 本版迭代会话区:纯对话流、调试/诊断入口收成每条消息上的工具按钮。
// 抛壳路由 /prototype-ia,仅开发期使用。
import { computed, ref } from "vue";

interface MockConversation {
  id: string;
  title: string;
  updatedAt: string;
  turnCount: number;
  archived: boolean;
}

interface MockTurn {
  turnId: string;
  status: "running" | "completed" | "degraded" | "failed";
  durationMs?: number;
  userMessage: string;
  assistantMarkdown?: string;
  surface?: { surfaceId: string; kind: "camera-grid" | "dispatch-confirm" };
  degradationReason?: string;
  errorMessage?: string;
}

const TOOL_NAV = [
  { route: "/catalog", label: "Catalog" },
  { route: "/scenarios", label: "Scenarios" },
  { route: "/cases", label: "Cases" },
  { route: "/settings", label: "Settings" },
] as const;

const conversations: MockConversation[] = [
  { id: "conv-01", title: "东门摄像头离线排查", updatedAt: "10:42", turnCount: 6, archived: false },
  { id: "conv-02", title: "夜间巡防路线调整", updatedAt: "昨天", turnCount: 4, archived: false },
  { id: "conv-03", title: "访客闸机告警确认", updatedAt: "昨天", turnCount: 2, archived: false },
  { id: "conv-04", title: "上周设备巡检汇总", updatedAt: "周一", turnCount: 9, archived: true },
  { id: "conv-05", title: "B 区无人机试飞记录", updatedAt: "8/1", turnCount: 3, archived: true },
];

const turns: MockTurn[] = [
  {
    turnId: "turn-101",
    status: "completed",
    durationMs: 3200,
    userMessage: "东门 CAM-07 现在什么状态?",
    assistantMarkdown:
      "CAM-07 当前离线,最后心跳 09:58:12。同区域 CAM-05、CAM-06 在线。建议检查 PoE 供电与交换机端口。",
  },
  {
    turnId: "turn-102",
    status: "completed",
    durationMs: 5400,
    userMessage: "把东门区域的摄像头都调出来看看",
    assistantMarkdown: "已生成东门区域摄像头面板,共 4 路。",
    surface: { surfaceId: "surface-201", kind: "camera-grid" },
  },
  {
    turnId: "turn-103",
    status: "degraded",
    durationMs: 8100,
    degradationReason: "A2UI 校验失败,已降级为 Markdown",
    userMessage: "给夜班保安派单去现场确认",
    assistantMarkdown:
      "展示编译未通过校验,已降级为文本。派单内容:夜班一组,东门 CAM-07 现场核查,优先级高。",
  },
  {
    turnId: "turn-104",
    status: "running",
    userMessage: "确认派单",
  },
];

const selectedId = ref("conv-01");
const activeTool = ref<string>();
const inspectTurnId = ref<string>();
const rawSurfaceId = ref<string>();

const activeConversations = computed(() => conversations.filter((item) => !item.archived));
const archivedConversations = computed(() => conversations.filter((item) => item.archived));

function selectConversation(id: string): void {
  selectedId.value = id;
  activeTool.value = undefined;
}
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <strong>Workbench</strong>
      <nav aria-label="工具">
        <a
          v-for="tool in TOOL_NAV"
          :key="tool.route"
          :class="{ active: activeTool === tool.route }"
          href="#"
          @click.prevent="activeTool = tool.route"
        >
          {{ tool.label }}
        </a>
      </nav>
      <span class="env-chip">ENV dev · Runtime Host 已连接</span>
    </header>

    <div class="body">
      <aside class="sidebar">
        <div class="sidebar-head">
          <span>Debug Conversations</span>
          <button class="new-btn" type="button">+ 新建</button>
        </div>
        <div class="conv-list">
          <button
            v-for="item in activeConversations"
            :key="item.id"
            class="conv-item"
            :class="{ active: selectedId === item.id && activeTool === undefined }"
            type="button"
            @click="selectConversation(item.id)"
          >
            <span class="conv-title">{{ item.title }}</span>
            <span class="conv-meta">{{ item.updatedAt }} · {{ item.turnCount }} turns</span>
            <span class="conv-actions">
              <button type="button" title="重命名">✎</button>
              <button type="button" title="归档">▤</button>
              <button type="button" title="删除">✕</button>
            </span>
          </button>
          <p class="archived-heading">已归档</p>
          <button
            v-for="item in archivedConversations"
            :key="item.id"
            class="conv-item archived"
            type="button"
            @click="selectConversation(item.id)"
          >
            <span class="conv-title">{{ item.title }}</span>
            <span class="conv-meta">{{ item.updatedAt }} · {{ item.turnCount }} turns</span>
          </button>
        </div>
      </aside>

      <main class="stage">
        <template v-if="activeTool === undefined">
          <div class="chat-scroll">
            <div class="chat-column">
              <section v-for="turn in turns" :key="turn.turnId" class="turn">
                <div class="bubble user">{{ turn.userMessage }}</div>

                <div class="assistant">
                  <p v-if="turn.assistantMarkdown" class="assistant-text">{{ turn.assistantMarkdown }}</p>

                  <div v-if="turn.surface" class="surface">
                    <template v-if="turn.surface.kind === 'camera-grid'">
                      <div class="cam-grid">
                        <div
                          v-for="cam in ['CAM-05', 'CAM-06', 'CAM-07', 'CAM-08']"
                          :key="cam"
                          class="cam-cell"
                          :data-offline="cam === 'CAM-07'"
                        >
                          {{ cam }}<span>{{ cam === "CAM-07" ? "离线" : "在线" }}</span>
                        </div>
                      </div>
                      <div class="surface-actions">
                        <button type="button">查看轨迹</button>
                        <button type="button">导出快照</button>
                      </div>
                    </template>
                    <template v-else>
                      <p>高风险操作确认:夜班一组 · 东门 CAM-07 · 优先级高</p>
                      <div class="surface-actions">
                        <button class="danger" type="button">确认派单</button>
                        <button type="button">取消</button>
                      </div>
                    </template>
                  </div>

                  <p v-if="turn.status === 'running'" class="turn-hint running">
                    <span class="spinner"></span>正在运行…
                  </p>
                  <p v-else-if="turn.status === 'degraded'" class="turn-hint degraded" :title="turn.degradationReason">
                    ⚠ 已降级<template v-if="turn.degradationReason"> · {{ turn.degradationReason }}</template>
                  </p>
                  <p v-else-if="turn.status === 'failed'" class="turn-hint failed">
                    ✕ 运行失败<template v-if="turn.errorMessage"> · {{ turn.errorMessage }}</template>
                  </p>

                  <div class="debug-tools">
                    <a
                      class="debug-btn"
                      :href="`/inspect/${turn.turnId}`"
                      title="打开逐 Turn 诊断页"
                      @click.prevent="inspectTurnId = turn.turnId"
                    >
                      ⏱ {{ turn.durationMs ? (turn.durationMs / 1000).toFixed(1) + "s" : "…" }} · Inspect
                    </a>
                    <button
                      v-if="turn.surface"
                      class="debug-btn"
                      type="button"
                      title="查看原始 A2UI 操作"
                      @click="rawSurfaceId = turn.surface!.surfaceId"
                    >
                      &lt;/&gt; A2UI
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <footer class="composer">
            <div class="composer-inner">
              <input placeholder="继续提问…" />
              <button type="button">发送</button>
            </div>
          </footer>
        </template>

        <div v-else class="tool-page">
          <p class="tool-eyebrow">工具页占位</p>
          <h2>{{ TOOL_NAV.find((t) => t.route === activeTool)?.label }}</h2>
          <button type="button" @click="activeTool = undefined">← 返回会话</button>
        </div>
      </main>
    </div>

    <div v-if="inspectTurnId" class="overlay" @click.self="inspectTurnId = undefined">
      <section class="overlay-card">
        <header>
          <strong>/inspect/{{ inspectTurnId }}</strong>
          <button type="button" @click="inspectTurnId = undefined">✕ 关闭</button>
        </header>
        <p>独立逐 Turn 诊断页占位:时间线 / 阶段 / 工具调用 / Artifact 引用 / 错误与耗时。</p>
        <ol>
          <li>Business Agent · 820ms</li>
          <li>Presentation 决策 · 45ms</li>
          <li>UI 编译 · 130ms</li>
          <li>渲染 + Action · 210ms</li>
        </ol>
      </section>
    </div>

    <div v-if="rawSurfaceId" class="overlay" @click.self="rawSurfaceId = undefined">
      <section class="overlay-card">
        <header>
          <strong>A2UI 原始操作 · {{ rawSurfaceId }}</strong>
          <button type="button" @click="rawSurfaceId = undefined">✕ 关闭</button>
        </header>
        <pre class="raw-json">[
  { "op": "createSurface", "surfaceId": "{{ rawSurfaceId }}" },
  { "op": "upsertComponent", "id": "cam-grid", "type": "CameraGrid" },
  { "op": "emitAction", "actionType": "camera.track" }
]</pre>
      </section>
    </div>
  </div>
</template>

<style scoped>
.shell { display: flex; flex-direction: column; height: 100vh; font: 14px/1.6 system-ui, sans-serif; color: #1f2328; background: #f6f7f9; }
.body { display: flex; flex: 1; min-height: 0; }

.topbar { display: flex; align-items: center; gap: 24px; padding: 0 16px; height: 48px; background: #fff; border-bottom: 1px solid #e2e5ea; }
.topbar nav { display: flex; gap: 4px; flex: 1; }
.topbar nav a { padding: 6px 12px; border-radius: 6px; text-decoration: none; color: #555; }
.topbar nav a.active { background: #eef2ff; color: #3451d1; font-weight: 600; }
.env-chip { font-size: 12px; color: #5c6470; background: #eef0f3; border-radius: 999px; padding: 2px 10px; }

.sidebar { display: flex; flex-direction: column; width: 260px; background: #fff; border-right: 1px solid #e2e5ea; }
.sidebar-head { display: flex; align-items: center; justify-content: space-between; padding: 12px; border-bottom: 1px solid #eef0f3; font-weight: 600; }
.new-btn { padding: 6px 10px; border: 1px solid #3451d1; border-radius: 6px; background: #3451d1; color: #fff; cursor: pointer; }
.conv-list { flex: 1; overflow-y: auto; padding: 8px; }
.conv-item { position: relative; display: flex; flex-direction: column; width: 100%; padding: 8px 10px; border: 0; border-radius: 8px; background: transparent; text-align: left; cursor: pointer; }
.conv-item.active { background: #eef2ff; }
.conv-item.archived { opacity: 0.6; }
.conv-title { font-weight: 600; }
.conv-meta { font-size: 12px; color: #8a8f99; }
.conv-actions { position: absolute; top: 6px; right: 6px; display: none; gap: 2px; }
.conv-item:hover .conv-actions { display: flex; }
.conv-actions button { border: 0; background: #fff; border-radius: 4px; cursor: pointer; padding: 2px 5px; box-shadow: 0 1px 2px rgba(0,0,0,.12); }
.archived-heading { margin: 12px 4px 4px; font-size: 11px; letter-spacing: .08em; color: #8a8f99; }

.stage { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.chat-scroll { flex: 1; overflow-y: auto; }
.chat-column { max-width: 760px; margin: 0 auto; padding: 28px 20px 12px; display: flex; flex-direction: column; gap: 24px; }

.turn { display: flex; flex-direction: column; gap: 10px; }
.bubble.user { align-self: flex-end; max-width: 70%; background: #3451d1; color: #fff; padding: 9px 14px; border-radius: 16px 16px 4px 16px; white-space: pre-wrap; }
.assistant { align-self: stretch; }
.assistant-text { margin: 0; white-space: pre-wrap; }

.surface { margin-top: 10px; border: 1px solid #e2e5ea; border-radius: 12px; background: #fff; padding: 14px 16px; }
.cam-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.cam-cell { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 14px 0; background: #eef0f3; border-radius: 6px; font-family: ui-monospace, monospace; font-size: 12px; }
.cam-cell[data-offline="true"] { background: #fdecec; color: #c03232; }
.surface-actions { display: flex; gap: 8px; margin-top: 12px; }
.surface-actions button { padding: 6px 14px; border: 1px solid #c9ced6; border-radius: 6px; background: #fff; cursor: pointer; }
.surface-actions button.danger { border-color: #c03232; background: #c03232; color: #fff; }

.turn-hint { margin: 8px 0 0; font-size: 12.5px; }
.turn-hint.running { color: #1a56db; display: flex; align-items: center; gap: 6px; }
.turn-hint.degraded { color: #9a6200; }
.turn-hint.failed { color: #c03232; }
.spinner { width: 12px; height: 12px; border: 2px solid #1a56db; border-top-color: transparent; border-radius: 50%; animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.debug-tools { display: flex; gap: 6px; margin-top: 6px; opacity: 0; transition: opacity .12s; }
.turn:hover .debug-tools, .turn:focus-within .debug-tools { opacity: 1; }
.debug-btn { font-size: 12px; color: #6b7280; background: transparent; border: 1px solid transparent; border-radius: 6px; padding: 2px 8px; cursor: pointer; text-decoration: none; }
.debug-btn:hover { background: #eef0f3; border-color: #e2e5ea; color: #1f2328; }

.composer { background: transparent; padding: 12px 20px 20px; }
.composer-inner { max-width: 760px; margin: 0 auto; display: flex; gap: 8px; background: #fff; border: 1px solid #d3d8e0; border-radius: 14px; padding: 8px; }
.composer-inner input { flex: 1; border: 0; outline: none; padding: 6px 10px; font: inherit; }
.composer-inner button { padding: 8px 18px; border: 0; border-radius: 10px; background: #3451d1; color: #fff; cursor: pointer; }

.tool-page { padding: 32px; }
.tool-eyebrow { font-size: 11px; letter-spacing: .1em; color: #8a8f99; }

.overlay { position: fixed; inset: 0; background: rgba(15,18,24,.45); display: flex; align-items: center; justify-content: center; }
.overlay-card { width: 480px; background: #fff; border-radius: 12px; padding: 20px; }
.overlay-card header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.overlay-card header button { border: 1px solid #c9ced6; background: #fff; border-radius: 6px; padding: 4px 10px; cursor: pointer; }
.raw-json { background: #17191d; color: #d5dbe5; border-radius: 8px; padding: 12px; font-size: 12px; overflow-x: auto; }
</style>
