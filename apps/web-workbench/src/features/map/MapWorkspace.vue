<script setup lang="ts">
import { ref } from "vue";
import DeviceCard from "../../components/domain/DeviceCard.vue";
import type { Device } from "./devices.js";
import type { ConsultRouteCandidate } from "./map-controller.js";
import type { MapTarget } from "./map-targets.js";
import MapView from "./MapView.vue";

withDefaults(
  defineProps<{
    consultCandidates?: readonly ConsultRouteCandidate[];
    consultCandidatesClickable?: boolean;
    consultEmphasizedFeatureId?: string | undefined;
    consultRevisionAnchor?:
      | { readonly lng: number; readonly lat: number }
      | undefined;
    consultRevisionMode?: boolean;
    focusedTarget: MapTarget | undefined;
    highlightedTargets: readonly MapTarget[];
    previewedPath: MapTarget | undefined;
    selectedDevice: Device | undefined;
    visibleLayerIds: readonly string[];
  }>(),
  {
    consultCandidates: () => [],
    consultCandidatesClickable: false,
    consultEmphasizedFeatureId: undefined,
    consultRevisionAnchor: undefined,
    consultRevisionMode: false,
  },
);

const emit = defineEmits<{
  consultCandidateClick: [
    featureId: string,
    point: { readonly x: number; readonly y: number },
    position: { readonly lng: number; readonly lat: number },
  ];
  consultCandidateHover: [featureId: string | undefined];
  consultRevisionPick: [
    position: { readonly lng: number; readonly lat: number },
    point: { readonly x: number; readonly y: number },
    featureId: string | undefined,
  ];
  locateDevice: [deviceId: string];
}>();

function forwardCandidateClick(
  featureId: string,
  point: { readonly x: number; readonly y: number },
  position: { readonly lng: number; readonly lat: number },
): void {
  emit("consultCandidateClick", featureId, point, position);
}

function forwardCandidateHover(featureId: string | undefined): void {
  emit("consultCandidateHover", featureId);
}

function forwardRevisionPick(
  position: { readonly lng: number; readonly lat: number },
  point: { readonly x: number; readonly y: number },
  featureId: string | undefined,
): void {
  emit("consultRevisionPick", position, point, featureId);
}

interface MapViewHandle {
  clearPreviewPath(): Promise<void>;
  focusOn(target: MapTarget): void;
  highlight(targets: readonly MapTarget[]): void;
  previewPath(target: MapTarget): Promise<void>;
  selectDevice(device: Device | undefined): void;
  setLayerVisibility(layerId: string, visible: boolean): Promise<void>;
}

const mapView = ref<MapViewHandle>();

function requireMapView(): MapViewHandle {
  if (mapView.value === undefined) throw new Error("Map surface is not ready.");
  return mapView.value;
}

defineExpose({
  clearPreviewPath: () => requireMapView().clearPreviewPath(),
  focusOn: (target: MapTarget) => requireMapView().focusOn(target),
  highlight: (targets: readonly MapTarget[]) =>
    requireMapView().highlight(targets),
  previewPath: (target: MapTarget) => requireMapView().previewPath(target),
  selectDevice: (device: Device | undefined) =>
    requireMapView().selectDevice(device),
  setLayerVisibility: (layerId: string, visible: boolean) =>
    requireMapView().setLayerVisibility(layerId, visible),
});
</script>

<template>
  <aside class="map-workspace" data-testid="map-workspace">
    <header class="map-workspace-header">
      <div>
        <p>GIS Workspace</p>
        <span>受控业务 Surface</span>
      </div>
      <button type="button" @click="emit('locateDevice', '01')">定位测试设备</button>
    </header>
    <div class="map-workspace-canvas">
      <MapView
        ref="mapView"
        :consult-candidates="consultCandidates"
        :consult-candidates-clickable="consultCandidatesClickable"
        :consult-emphasized-feature-id="consultEmphasizedFeatureId"
        :consult-revision-anchor="consultRevisionAnchor"
        :consult-revision-mode="consultRevisionMode"
        :focused-target="focusedTarget"
        :highlighted-targets="highlightedTargets"
        :previewed-path="previewedPath"
        :selected-device="selectedDevice"
        :visible-layer-ids="visibleLayerIds"
        @consult-candidate-click="forwardCandidateClick"
        @consult-candidate-hover="forwardCandidateHover"
        @consult-revision-pick="forwardRevisionPick"
      />
      <div
        v-if="
          visibleLayerIds.length > 0 ||
          highlightedTargets.length > 0 ||
          previewedPath !== undefined
        "
        class="map-effect-summary"
        data-testid="map-effect-summary"
      >
        <span v-if="visibleLayerIds.length > 0">限制图层</span>
        <span v-if="highlightedTargets.length > 0">
          {{ highlightedTargets.length }} 处高亮
        </span>
        <span v-if="previewedPath !== undefined">路线预览</span>
      </div>
      <slot name="overlay" />
      <DeviceCard v-if="selectedDevice !== undefined" :device="selectedDevice" />
    </div>
  </aside>
</template>
