import { metricApi } from "@generative-ui/a2ui-catalog";
import { h } from "vue";
import UiMetric from "../../../../components/ui/UiMetric.vue";
import { createVueComponent } from "./vue-component.js";

export const metricImplementation = createVueComponent(metricApi, ({ props }) =>
  h(UiMetric, {
    emphasis: props.emphasis,
    label: props.label,
    trend: props.trend,
    value: props.value,
    weight: props.weight,
  }),
);
