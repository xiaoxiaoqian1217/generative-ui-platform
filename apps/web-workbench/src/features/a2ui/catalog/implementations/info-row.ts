import { infoRowApi } from "@generative-ui/a2ui-catalog";
import { h } from "vue";
import UiInfoRow from "../../../../components/ui/UiInfoRow.vue";
import { createVueComponent } from "./vue-component.js";

export const infoRowImplementation = createVueComponent(
  infoRowApi,
  ({ props }) =>
    h(UiInfoRow, {
      label: props.label,
      value: props.value,
      weight: props.weight,
    }),
);
