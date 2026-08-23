<script setup lang="ts">
// PROTOTYPE - throwaway: a deterministic map illustration for layout comparison.
import type {
  PrototypeCommentAnchor,
  PrototypeRouteId,
} from "./patrol-consult-prototype.js";

withDefaults(
  defineProps<{
    activeRouteId: PrototypeRouteId;
    commentable?: boolean;
    compact?: boolean;
    hoveredRouteId?: PrototypeRouteId | undefined;
    interactive?: boolean;
    showLegend?: boolean;
  }>(),
  {
    commentable: false,
    compact: false,
    hoveredRouteId: undefined,
    interactive: true,
    showLegend: true,
  },
);

const emit = defineEmits<{
  comment: [anchor: PrototypeCommentAnchor];
  hover: [routeId: PrototypeRouteId | undefined];
  preview: [routeId: PrototypeRouteId];
}>();
</script>

<template>
  <div
    class="consult-map"
    :data-commentable="commentable"
    :data-compact="compact"
    :data-interactive="interactive"
  >
    <div class="consult-map-toolbar" aria-hidden="true">
      <button type="button">+</button>
      <button type="button">-</button>
      <button type="button">⌖</button>
    </div>

    <svg
      aria-label="北侧通道两条候选巡逻路线"
      class="consult-map-canvas"
      role="group"
      viewBox="0 0 900 620"
    >
      <defs>
        <pattern id="prototype-grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#dfe5df" stroke-width="1" />
        </pattern>
        <filter id="prototype-route-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" flood-color="#20352f" flood-opacity="0.22" stdDeviation="3" />
        </filter>
      </defs>

      <rect width="900" height="620" fill="#edf1ea" />
      <rect width="900" height="620" fill="url(#prototype-grid)" opacity="0.7" />

      <g class="map-blocks">
        <path d="M54 54h212v116H54zM302 48h148v92H302zM502 58h300v96H502z" />
        <path d="M70 216h154v126H70zM276 194h214v116H276zM548 210h268v136H548z" />
        <path d="M62 410h230v132H62zM350 386h156v168H350zM574 404h252v138H574z" />
      </g>

      <g class="map-roads">
        <path d="M0 184H900M250 0v620M522 0v620M0 372h900" />
        <path d="M0 564 900 164M132 0l704 620" />
      </g>

      <path
        class="restricted-area"
        d="M575 65h218v112H575z"
      />
      <text class="map-area-label" x="590" y="91">临时限制区</text>

      <path
        class="route-hit-area"
        d="M110 506 C204 434 222 336 358 286 S552 118 750 154"
        role="button"
        tabindex="0"
        aria-label="预览路线 A"
        :aria-disabled="!interactive"
        @click="emit('preview', 'route-a')"
        @focus="emit('hover', 'route-a')"
        @blur="emit('hover', undefined)"
        @mouseenter="emit('hover', 'route-a')"
        @mouseleave="emit('hover', undefined)"
        @keydown.enter="emit('preview', 'route-a')"
      />
      <path
        class="route-line route-a"
        :data-active="activeRouteId === 'route-a'"
        :data-hovered="hoveredRouteId === 'route-a'"
        d="M110 506 C204 434 222 336 358 286 S552 118 750 154"
      />

      <path
        class="route-hit-area"
        d="M110 506 C248 516 282 382 416 418 S596 460 770 320"
        role="button"
        tabindex="0"
        aria-label="预览路线 B"
        :aria-disabled="!interactive"
        @click="emit('preview', 'route-b')"
        @focus="emit('hover', 'route-b')"
        @blur="emit('hover', undefined)"
        @mouseenter="emit('hover', 'route-b')"
        @mouseleave="emit('hover', undefined)"
        @keydown.enter="emit('preview', 'route-b')"
      />
      <path
        class="route-line route-b"
        :data-active="activeRouteId === 'route-b'"
        :data-hovered="hoveredRouteId === 'route-b'"
        d="M110 506 C248 516 282 382 416 418 S596 460 770 320"
      />

      <g class="observation-points">
        <circle cx="110" cy="506" r="9" />
        <circle cx="358" cy="286" r="9" />
        <circle cx="416" cy="418" r="9" />
        <circle cx="750" cy="154" r="9" />
        <circle cx="770" cy="320" r="9" />
      </g>

      <g
        v-if="commentable"
        class="coordinate-comment-target"
        role="button"
        tabindex="0"
        aria-label="在桥下区域添加修改评论"
        @click="emit('comment', 'under-bridge')"
        @keydown.enter="emit('comment', 'under-bridge')"
      >
        <circle class="coordinate-comment-hit" cx="416" cy="418" r="34" />
        <circle class="coordinate-comment-badge" cx="439" cy="394" r="14" />
        <path d="M432 388h14v10h-8l-4 4v-4h-2z" />
      </g>

      <g
        class="route-marker marker-a"
        :data-active="activeRouteId === 'route-a'"
        @click="emit('preview', 'route-a')"
      >
        <circle cx="493" cy="190" r="19" />
        <text x="493" y="196">A</text>
      </g>
      <g
        class="route-marker marker-b"
        :data-active="activeRouteId === 'route-b'"
        @click="emit('preview', 'route-b')"
      >
        <circle cx="545" cy="434" r="19" />
        <text x="545" y="440">B</text>
      </g>

      <text class="map-place-label" x="92" y="485">北侧入口</text>
      <text class="map-place-label" x="316" y="262">东侧高地</text>
      <text class="map-place-label" x="380" y="457">桥下区域</text>
    </svg>

    <div v-if="showLegend" class="consult-map-legend">
      <span><i class="legend-candidate"></i>候选参考</span>
      <span><i class="legend-active"></i>当前预览</span>
      <span><i class="legend-point"></i>观察点</span>
    </div>
  </div>
