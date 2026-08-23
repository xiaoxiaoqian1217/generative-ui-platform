<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { Device } from "./devices.js";
import { TEST_DEVICES } from "./devices.js";
import {
  createMapController,
  type ConsultRouteCandidate,
  type MapController,
  type MapViewportState,
} from "./map-controller.js";
import type { MapTarget } from "./map-targets.js";

const props = withDefaults(
  defineProps<{
    consultCandidates?: readonly ConsultRouteCandidate[];
    consultCandidatesClickable?: boolean;
    consultClickableFeatureId?: string | undefined;
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
    consultClickableFeatureId: undefined,
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
}>();

const mapContainer = ref<HTMLElement>();
const appliedFocusedTarget = ref<MapTarget>();
const appliedHighlightedTargets = ref<readonly MapTarget[]>([]);
const appliedPreviewedPath = ref<MapTarget>();
const appliedSelectedDeviceId = ref<string>();
const appliedVisibleLayerIds = ref<readonly string[]>([]);
const appliedViewport = ref<MapViewportState>();
const appliedConsultCandidateKey = ref("");
const appliedConsultEmphasis = ref<string>();
let controller: MapController | undefined;
let resizeObserver: ResizeObserver | undefined;

function requireController(): MapController {
  if (controller === undefined) throw new Error("Map surface is not ready.");
  return controller;
}

function focusOn(target: MapTarget): void {
  const viewport = requireController().focusOn(target);
  appliedFocusedTarget.value = target;
  appliedViewport.value = viewport;
}

function highlight(targets: readonly MapTarget[]): void {
  requireController().highlight(targets);
  appliedHighlightedTargets.value = targets;
}

async function previewPath(target: MapTarget): Promise<void> {
  await requireController().previewPath(target);
  appliedPreviewedPath.value = target;
}

async function clearPreviewPath(): Promise<void> {
  await requireController().clearPreviewPath();
  appliedPreviewedPath.value = undefined;
}

function selectDevice(device: Device | undefined): void {
  requireController().selectDevice(device);
  appliedSelectedDeviceId.value = device?.deviceId;
}

async function setLayerVisibility(
  layerId: string,
  visible: boolean,
): Promise<void> {
  await requireController().setLayerVisibility(layerId, visible);
  appliedVisibleLayerIds.value = visible
    ? [...new Set([...appliedVisibleLayerIds.value, layerId])]
    : appliedVisibleLayerIds.value.filter((candidate) => candidate !== layerId);
}

// Candidate routes shown during the patrol-route consultation, driven
// entirely by props like other map state.
function consultCandidateKey(
  candidates: readonly ConsultRouteCandidate[],
): string {
  return candidates
    .map(
      (candidate) =>
        `${candidate.featureId}:${candidate.color}:${candidate.label}:${candidate.letter}`,
    )
    .join("|");
}

async function applyConsultCandidates(
  candidates: readonly ConsultRouteCandidate[],
): Promise<void> {
  const key = consultCandidateKey(candidates);
  if (key === appliedConsultCandidateKey.value) return;
  appliedConsultCandidateKey.value = key;
  if (candidates.length === 0) {
    await requireController().hideConsultRouteCandidates();
    return;
  }
  await requireController().showConsultRouteCandidates(candidates);
  requireController().emphasizeConsultRouteCandidate(
    appliedConsultEmphasis.value,
  );
}

function applyConsultEmphasis(featureId: string | undefined): void {
  if (featureId === appliedConsultEmphasis.value) return;
  appliedConsultEmphasis.value = featureId;
  requireController().emphasizeConsultRouteCandidate(featureId);
}

function applyConsultCandidateHandlers(
  clickable: boolean,
  clickableFeatureId: string | undefined,
): void {
  requireController().setConsultRouteCandidateHandlers(
    clickable
      ? {
          isClickable: (featureId) =>
            clickableFeatureId === undefined ||
            clickableFeatureId === featureId,
          onClick: (featureId, point, position) =>
            emit("consultCandidateClick", featureId, point, position),
          onHover: (featureId) => emit("consultCandidateHover", featureId),
        }
      : undefined,
  );
}

// Consultation revision anchor picking and the user-owned pin.
function applyConsultRevisionMode(mode: boolean): void {
  requireController().setConsultRevisionHandlers(
    mode
      ? {
          onPick: (position, point, featureId) =>
            emit("consultRevisionPick", position, point, featureId),
        }
      : undefined,
  );
}

function applyConsultRevisionAnchor(
  anchor: { readonly lng: number; readonly lat: number } | undefined,
): void {
  requireController().setConsultRevisionAnchor(anchor);
}

function sameTarget(
  first: MapTarget | undefined,
  second: MapTarget | undefined,
): boolean {
  return (
    first?.featureId === second?.featureId &&
    first?.layerId === second?.layerId &&
    first?.coordinates[0] === second?.coordinates[0] &&
    first?.coordinates[1] === second?.coordinates[1] &&
    first?.zoom === second?.zoom
  );
}

function sameTargets(
  first: readonly MapTarget[],
  second: readonly MapTarget[],
): boolean {
  return (
    first.length === second.length &&
    first.every((target, index) => sameTarget(target, second[index]))
  );
}

defineExpose({
  clearPreviewPath,
  focusOn,
  highlight,
  previewPath,
  selectDevice,
  setLayerVisibility,
});

onMounted(() => {
  if (mapContainer.value === undefined) return;
  controller = createMapController(mapContainer.value, TEST_DEVICES);
  resizeObserver = new ResizeObserver(() => controller?.resize());
  resizeObserver.observe(mapContainer.value);
  selectDevice(props.selectedDevice);
  if (props.focusedTarget !== undefined) focusOn(props.focusedTarget);
  highlight(props.highlightedTargets);
  for (const layerId of props.visibleLayerIds)
    void setLayerVisibility(layerId, true);
  if (props.previewedPath !== undefined) void previewPath(props.previewedPath);
  void applyConsultCandidates(props.consultCandidates);
  applyConsultEmphasis(props.consultEmphasizedFeatureId);
  applyConsultCandidateHandlers(
    props.consultCandidatesClickable,
    props.consultClickableFeatureId,
  );
  applyConsultRevisionMode(props.consultRevisionMode);
  applyConsultRevisionAnchor(props.consultRevisionAnchor);
});

watch(
  () => props.consultCandidates,
  (candidates) => void applyConsultCandidates(candidates),
);

watch(
  () => props.consultEmphasizedFeatureId,
  (featureId) => applyConsultEmphasis(featureId),
);

watch(
  () =>
    [
      props.consultCandidatesClickable,
      props.consultClickableFeatureId,
    ] as const,
  ([clickable, clickableFeatureId]) =>
    applyConsultCandidateHandlers(clickable, clickableFeatureId),
);

watch(
  () => props.consultRevisionMode,
  (mode) => applyConsultRevisionMode(mode),
);

watch(
  () => props.consultRevisionAnchor,
  (anchor) => applyConsultRevisionAnchor(anchor),
);

watch(
  () => props.selectedDevice,
  (device) => {
    if (device?.deviceId !== appliedSelectedDeviceId.value)
      selectDevice(device);
  },
);

watch(
  () => props.previewedPath,
  (target) => {
    if (target === undefined) {
      if (appliedPreviewedPath.value !== undefined) void clearPreviewPath();
      return;
    }
    if (!sameTarget(target, appliedPreviewedPath.value))
      void previewPath(target);
  },
);

watch(
  () => props.visibleLayerIds,
  (layerIds) => {
    const expected = new Set(layerIds);
    const applied = new Set(appliedVisibleLayerIds.value);
    for (const layerId of new Set([...expected, ...applied])) {
      if (expected.has(layerId) !== applied.has(layerId))
        void setLayerVisibility(layerId, expected.has(layerId));
    }
  },
);

watch(
  () => props.focusedTarget,
  (target) => {
    if (target !== undefined && !sameTarget(target, appliedFocusedTarget.value))
      focusOn(target);
  },
);

watch(
  () => props.highlightedTargets,
  (targets) => {
    if (!sameTargets(targets, appliedHighlightedTargets.value))
      highlight(targets);
  },
);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  controller?.destroy();
  controller = undefined;
  appliedConsultCandidateKey.value = "";
});
</script>

<template>
  <div
    ref="mapContainer"
    class="map-view"
    :data-center="appliedViewport?.center.join(',')"
    :data-consult-candidate-feature-ids="
      consultCandidates.map((candidate) => candidate.featureId).join(',')
    "
    :data-consult-emphasized-feature-id="consultEmphasizedFeatureId"
    :data-focused-feature-id="appliedFocusedTarget?.featureId"
    :data-highlighted-feature-ids="
      appliedHighlightedTargets.map((target) => target.featureId).join(',')
    "
    :data-previewed-path-feature-id="appliedPreviewedPath?.featureId"
    :data-visible-layer-ids="appliedVisibleLayerIds.join(',')"
    :data-zoom="appliedViewport?.zoom"
    data-testid="map-view"
  />
</template>
