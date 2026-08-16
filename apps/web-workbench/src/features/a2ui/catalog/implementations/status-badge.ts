import { h } from "vue";
import UiStatusBadge from "../../../../components/ui/UiStatusBadge.vue";
import { statusBadgeApi } from "../definitions/status-badge.js";
import { createVueComponent } from "./vue-component.js";

export const statusBadgeImplementation = createVueComponent(
  statusBadgeApi,
  ({ props }) =>
    h(UiStatusBadge, {
      label: props.label,
      variant: props.variant,
      weight: props.weight,
    }),
);
