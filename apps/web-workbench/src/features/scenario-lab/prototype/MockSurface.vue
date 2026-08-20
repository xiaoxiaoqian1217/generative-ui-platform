<script setup lang="ts">
/**
 * PROTOTYPE - throwaway. Hand-rendered mock of a generated A2UI surface,
 * so variants can argue about preview size/placement without the real
 * Secondary LLM in the loop.
 */
defineProps<{ scenario: string }>();
</script>

<template>
  <div class="mock-surface">
    <template v-if="scenario === 'summary'">
      <div class="ms-head">
        <span class="ms-eyebrow">巡检摘要</span>
        <span class="ms-badge ms-badge-warn">Partial success</span>
      </div>
      <div class="ms-hero">
        <strong>128</strong>
        <span>total</span>
      </div>
      <div class="ms-stats">
        <div class="ms-stat">
          <span>成功</span>
          <strong>120</strong>
        </div>
        <div class="ms-stat">
          <span>失败</span>
          <strong class="ms-danger">8</strong>
        </div>
        <div class="ms-stat">
          <span>成功率</span>
          <strong>93.8%</strong>
        </div>
      </div>
      <p class="ms-note">8 项任务失败,需要人工复核后才能关闭本次巡检。</p>
    </template>

    <template v-else-if="scenario === 'detail'">
      <div class="ms-head">
        <span class="ms-eyebrow">任务详情</span>
        <span class="ms-badge ms-badge-info">running</span>
      </div>
      <div class="ms-hero">
        <strong class="ms-hero-text">Task A</strong>
      </div>
      <div class="ms-kv">
        <div class="ms-row"><span>任务 ID</span><span>JOB-1024</span></div>
        <div class="ms-row"><span>负责人</span><span>Alice</span></div>
        <div class="ms-row"><span>开始时间</span><span>14:20</span></div>
        <div class="ms-row"><span>预计结束</span><span>15:30</span></div>
      </div>
    </template>

    <template v-else-if="scenario === 'collection'">
      <div class="ms-head"><span class="ms-eyebrow">条目集合</span></div>
      <div v-for="item in [
          { name: 'Item A', progress: 82, status: 'normal' },
          { name: 'Item B', progress: 63, status: 'warning' },
          { name: 'Item C', progress: 91, status: 'normal' },
        ]" :key="item.name" class="ms-item">
        <span class="ms-item-name">{{ item.name }}</span>
        <span class="ms-bar"><i :style="{ width: `${item.progress}%` }" /></span>
        <span class="ms-item-value">{{ item.progress }}%</span>
        <span class="ms-badge" :class="item.status === 'warning' ? 'ms-badge-warn' : 'ms-badge-ok'">{{ item.status }}</span>
      </div>
    </template>

    <template v-else-if="scenario === 'timeline'">
      <div class="ms-head"><span class="ms-eyebrow">执行时间线</span></div>
      <div v-for="event in [
          { label: 'Created', time: '14:20' },
          { label: 'Started', time: '14:22' },
          { label: 'Warning detected', time: '14:31' },
          { label: 'Recovered', time: '14:35' },
          { label: 'Completed', time: '14:42' },
        ]" :key="event.time" class="ms-event">
        <span class="ms-time">{{ event.time }}</span>
        <span class="ms-dot" />
        <span>{{ event.label }}</span>
      </div>
    </template>

    <template v-else-if="scenario === 'comparison'">
      <div class="ms-head"><span class="ms-eyebrow">方案对比</span></div>
      <table class="ms-table">
        <thead><tr><th /><th>耗时</th><th>成功率</th><th>成本</th><th>风险</th></tr></thead>
        <tbody>
          <tr><td>A</td><td>12</td><td>92%</td><td>120</td><td><span class="ms-badge ms-badge-ok">low</span></td></tr>
          <tr><td>B</td><td>9</td><td>97%</td><td>145</td><td><span class="ms-badge ms-badge-warn">medium</span></td></tr>
        </tbody>
      </table>
    </template>

    <template v-else>
      <div class="ms-callout">
        <span class="ms-badge ms-badge-warn">partial_failure</span>
        <p>8 of 128 jobs failed during the nightly run.</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.mock-surface {
  display: grid;
  gap: 16px;
  padding: 24px 26px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--paper);
  box-shadow: 0 1px 3px rgb(31 35 40 / 6%);
  font-size: 13px;
}

.ms-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.ms-eyebrow {
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.ms-badge {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  background: #eceff3;
  color: var(--muted);
}

.ms-badge-warn { background: #fdf3e0; color: #b25e09; }
.ms-badge-ok { background: #e3f3e7; color: var(--success); }
.ms-badge-info { background: #e3ecfd; color: var(--running); }

/* Hero 大数字 */
.ms-hero {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.ms-hero strong {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.ms-hero span {
  color: var(--muted);
  font-size: 13px;
}

.ms-hero-text {
  font-size: 24px;
}

/* 无框统计行:label 在上,value 在下,细分隔线 */
.ms-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}

.ms-stat {
  display: grid;
  gap: 4px;
  padding: 0 18px;
}

.ms-stat + .ms-stat {
  border-left: 1px solid #eef0f3;
}

.ms-stat:first-child {
  padding-left: 0;
}

.ms-stat span {
  color: var(--muted);
  font-size: 12px;
}

.ms-stat strong {
  font-size: 22px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.ms-danger {
  color: var(--danger);
}

.ms-note {
  margin: 0;
  padding-top: 12px;
  border-top: 1px solid #f0f2f5;
  color: var(--muted);
  font-size: 12px;
}

.ms-kv {
  display: grid;
  gap: 2px;
}

.ms-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 0;
  border-bottom: 1px solid #f4f6f8;
}

.ms-row:last-child {
  border-bottom: 0;
}

.ms-row span:first-child {
  color: var(--muted);
}

.ms-item {
  display: grid;
  grid-template-columns: 80px 1fr 44px auto;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
}

.ms-item-name {
  font-weight: 550;
}

.ms-bar {
  height: 6px;
  border-radius: 3px;
  background: #eef0f3;
  overflow: hidden;
}

.ms-bar i {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: var(--accent);
}

.ms-item-value {
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.ms-event {
  display: grid;
  grid-template-columns: 48px 12px 1fr;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
}

.ms-time {
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.ms-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
}

.ms-table {
  width: 100%;
  border-collapse: collapse;
}

.ms-table th,
.ms-table td {
  padding: 8px 10px;
  border-bottom: 1px solid #f0f2f5;
  text-align: left;
}

.ms-table th {
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
}

.ms-callout {
  padding: 14px 16px;
  border-left: 3px solid var(--degraded);
  border-radius: 8px;
  background: #fdf6e5;
}

.ms-callout p {
  margin: 8px 0 0;
}
</style>
