import { type ComponentApi, DynamicStringSchema } from "@a2ui/web_core/v0_9";
import { z } from "zod";
import { platformCommonProps } from "./common.js";

export const STATUS_BADGE_VARIANTS = [
  "neutral",
  "info",
  "success",
  "warning",
  "danger",
] as const;

/**
 * Business-agnostic status badge. The AI picks a semantic variant; it never
 * controls concrete color values, which stay a Theme concern of the real UI
 * component.
 */
export const statusBadgeApi = {
  name: "StatusBadge",
  schema: z
    .object({
      ...platformCommonProps,
      label: DynamicStringSchema.describe(
        "The status text to display, e.g. 'normal', 'executing', or 'done'.",
      ),
      variant: z
        .enum(STATUS_BADGE_VARIANTS)
        .default("neutral")
        .optional()
        .describe(
          "The semantic status variant. Maps to platform Theme tokens, never to raw colors.",
        ),
    })
    .strict(),
} satisfies ComponentApi;
