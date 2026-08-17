import { type ComponentApi, DynamicStringSchema } from "@a2ui/web_core/v0_9";
import { z } from "zod";
import { dynamicStringOrNumberSchema, platformCommonProps } from "./common.js";

/**
 * Business-agnostic metric: a labeled value with an optional trend hint.
 * Example semantics: device count 5, completion rate 98%, average duration
 * 12 min. Domain fields such as `droneCount` are intentionally absent.
 */
export const metricApi = {
  name: "Metric",
  schema: z
    .object({
      ...platformCommonProps,
      label: DynamicStringSchema.describe(
        "The short caption describing what the metric measures.",
      ),
      value: dynamicStringOrNumberSchema.describe(
        "The metric value to display, e.g. 5, '98%', or '12 min'.",
      ),
      trend: z
        .enum(["up", "down", "flat"])
        .optional()
        .describe("An optional hint for the direction of change."),
      emphasis: z
        .enum(["default", "strong"])
        .default("default")
        .optional()
        .describe("A hint for the visual emphasis of the value."),
    })
    .strict(),
} satisfies ComponentApi;
