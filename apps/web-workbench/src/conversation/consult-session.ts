import { ref, shallowRef } from "vue";
import type {
  PatrolRouteConsultRequest,
  PatrolRouteConsultResponse,
} from "./patrol-route-consult.js";

/**
 * Shared state for the map-anchored patrol-route consultation.
 *
 * The Human-in-the-loop render lives inside the conversation tree, while the
 * variant B popup and variant C dock live on the map overlay. This module is
 * the hand-off point: the slim chat record registers the active consultation
 * (request + validated submit), and map overlay components consume it.
 * Variant A never touches this store.
 */
export interface ConsultSession {
  readonly request: PatrolRouteConsultRequest;
  readonly submit: (response: PatrolRouteConsultResponse) => Promise<void>;
  readonly toolCallId: string;
}

export interface ConsultOutcome {
  readonly request: PatrolRouteConsultRequest;
  readonly response: PatrolRouteConsultResponse;
  readonly toolCallId: string;
}

/**
 * Revision anchor: a user-owned map annotation captured in revision mode.
 * The anchor stays Workbench-local (Felt note/comment pattern); the revision
 * instruction itself is submitted through the unchanged consult contract.
 */
export interface ConsultRevisionAnchor {
  readonly featureId?: string | undefined;
  readonly lat: number;
  readonly lng: number;
}

export const activeConsultSession = shallowRef<ConsultSession | undefined>();
export const consultOutcome = shallowRef<ConsultOutcome | undefined>();
export const consultEmphasizedOptionId = ref<string | undefined>();
export const consultTentativeOptionId = ref<string | undefined>();
export const consultPopupAnchor = shallowRef<
  | {
      readonly lat: number;
      readonly lng: number;
      readonly optionId: string;
      readonly x: number;
      readonly y: number;
    }
  | undefined
>();
export const consultRevisionMode = ref(false);
export const consultRevisionAnchor = shallowRef<
  ConsultRevisionAnchor | undefined
>();
export const consultRevisionPopup = shallowRef<
  { readonly x: number; readonly y: number } | undefined
>();

export function resetConsultInteractionUi(): void {
  consultEmphasizedOptionId.value = undefined;
  consultTentativeOptionId.value = undefined;
  consultPopupAnchor.value = undefined;
  consultRevisionMode.value = false;
  consultRevisionPopup.value = undefined;
}

/**
 * The revision anchor is a user-owned annotation: it survives the consult
 * completion and is cleared only when a new consultation registers or the
 * chat record unmounts.
 */
export function clearConsultRevisionAnchor(): void {
  consultRevisionAnchor.value = undefined;
}
