import { type ComponentApi, DynamicStringSchema } from "@a2ui/web_core/v0_9";
import { z } from "zod";
import { dynamicStringOrNumberSchema, platformCommonProps } from "./common.js";

/**
 * Business-agnostic key-value information row, e.g. task id, owner, or
 * start time.
 */
export const infoRowApi = {
  name: "InfoRow",
  schema: z
    .object({
      ...platformCommonProps,
      label: DynamicStringSchema.describe("The name of the information."),
      value: dynamicStringOrNumberSchema.describe(
        "The value of the information.",
      ),
    })
    .strict(),
} satisfies ComponentApi;
