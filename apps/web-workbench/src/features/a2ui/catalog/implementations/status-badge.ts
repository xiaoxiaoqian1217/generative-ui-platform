import { statusBadgeApi } from "@generative-ui/a2ui-catalog";
import { h } from "vue";
import UiStatusBadge from "../../../../components/ui/UiStatusBadge.vue";
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