</template>

<style scoped>
.consult-map {
  position: relative;
  width: 100%;
  min-width: 0;
  height: 100%;
  min-height: 260px;
  overflow: hidden;
  color: #23332f;
  background: #edf1ea;
}

.consult-map-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.map-blocks {
  fill: #f7f8f4;
  stroke: #d6ddd7;
  stroke-width: 2;
}

.map-roads {
  fill: none;
  stroke: #fff;
  stroke-width: 21;
}

.map-roads path + path {
  stroke-width: 9;
}

.restricted-area {
  fill: #e996641c;
  stroke: #bf744d;
  stroke-dasharray: 8 6;
  stroke-width: 2;
}

.map-area-label,
.map-place-label {
  fill: #68756f;
  font-size: 14px;
  font-weight: 650;
  pointer-events: none;
}

.map-area-label {
  fill: #9a5f40;
  font-size: 12px;
}

.route-hit-area {
  fill: none;
  stroke: transparent;
  stroke-width: 34;
  cursor: pointer;
  pointer-events: stroke;
}

.consult-map[data-interactive="false"] .route-hit-area {
  cursor: default;
  pointer-events: none;
}

.consult-map[data-interactive="false"] .route-marker {
  cursor: default;
  pointer-events: none;
}

.route-line {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 4;
  opacity: 0.52;
  pointer-events: none;
  transition: opacity 160ms ease, stroke-width 160ms ease;
}

.route-a {
  stroke: #3767ca;
}

.route-b {
  stroke: #cb6d35;
}

.route-line[data-hovered="true"] {
  opacity: 0.82;
  stroke-width: 6;
}

.route-line[data-active="true"] {
  filter: url(#prototype-route-shadow);
  opacity: 1;
  stroke-width: 9;
}

.observation-points circle {
  fill: #fff;
  stroke: #2c6959;
  stroke-width: 4;
}

.coordinate-comment-target {
  cursor: pointer;
  outline: none;
}

.coordinate-comment-hit {
  fill: transparent;
  stroke: transparent;
  stroke-width: 2;
  transition: fill 140ms ease, stroke 140ms ease;
}

.coordinate-comment-badge {
  fill: #fff;
  stroke: #cf6d37;
  stroke-width: 3;
  filter: drop-shadow(0 3px 5px rgb(67 42 28 / 18%));
}

.coordinate-comment-target path {
  fill: #cf6d37;
  pointer-events: none;
}

.coordinate-comment-target:hover .coordinate-comment-hit,
.coordinate-comment-target:focus-visible .coordinate-comment-hit {
  fill: rgb(207 109 55 / 10%);
  stroke: #cf6d37;
  stroke-dasharray: 5 4;
}

.consult-map[data-commentable="false"] .coordinate-comment-target {
  pointer-events: none;
}

.route-marker {
  cursor: pointer;
}

.route-marker circle {
  fill: #fff;
  stroke-width: 3;
}

.route-marker text {
  font-size: 16px;
  font-weight: 850;
  text-anchor: middle;
  pointer-events: none;
}

.marker-a circle {
  stroke: #3767ca;
}

.marker-a text {
  fill: #3767ca;
}

.marker-b circle {
  stroke: #cb6d35;
}

.marker-b text {
  fill: #cb6d35;
}

.route-marker[data-active="true"] circle {
  fill: #1f302b;
  stroke: #1f302b;
}

.route-marker[data-active="true"] text {
  fill: #fff;
}

.consult-map-toolbar {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 3;
  display: grid;
  overflow: hidden;
  border: 1px solid rgb(40 57 51 / 17%);
  border-radius: 9px;
  background: rgb(255 255 255 / 94%);
  box-shadow: 0 5px 18px rgb(40 57 51 / 12%);
}

.consult-map-toolbar button {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  padding: 0;
  border: 0;
  border-bottom: 1px solid #e4e7e4;
  color: #34443f;
  background: transparent;
  font-weight: 750;
}

.consult-map-toolbar button:last-child {
  border-bottom: 0;
}

.consult-map-legend {
  position: absolute;
  right: 16px;
  bottom: 16px;
  z-index: 3;
  display: flex;
  gap: 13px;
  padding: 9px 12px;
  border: 1px solid rgb(40 57 51 / 13%);
  border-radius: 10px;
  color: #5d6965;
  background: rgb(255 255 255 / 92%);
  box-shadow: 0 7px 22px rgb(40 57 51 / 10%);
  font-size: 10px;
  font-weight: 650;
  backdrop-filter: blur(8px);
}

.consult-map-legend span {
  display: flex;
  align-items: center;
  gap: 5px;
}

.consult-map-legend i {
  display: inline-block;
}

.legend-candidate,
.legend-active {
  width: 19px;
  border-top: 2px solid #5272b7;
}

.legend-active {
  border-top-width: 6px;
}

.legend-point {
  width: 9px;
  height: 9px;
  border: 2px solid #2c6959;
  border-radius: 50%;
  background: #fff;
}

.consult-map[data-compact="true"] .consult-map-toolbar {
  top: 10px;
  left: 10px;
}

.consult-map[data-compact="true"] .consult-map-legend {
  right: 10px;
  bottom: 10px;
}
</style>
