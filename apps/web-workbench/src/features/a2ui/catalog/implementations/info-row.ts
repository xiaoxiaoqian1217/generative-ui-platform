import { h } from "vue";
import UiInfoRow from "../../../../components/ui/UiInfoRow.vue";
import { infoRowApi } from "../definitions/info-row.js";
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
